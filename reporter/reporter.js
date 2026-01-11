#!/usr/bin/env node

const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const SERVER_URL = process.env.AGENT_KANBAN_SERVER || 'http://localhost:3001';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

class AgentReporter {
  constructor(options = {}) {
    this.agentId = options.agentId || uuidv4();
    this.agentName = options.name || `Agent-${this.agentId.slice(0, 8)}`;
    this.parentAgentId = options.parentAgentId || process.env.PARENT_AGENT_ID;
    this.serverUrl = options.serverUrl || SERVER_URL;
    this.socket = null;
    this.heartbeatTimer = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.serverUrl}/agent`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      this.socket.on('connect', () => {
        console.log(`[Reporter] Connected to server: ${this.serverUrl}`);
        this.connected = true;
        this.register();
        this.startHeartbeat();
        resolve();
      });

      this.socket.on('registered', (data) => {
        console.log(`[Reporter] Registered with ID: ${data.agentId}`);
      });

      this.socket.on('disconnect', () => {
        console.log('[Reporter] Disconnected from server');
        this.connected = false;
        this.stopHeartbeat();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Reporter] Connection error:', error.message);
        if (!this.connected) {
          reject(error);
        }
      });
    });
  }

  register() {
    const message = {
      type: 'register',
      agentId: this.agentId,
      parentAgentId: this.parentAgentId,
      timestamp: Date.now(),
      payload: {
        name: this.agentName,
        terminalInfo: {
          pid: process.pid,
          cwd: process.cwd(),
          sessionId: process.env.TERM_SESSION_ID || process.env.WT_SESSION || undefined
        }
      }
    };
    this.socket.emit('agent:register', message);
  }

  updateStatus(status, taskDescription = '') {
    if (!this.connected) {
      console.warn('[Reporter] Not connected, cannot update status');
      return;
    }

    const message = {
      type: 'status_update',
      agentId: this.agentId,
      timestamp: Date.now(),
      payload: {
        status,
        taskDescription
      }
    };
    this.socket.emit('agent:update', message);
    console.log(`[Reporter] Status updated: ${status} - ${taskDescription}`);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.socket.emit('agent:heartbeat', {
          type: 'heartbeat',
          agentId: this.agentId,
          timestamp: Date.now(),
          payload: {}
        });
      }
    }, HEARTBEAT_INTERVAL);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  deregister() {
    if (!this.connected) return;

    const message = {
      type: 'deregister',
      agentId: this.agentId,
      timestamp: Date.now(),
      payload: {}
    };
    this.socket.emit('agent:deregister', message);
    this.stopHeartbeat();
    this.socket.disconnect();
    console.log('[Reporter] Deregistered and disconnected');
  }

  // Session dashboard methods
  updateSessionInfo(goal, blocker, nextAction) {
    if (!this.connected) {
      console.warn('[Reporter] Not connected, cannot update session info');
      return;
    }

    const message = {
      type: 'status_update',
      agentId: this.agentId,
      timestamp: Date.now(),
      payload: {
        goal,
        blocker,
        nextAction
      }
    };
    this.socket.emit('agent:update', message);
    console.log(`[Reporter] Session info updated: goal=${goal}`);
  }

  // Task management methods
  createTask(taskId, title, prompt, status = 'doing') {
    if (!this.connected) {
      console.warn('[Reporter] Not connected, cannot create task');
      return null;
    }

    const message = {
      type: 'task_create',
      taskId,
      agentId: this.agentId,
      timestamp: Date.now(),
      payload: {
        title,
        prompt,
        status
      }
    };
    this.socket.emit('task:create', message);
    console.log(`[Reporter] Task created: ${taskId} - ${title}`);
    return taskId;
  }

  updateTask(taskId, status, result, outputLink) {
    if (!this.connected) {
      console.warn('[Reporter] Not connected, cannot update task');
      return;
    }

    const message = {
      type: 'task_update',
      taskId,
      agentId: this.agentId,
      timestamp: Date.now(),
      payload: {
        status,
        result,
        outputLink
      }
    };
    this.socket.emit('task:update', message);
    console.log(`[Reporter] Task updated: ${taskId} - ${status}`);
  }

  completeTask(taskId, result, outputLink) {
    this.updateTask(taskId, 'done', result, outputLink);
  }

  failTask(taskId, result) {
    this.updateTask(taskId, 'failed', result);
  }

  // Convenience methods
  working(task) {
    this.updateStatus('working', task);
  }

  waiting(reason = 'Waiting for input') {
    this.updateStatus('waiting', reason);
  }

  idle() {
    this.updateStatus('idle', '');
  }

  completed(summary = 'Task completed') {
    this.updateStatus('completed', summary);
  }

  error(errorMessage) {
    this.updateStatus('error', errorMessage);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Agent Kanban Reporter

Usage:
  node reporter.js <command> [options]

Agent Commands:
  register [name]       Register a new agent
  working <task>        Set status to working
  waiting [reason]      Set status to waiting
  idle                  Set status to idle
  completed [summary]   Set status to completed
  error <message>       Set status to error
  deregister            Deregister agent

Session Dashboard Commands:
  goal <goal>           Set current goal
  blocker <blocker>     Set current blocker
  nextaction <action>   Set next action

Task Commands:
  task:create <id> <title> [prompt]  Create a new task
  task:start <id>                    Set task to doing
  task:done <id> [result]            Mark task as done
  task:fail <id> [reason]            Mark task as failed

Environment Variables:
  AGENT_KANBAN_SERVER   Server URL (default: http://localhost:3001)
  AGENT_ID              Agent ID (auto-generated if not set)
  AGENT_NAME            Agent name
  PARENT_AGENT_ID       Parent agent ID for sub-agents

Examples:
  node reporter.js register "My Agent"
  node reporter.js goal "Implement login feature"
  node reporter.js task:create task-1 "Create login form"
  node reporter.js task:done task-1 "Form created successfully"
    `);
    return;
  }

  const reporter = new AgentReporter({
    agentId: process.env.AGENT_ID,
    name: process.env.AGENT_NAME || args[1],
    parentAgentId: process.env.PARENT_AGENT_ID
  });

  try {
    await reporter.connect();

    switch (command) {
      case 'register':
        // Already registered in connect()
        console.log(`Agent registered: ${reporter.agentId}`);
        // Keep running for interactive mode
        console.log('Press Ctrl+C to deregister and exit');
        process.on('SIGINT', () => {
          reporter.deregister();
          process.exit(0);
        });
        break;

      case 'working':
        reporter.working(args.slice(1).join(' ') || 'Working...');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'waiting':
        reporter.waiting(args.slice(1).join(' ') || 'Waiting for input');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'idle':
        reporter.idle();
        setTimeout(() => process.exit(0), 500);
        break;

      case 'completed':
        reporter.completed(args.slice(1).join(' ') || 'Task completed');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'error':
        reporter.error(args.slice(1).join(' ') || 'Unknown error');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'deregister':
        reporter.deregister();
        setTimeout(() => process.exit(0), 500);
        break;

      // Session dashboard commands
      case 'goal':
        reporter.updateSessionInfo(args.slice(1).join(' ') || '', undefined, undefined);
        setTimeout(() => process.exit(0), 500);
        break;

      case 'blocker':
        reporter.updateSessionInfo(undefined, args.slice(1).join(' ') || '', undefined);
        setTimeout(() => process.exit(0), 500);
        break;

      case 'nextaction':
        reporter.updateSessionInfo(undefined, undefined, args.slice(1).join(' ') || '');
        setTimeout(() => process.exit(0), 500);
        break;

      // Task commands
      case 'task:create':
        if (!args[1]) {
          console.error('Task ID required: task:create <id> <title> [prompt]');
          process.exit(1);
        }
        reporter.createTask(
          args[1],
          args[2] || 'Untitled Task',
          args.slice(3).join(' ') || '',
          'doing'
        );
        setTimeout(() => process.exit(0), 500);
        break;

      case 'task:start':
        if (!args[1]) {
          console.error('Task ID required: task:start <id>');
          process.exit(1);
        }
        reporter.updateTask(args[1], 'doing');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'task:done':
        if (!args[1]) {
          console.error('Task ID required: task:done <id> [result]');
          process.exit(1);
        }
        reporter.completeTask(args[1], args.slice(2).join(' ') || 'Completed');
        setTimeout(() => process.exit(0), 500);
        break;

      case 'task:fail':
        if (!args[1]) {
          console.error('Task ID required: task:fail <id> [reason]');
          process.exit(1);
        }
        reporter.failTask(args[1], args.slice(2).join(' ') || 'Failed');
        setTimeout(() => process.exit(0), 500);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { AgentReporter };

// Run CLI if executed directly
if (require.main === module) {
  main();
}
