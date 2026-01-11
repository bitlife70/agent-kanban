#!/usr/bin/env node
/**
 * Demo script to test Agent Kanban functionality
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const AGENT_ID = 'demo-agent-001';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Agent Kanban Demo ===\n');

  const socket = io(`${SERVER_URL}/agent`, {
    transports: ['websocket'],
    reconnection: false
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });

  console.log('[1] Connected to server');

  // Register agent
  socket.emit('agent:register', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      name: 'Demo Agent',
      status: 'idle',
      terminalInfo: { pid: process.pid, cwd: process.cwd() }
    }
  });
  await sleep(500);
  console.log('[2] Agent registered: idle');

  // Set goal
  socket.emit('agent:update', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: { goal: 'Implement user authentication' }
  });
  await sleep(500);
  console.log('[3] Goal set');

  // Create task 1
  socket.emit('task:create', {
    taskId: 'task-001',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      title: 'Design database schema',
      prompt: 'Create user table with auth fields',
      status: 'doing'
    }
  });
  await sleep(500);
  console.log('[4] Task 1 created: doing');

  // Update status to working
  socket.emit('agent:update', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: { status: 'working', taskDescription: 'Designing database schema...' }
  });
  await sleep(1000);
  console.log('[5] Agent status: working');

  // Complete task 1
  socket.emit('task:update', {
    taskId: 'task-001',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: { status: 'done', result: 'Schema created successfully' }
  });
  await sleep(500);
  console.log('[6] Task 1 completed: done');

  // Create task 2
  socket.emit('task:create', {
    taskId: 'task-002',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      title: 'Implement login API',
      prompt: 'Create POST /api/login endpoint',
      status: 'doing'
    }
  });
  await sleep(500);
  console.log('[7] Task 2 created: doing');

  // Set blocker
  socket.emit('agent:update', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      status: 'waiting',
      taskDescription: 'Need JWT secret configuration',
      blocker: 'Missing JWT_SECRET environment variable'
    }
  });
  await sleep(1000);
  console.log('[8] Agent status: waiting (blocker set)');

  // Clear blocker and continue
  socket.emit('agent:update', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      status: 'working',
      taskDescription: 'Implementing login API...',
      blocker: ''
    }
  });
  await sleep(1000);
  console.log('[9] Blocker cleared, back to working');

  // Complete task 2
  socket.emit('task:update', {
    taskId: 'task-002',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: { status: 'done', result: 'Login API implemented' }
  });
  await sleep(500);
  console.log('[10] Task 2 completed: done');

  // Create task 3 (will fail)
  socket.emit('task:create', {
    taskId: 'task-003',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      title: 'Write unit tests',
      prompt: 'Test login functionality',
      status: 'doing'
    }
  });
  await sleep(500);
  console.log('[11] Task 3 created: doing');

  // Fail task 3
  socket.emit('task:update', {
    taskId: 'task-003',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: { status: 'failed', result: 'Test framework not installed' }
  });
  await sleep(500);
  console.log('[12] Task 3 failed');

  // Mark agent as completed
  socket.emit('agent:update', {
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      status: 'completed',
      taskDescription: 'Session completed',
      nextAction: 'Install test framework and retry'
    }
  });
  await sleep(500);
  console.log('[13] Agent status: completed');

  console.log('\n=== Demo Complete ===');
  console.log('Check the dashboard at http://localhost:5173\n');

  // Keep connection for a bit before clean exit
  await sleep(2000);
  socket.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
