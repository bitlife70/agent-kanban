#!/usr/bin/env node

/**
 * Claude Code Hook Script for Agent Kanban
 *
 * This script is called by Claude Code hooks to report agent status
 * to the Agent Kanban dashboard.
 *
 * Usage in .claude/settings.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "command": "node /path/to/claude-hook.js pretool" }],
 *     "PostToolUse": [{ "command": "node /path/to/claude-hook.js posttool" }],
 *     "Notification": [{ "command": "node /path/to/claude-hook.js notify" }],
 *     "Stop": [{ "command": "node /path/to/claude-hook.js stop" }]
 *   }
 * }
 *
 * Environment variables from Claude Code:
 * - CLAUDE_SESSION_ID: Unique session identifier
 * - CLAUDE_TOOL_NAME: Name of the tool being used (for tool hooks)
 * - CLAUDE_NOTIFICATION_TYPE: Type of notification
 * - CLAUDE_WORKING_DIRECTORY: Current working directory
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SERVER_URL = process.env.AGENT_KANBAN_SERVER || 'http://localhost:3001';
// Use session-specific state file to support multiple concurrent sessions
const SESSION_ID = process.env.CLAUDE_SESSION_ID || `session-${process.ppid || process.pid}`;
const STATE_FILE = path.join(os.tmpdir(), `agent-kanban-state-${SESSION_ID}.json`);
const LOG_FILE = path.join(os.tmpdir(), 'agent-kanban-hook.log');

// Debug logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Get or create agent ID
function getAgentState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function saveAgentState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearAgentState() {
  try {
    fs.unlinkSync(STATE_FILE);
  } catch (e) {
    // Ignore
  }
}

// Create agent name from session or directory
function getAgentName() {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  const cwd = process.env.CLAUDE_WORKING_DIRECTORY || process.cwd();
  const dirName = path.basename(cwd);

  if (sessionId) {
    return `Claude-${dirName}-${sessionId.slice(0, 6)}`;
  }
  return `Claude-${dirName}`;
}

// Quick fire-and-forget message sender
async function sendMessage(type, payload, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = io(`${SERVER_URL}/agent`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: timeout
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(false);
    }, timeout);

    socket.on('connect', () => {
      log(`Connected to server, sending ${type}`);
      socket.emit(type, payload);

      // Wait a bit for message to be sent
      setTimeout(() => {
        clearTimeout(timer);
        socket.disconnect();
        log(`Message sent successfully: ${type}`);
        resolve(true);
      }, 100);
    });

    socket.on('connect_error', (err) => {
      log(`Connection error: ${err.message}`);
      clearTimeout(timer);
      socket.disconnect();
      resolve(false);
    });
  });
}

// Register new agent
async function registerAgent() {
  const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;
  const agentId = `claude-${sessionId}`;
  const name = getAgentName();

  const state = {
    agentId,
    name,
    sessionId,
    registeredAt: Date.now()
  };

  const message = {
    type: 'register',
    agentId,
    timestamp: Date.now(),
    payload: {
      name,
      status: 'idle',
      terminalInfo: {
        pid: process.ppid || process.pid,
        cwd: process.env.CLAUDE_WORKING_DIRECTORY || process.cwd(),
        sessionId
      }
    }
  };

  const success = await sendMessage('agent:register', message);
  if (success) {
    saveAgentState(state);
    console.log(`[Agent Kanban] Registered: ${name}`);
  }
  return success;
}

// Update agent status
async function updateStatus(status, taskDescription = '') {
  let state = getAgentState();

  // Auto-register if not registered
  if (!state) {
    await registerAgent();
    state = getAgentState();
    if (!state) return false;
  }

  // Save last task description for reference
  if (status === 'working' && taskDescription) {
    state.lastTask = taskDescription;
    saveAgentState(state);
  }

  const message = {
    type: 'status_update',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      status,
      taskDescription
    }
  };

  return sendMessage('agent:update', message);
}

// Deregister agent
async function deregisterAgent() {
  const state = getAgentState();
  if (!state) return false;

  const message = {
    type: 'deregister',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {}
  };

  const success = await sendMessage('agent:deregister', message);
  if (success) {
    clearAgentState();
    console.log(`[Agent Kanban] Deregistered: ${state.name}`);
  }
  return success;
}

// Read tool input from stdin
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // Timeout for stdin read
    setTimeout(() => resolve({}), 100);
  });
}

// Extract meaningful task description from tool input
function getTaskDescription(toolName, toolInput) {
  if (!toolInput) return `Using ${toolName}`;

  switch (toolName) {
    case 'Bash':
      const cmd = toolInput.command || '';
      if (cmd.length > 50) {
        return `Running: ${cmd.substring(0, 47)}...`;
      }
      return `Running: ${cmd}`;

    case 'Read':
      const readPath = toolInput.file_path || '';
      const readFile = path.basename(readPath);
      return `Reading: ${readFile}`;

    case 'Write':
      const writePath = toolInput.file_path || '';
      const writeFile = path.basename(writePath);
      return `Writing: ${writeFile}`;

    case 'Edit':
      const editPath = toolInput.file_path || '';
      const editFile = path.basename(editPath);
      return `Editing: ${editFile}`;

    case 'Grep':
      const pattern = toolInput.pattern || '';
      return `Searching: "${pattern.substring(0, 30)}"`;

    case 'Glob':
      const globPattern = toolInput.pattern || '';
      return `Finding: ${globPattern}`;

    case 'Task':
      const taskDesc = toolInput.description || toolInput.prompt || '';
      if (taskDesc.length > 40) {
        return `Sub-agent: ${taskDesc.substring(0, 37)}...`;
      }
      return `Sub-agent: ${taskDesc}`;

    case 'WebFetch':
      return 'Fetching web content...';

    case 'WebSearch':
      const query = toolInput.query || '';
      return `Searching: "${query.substring(0, 30)}"`;

    default:
      return `Using ${toolName}`;
  }
}

// Main hook handler
async function main() {
  const hookType = process.argv[2];
  const toolName = process.env.CLAUDE_TOOL_NAME || '';
  const notificationType = process.env.CLAUDE_NOTIFICATION_TYPE || '';

  log(`Hook called: ${hookType}, tool: ${toolName}, server: ${SERVER_URL}`);

  // Read tool input from stdin for pretool/posttool
  let toolInput = {};
  if (hookType === 'pretool' || hookType === 'posttool') {
    toolInput = await readStdin();
    log(`Tool input: ${JSON.stringify(toolInput).substring(0, 200)}`);
  }

  switch (hookType) {
    case 'start':
    case 'register':
      await registerAgent();
      break;

    case 'pretool':
      // Tool is about to be used - extract meaningful description
      const taskDesc = getTaskDescription(toolName, toolInput);
      await updateStatus('working', taskDesc);
      break;

    case 'posttool':
      // Tool finished - keep last task description
      const state = getAgentState();
      const lastTask = state?.lastTask || '';
      await updateStatus('idle', lastTask);
      break;

    case 'notify':
      // Notification received
      if (notificationType === 'user_input_request') {
        await updateStatus('waiting', 'Waiting for user input');
      } else if (notificationType === 'error') {
        await updateStatus('error', 'Error occurred');
      }
      break;

    case 'stop':
      // Session ending - just mark as completed, don't deregister
      // Agent will remain visible on the Kanban board
      await updateStatus('completed', 'Session ended');
      break;

    case 'deregister':
      // Only deregister when explicitly requested
      await updateStatus('completed', 'Session ended');
      setTimeout(() => deregisterAgent(), 1000);
      break;

    case 'working':
      await updateStatus('working', process.argv[3] || 'Working...');
      break;

    case 'waiting':
      await updateStatus('waiting', process.argv[3] || 'Waiting...');
      break;

    case 'idle':
      await updateStatus('idle', '');
      break;

    case 'completed':
      await updateStatus('completed', process.argv[3] || 'Completed');
      break;

    case 'error':
      await updateStatus('error', process.argv[3] || 'Error');
      break;

    default:
      console.log(`
Claude Code Hook for Agent Kanban

Usage:
  node claude-hook.js <command> [message]

Commands (for hooks):
  start         Register agent at session start
  pretool       Called before tool use (uses CLAUDE_TOOL_NAME)
  posttool      Called after tool use
  notify        Handle notifications (uses CLAUDE_NOTIFICATION_TYPE)
  stop          Deregister agent at session end

Commands (manual):
  register      Register agent
  deregister    Deregister agent
  working <msg> Set status to working
  waiting <msg> Set status to waiting
  idle          Set status to idle
  completed     Set status to completed
  error <msg>   Set status to error

Environment Variables:
  AGENT_KANBAN_SERVER     Server URL (default: http://localhost:3001)
  CLAUDE_SESSION_ID       Session ID from Claude Code
  CLAUDE_TOOL_NAME        Tool name from Claude Code hooks
  CLAUDE_NOTIFICATION_TYPE Notification type from Claude Code
  CLAUDE_WORKING_DIRECTORY Working directory
      `);
  }

  // Give time for async operations
  await new Promise(r => setTimeout(r, 200));
}

main().catch(console.error);
