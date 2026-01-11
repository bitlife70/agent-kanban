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
const LOG_FILE = path.join(os.tmpdir(), 'agent-kanban-hook.log');

// Debug logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Get state file path for a session
function getStateFilePath(sessionId) {
  return path.join(os.tmpdir(), `agent-kanban-state-${sessionId}.json`);
}

// Get or create agent ID
function getAgentState(sessionId) {
  const stateFile = getStateFilePath(sessionId);
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function saveAgentState(sessionId, state) {
  const stateFile = getStateFilePath(sessionId);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function clearAgentState(sessionId) {
  const stateFile = getStateFilePath(sessionId);
  try {
    fs.unlinkSync(stateFile);
  } catch (e) {
    // Ignore
  }
}

// Create agent name from prompt or directory
function getAgentName(prompt) {
  // If we have a prompt, use the first part as the name
  if (prompt && prompt.trim()) {
    const cleanPrompt = prompt.trim().replace(/\s+/g, ' ');
    if (cleanPrompt.length > 40) {
      return cleanPrompt.substring(0, 37) + '...';
    }
    return cleanPrompt;
  }

  // Fallback to directory + session ID
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
async function registerAgent(sessionId, prompt) {
  const agentId = `claude-session-${sessionId}`;
  const name = getAgentName(prompt);

  const state = {
    agentId,
    name,
    sessionId,
    prompt: prompt || '',
    registeredAt: Date.now()
  };

  const message = {
    type: 'register',
    agentId,
    timestamp: Date.now(),
    payload: {
      name,
      prompt: prompt || '',
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
    saveAgentState(sessionId, state);
    log(`Registered agent: ${agentId} - ${name}`);
  }
  return success;
}

// Update agent name (when we receive the prompt)
async function updateAgentName(sessionId, prompt) {
  let state = getAgentState(sessionId);
  if (!state) return false;

  const name = getAgentName(prompt);
  state.name = name;
  state.prompt = prompt;
  saveAgentState(sessionId, state);

  const message = {
    type: 'status_update',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      name,
      prompt: prompt || '',
      status: 'working',
      taskDescription: 'Processing prompt...'
    }
  };

  return sendMessage('agent:update', message);
}

// Update agent status
async function updateStatus(sessionId, status, taskDescription = '') {
  let state = getAgentState(sessionId);

  // Auto-register if not registered
  if (!state) {
    await registerAgent(sessionId);
    state = getAgentState(sessionId);
    if (!state) return false;
  }

  // Save last task description for reference
  if (status === 'working' && taskDescription) {
    state.lastTask = taskDescription;
    saveAgentState(sessionId, state);
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
async function deregisterAgent(sessionId) {
  const state = getAgentState(sessionId);
  if (!state) return false;

  const message = {
    type: 'deregister',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {}
  };

  const success = await sendMessage('agent:deregister', message);
  if (success) {
    clearAgentState(sessionId);
    log(`Deregistered: ${state.name}`);
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
    // Timeout for stdin read (increased for all hook types)
    setTimeout(() => resolve({}), 500);
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
  const notificationType = process.env.CLAUDE_NOTIFICATION_TYPE || '';

  // Read input from stdin for ALL hook types
  let stdinData = {};
  stdinData = await readStdin();

  // Get tool name from stdin data or environment variable
  const toolName = stdinData.tool_name || process.env.CLAUDE_TOOL_NAME || '';

  log(`Hook called: ${hookType}, tool: ${toolName}, server: ${SERVER_URL}`);
  log(`Stdin data keys: ${Object.keys(stdinData).join(', ')}`);
  log(`Stdin data: ${JSON.stringify(stdinData).substring(0, 500)}`);

  // Extract session ID from stdin or environment
  const sessionId = stdinData.session_id || process.env.CLAUDE_SESSION_ID || `fallback-${process.pid}`;
  log(`Session ID: ${sessionId}`);

  switch (hookType) {
    case 'start':
    case 'register':
      await registerAgent(sessionId);
      break;

    case 'userprompt':
      // User submitted a prompt - register with prompt as name
      const prompt = stdinData.prompt || stdinData.message || '';
      const existingState = getAgentState(sessionId);
      if (existingState) {
        // Update existing agent name
        await updateAgentName(sessionId, prompt);
      } else {
        // Register new agent with prompt
        await registerAgent(sessionId, prompt);
      }
      break;

    case 'pretool':
      // Tool is about to be used - extract meaningful description
      // Tool input might be in stdinData.tool_input or directly in stdinData
      const toolInput = stdinData.tool_input || stdinData;
      const taskDesc = getTaskDescription(toolName, toolInput);
      log(`PreTool: toolName=${toolName}, taskDesc=${taskDesc}`);
      await updateStatus(sessionId, 'working', taskDesc);
      break;

    case 'posttool':
      // Tool finished - keep last task description
      const state = getAgentState(sessionId);
      const lastTask = state?.lastTask || '';
      await updateStatus(sessionId, 'idle', lastTask);
      break;

    case 'notify':
      // Notification received
      // Get notification type from stdin or environment
      const notifyType = stdinData.type || notificationType;
      const notifyMessage = stdinData.message || stdinData.title || '';
      log(`Notify: type=${notifyType}, message=${notifyMessage}`);

      if (notifyType === 'user_input_request' || notifyMessage.includes('waiting') || notifyMessage.includes('input')) {
        await updateStatus(sessionId, 'waiting', 'Waiting for user input');
      } else if (notifyType === 'error') {
        await updateStatus(sessionId, 'error', 'Error occurred');
      } else {
        // Default to waiting for any notification that requires user attention
        await updateStatus(sessionId, 'waiting', notifyMessage || 'Notification received');
      }
      break;

    case 'stop':
      // Session ending - just mark as completed, don't deregister
      // Agent will remain visible on the Kanban board
      await updateStatus(sessionId, 'completed', 'Session ended');
      break;

    case 'deregister':
      // Only deregister when explicitly requested
      await updateStatus(sessionId, 'completed', 'Session ended');
      setTimeout(() => deregisterAgent(sessionId), 1000);
      break;

    case 'working':
      await updateStatus(sessionId, 'working', process.argv[3] || 'Working...');
      break;

    case 'waiting':
      await updateStatus(sessionId, 'waiting', process.argv[3] || 'Waiting...');
      break;

    case 'idle':
      await updateStatus(sessionId, 'idle', '');
      break;

    case 'completed':
      await updateStatus(sessionId, 'completed', process.argv[3] || 'Completed');
      break;

    case 'error':
      await updateStatus(sessionId, 'error', process.argv[3] || 'Error');
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
