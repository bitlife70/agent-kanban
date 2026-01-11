#!/usr/bin/env node

/**
 * Claude Code Hook Script for Agent Kanban
 *
 * This script is called by Claude Code hooks to report agent status
 * to the Agent Kanban dashboard.
 *
 * === STATUS CHANGE CRITERIA ===
 *
 * [idle]      - Session registered but no prompt yet
 *             - After Stop hook when session ends (brief moment before completed)
 *
 * [working]   - User submitted a prompt (userprompt hook)
 *             - Tool is being used (pretool hook)
 *             - Stays working between tool calls (not idle between tools)
 *
 * [waiting]   - Notification received requiring user input
 *             - User input request notification
 *
 * [completed] - Stop hook called (session ended normally)
 *             - All tasks for this prompt are done
 *
 * [error]     - Error notification received
 *
 * === SESSION LIFECYCLE ===
 *
 * 1. New prompt in same terminal:
 *    - If session exists and is completed → Reset tasks, set working
 *    - If session exists and is working → Update name, stay working
 *    - If no session → Register new, set working
 *
 * 2. Tool usage:
 *    - PreToolUse → working (with task description)
 *    - PostToolUse → working (keep working, not idle)
 *
 * 3. Session end:
 *    - Stop hook → completed (mark incomplete tasks as failed)
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

// Generate unique task ID
function generateTaskId(sessionId, index) {
  return `task-${sessionId.slice(0, 8)}-${index}-${Date.now().toString(36)}`;
}

// Create agent name from prompt or directory
function getAgentName(prompt) {
  if (prompt && prompt.trim()) {
    const cleanPrompt = prompt.trim().replace(/\s+/g, ' ');
    if (cleanPrompt.length > 40) {
      return cleanPrompt.substring(0, 37) + '...';
    }
    return cleanPrompt;
  }

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
async function registerAgent(sessionId, prompt, initialStatus = 'idle') {
  const agentId = `claude-session-${sessionId}`;
  const name = getAgentName(prompt);

  const state = {
    agentId,
    name,
    sessionId,
    prompt: prompt || '',
    currentStatus: initialStatus,
    registeredAt: Date.now(),
    promptCount: 1,
    tasks: {},
    todoTaskMap: {}
  };

  const message = {
    type: 'register',
    agentId,
    timestamp: Date.now(),
    payload: {
      name,
      prompt: prompt || '',
      status: initialStatus,
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
    log(`Registered agent: ${agentId} - ${name} (status: ${initialStatus})`);
  }
  return success;
}

// Start new prompt - reset session for new work
async function startNewPrompt(sessionId, prompt) {
  let state = getAgentState(sessionId);
  const name = getAgentName(prompt);

  if (!state) {
    // No existing session - register new
    return registerAgent(sessionId, prompt, 'working');
  }

  // Session exists - check if we need to reset
  const wasCompleted = state.currentStatus === 'completed';

  log(`Starting new prompt. Previous status: ${state.currentStatus}, wasCompleted: ${wasCompleted}`);

  // If previous session was completed, clean up old tasks
  if (wasCompleted) {
    log(`Resetting tasks for new prompt (previous session completed)`);
    // Mark all remaining tasks from previous prompt as done/cleared
    // Reset task tracking for new prompt
    state.tasks = {};
    state.todoTaskMap = {};
    state.promptCount = (state.promptCount || 0) + 1;
  }

  // Update state for new prompt
  state.name = name;
  state.prompt = prompt;
  state.currentStatus = 'working';
  state.lastPromptAt = Date.now();
  saveAgentState(sessionId, state);

  // Send update to server
  const message = {
    type: 'status_update',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      name,
      prompt: prompt || '',
      status: 'working',
      taskDescription: 'Processing new prompt...'
    }
  };

  const success = await sendMessage('agent:update', message);
  log(`Started new prompt: ${name}, status: working, success: ${success}`);
  return success;
}

// Update agent status
async function updateStatus(sessionId, status, taskDescription = '') {
  let state = getAgentState(sessionId);

  // Auto-register if not registered
  if (!state) {
    await registerAgent(sessionId, '', status);
    state = getAgentState(sessionId);
    if (!state) return false;
  }

  // Track current status in state
  state.currentStatus = status;

  // Save last task description for reference
  if (status === 'working' && taskDescription) {
    state.lastTask = taskDescription;
  }
  saveAgentState(sessionId, state);

  const message = {
    type: 'status_update',
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      status,
      taskDescription
    }
  };

  log(`Updating status to: ${status}, task: ${taskDescription}`);
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

// Create a new task
async function createTask(sessionId, taskId, title, prompt = '', status = 'doing') {
  const state = getAgentState(sessionId);
  if (!state) return false;

  const message = {
    type: 'task_create',
    taskId,
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      title,
      prompt,
      status
    }
  };

  const success = await sendMessage('task:create', message);
  if (success) {
    if (!state.tasks) state.tasks = {};
    state.tasks[taskId] = { title, status, createdAt: Date.now() };
    saveAgentState(sessionId, state);
    log(`Task created: ${taskId} - ${title}`);
  }
  return success;
}

// Update task status
async function updateTask(sessionId, taskId, status, result = '') {
  const state = getAgentState(sessionId);
  if (!state) return false;

  const message = {
    type: 'task_update',
    taskId,
    agentId: state.agentId,
    timestamp: Date.now(),
    payload: {
      status,
      result
    }
  };

  const success = await sendMessage('task:update', message);
  if (success && state.tasks && state.tasks[taskId]) {
    state.tasks[taskId].status = status;
    if (result) state.tasks[taskId].result = result;
    saveAgentState(sessionId, state);
    log(`Task updated: ${taskId} - ${status}`);
  }
  return success;
}

// Process TodoWrite tool to create/update tasks
async function processTodoWrite(sessionId, todoData) {
  const state = getAgentState(sessionId);
  if (!state) return;

  const todos = todoData.todos || [];
  if (!state.todoTaskMap) state.todoTaskMap = {};
  if (!state.tasks) state.tasks = {};

  // Track which todos are currently in the list
  const currentTodoContents = new Set(todos.map(t => t.content || ''));

  // Check for removed todos and mark their tasks as failed
  for (const [content, taskId] of Object.entries(state.todoTaskMap)) {
    if (!currentTodoContents.has(content)) {
      const existingTask = state.tasks[taskId];
      if (existingTask && existingTask.status !== 'done' && existingTask.status !== 'failed') {
        await updateTask(sessionId, taskId, 'failed', 'Task removed from todo list');
        log(`Task removed from todo list: ${taskId}`);
      }
    }
  }

  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i];
    const content = todo.content || '';
    const status = todo.status || 'pending';

    // Map todo status to task status
    let taskStatus = 'todo';
    if (status === 'in_progress') taskStatus = 'doing';
    else if (status === 'completed') taskStatus = 'done';
    else if (status === 'pending') taskStatus = 'todo';

    let taskId = state.todoTaskMap[content];

    if (!taskId) {
      // Create new task
      taskId = generateTaskId(sessionId, i);
      state.todoTaskMap[content] = taskId;
      saveAgentState(sessionId, state);

      await createTask(sessionId, taskId, content, todo.activeForm || '', taskStatus);
    } else {
      // Update existing task
      const existingTask = state.tasks[taskId];
      if (existingTask && existingTask.status !== taskStatus) {
        await updateTask(sessionId, taskId, taskStatus);
      }
    }
  }

  saveAgentState(sessionId, state);
}

// Complete all incomplete tasks when session ends
async function completeIncompleteTasks(sessionId) {
  const state = getAgentState(sessionId);
  if (!state || !state.tasks) return;

  for (const [taskId, task] of Object.entries(state.tasks)) {
    if (task.status === 'todo' || task.status === 'doing') {
      await updateTask(sessionId, taskId, 'failed', 'Session ended - task incomplete');
      log(`Marked incomplete task as failed: ${taskId}`);
    }
  }
}

// Process Task tool to create sub-agent task
async function processTaskTool(sessionId, taskToolInput) {
  const state = getAgentState(sessionId);
  if (!state) return;

  const description = taskToolInput.description || taskToolInput.prompt || 'Sub-agent task';
  const taskId = generateTaskId(sessionId, Date.now());

  await createTask(sessionId, taskId, description, taskToolInput.prompt || '', 'doing');

  if (!state.subAgentTasks) state.subAgentTasks = [];
  state.subAgentTasks.push({ taskId, description, startedAt: Date.now() });
  saveAgentState(sessionId, state);
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
      await registerAgent(sessionId, '', 'idle');
      break;

    case 'userprompt':
      // User submitted a new prompt - this is the START of work
      // IMPORTANT: This should change status to 'working' regardless of previous state
      const prompt = stdinData.prompt || stdinData.message || '';
      log(`UserPrompt received: "${prompt.substring(0, 50)}..."`);
      await startNewPrompt(sessionId, prompt);
      break;

    case 'pretool':
      // Tool is about to be used - definitely working
      const toolInput = stdinData.tool_input || stdinData;
      const taskDesc = getTaskDescription(toolName, toolInput);
      log(`PreTool: toolName=${toolName}, taskDesc=${taskDesc}`);
      await updateStatus(sessionId, 'working', taskDesc);

      // Handle special tools that create tasks
      if (toolName === 'TodoWrite') {
        log(`Processing TodoWrite: ${JSON.stringify(toolInput).substring(0, 200)}`);
        await processTodoWrite(sessionId, toolInput);
      } else if (toolName === 'Task') {
        log(`Processing Task tool: ${JSON.stringify(toolInput).substring(0, 200)}`);
        await processTaskTool(sessionId, toolInput);
      }
      break;

    case 'posttool':
      // Tool finished - but Claude is still processing, so STAY WORKING
      // Only go to idle/completed when Stop hook is called
      const state = getAgentState(sessionId);
      const lastTask = state?.lastTask || 'Processing...';
      // Keep status as working - Claude is still thinking/processing
      await updateStatus(sessionId, 'working', lastTask);
      log(`PostTool: Staying in working state`);
      break;

    case 'notify':
      // Notification received
      const notifyType = stdinData.type || notificationType;
      const notifyMessage = stdinData.message || stdinData.title || '';
      log(`Notify: type=${notifyType}, message=${notifyMessage}`);

      if (notifyType === 'user_input_request' ||
          notifyMessage.includes('waiting') ||
          notifyMessage.includes('input') ||
          notifyMessage.includes('permission')) {
        await updateStatus(sessionId, 'waiting', 'Waiting for user input');
      } else if (notifyType === 'error') {
        await updateStatus(sessionId, 'error', notifyMessage || 'Error occurred');
      } else {
        // For other notifications, stay working but update description
        await updateStatus(sessionId, 'working', notifyMessage || 'Processing notification...');
      }
      break;

    case 'stop':
      // Session ending - THIS is when we mark as completed
      log(`Stop hook called - marking session as completed`);
      await completeIncompleteTasks(sessionId);
      await updateStatus(sessionId, 'completed', 'Session ended');
      break;

    case 'deregister':
      await completeIncompleteTasks(sessionId);
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

=== STATUS CHANGE CRITERIA ===

  [idle]      Initial state, waiting for prompt
  [working]   Processing prompt or using tools (stays working between tools!)
  [waiting]   User input required (permission, question)
  [completed] Session ended (Stop hook called)
  [error]     Error occurred

=== KEY BEHAVIORS ===

  1. New prompt → Status becomes 'working' (even if was 'completed')
  2. Tool usage → Status stays 'working' (before AND after tool)
  3. Session end → Status becomes 'completed'
  4. New prompt on completed session → Resets tasks, becomes 'working'

Usage:
  node claude-hook.js <command> [message]

Commands (for hooks):
  userprompt    Called when user submits a prompt → working
  pretool       Called before tool use → working
  posttool      Called after tool use → working (stays working!)
  notify        Handle notifications → waiting/error/working
  stop          Session ended → completed

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
