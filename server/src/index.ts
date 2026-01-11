import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { agentRegistry } from './agentRegistry';
import { taskRegistry } from './taskRegistry';
import { AgentMessage, TaskMessage, Agent, Task, TaskStatus } from './types';
import { AppError, ErrorCode, logError, isAppError, notFoundError, validationError } from './errors';

// Validation helpers
function isValidAgentMessage(msg: unknown): msg is AgentMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return typeof m.agentId === 'string' && m.agentId.length > 0;
}

function isValidTaskMessage(msg: unknown): msg is TaskMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.taskId === 'string' && m.taskId.length > 0 &&
    typeof m.agentId === 'string' && m.agentId.length > 0
  );
}

function isValidTaskStatus(status: unknown): status is TaskStatus {
  return status === 'todo' || status === 'doing' || status === 'done' || status === 'failed';
}

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

// Dashboard clients namespace
const dashboardNsp = io.of('/dashboard');

// Agent reporters namespace
const agentNsp = io.of('/agent');

// Setup registry callbacks
agentRegistry.setCallbacks(
  (agent: Agent) => {
    dashboardNsp.emit('agent:changed', agent);
    console.log(`[Registry] Agent changed: ${agent.id} (${agent.status})`);
  },
  (agentId: string) => {
    dashboardNsp.emit('agent:removed', agentId);
    // 에이전트 삭제 시 연관 Task도 삭제
    taskRegistry.deleteTasksByAgent(agentId);
    console.log(`[Registry] Agent removed: ${agentId}`);
  }
);

// Setup task registry callbacks
taskRegistry.setCallbacks(
  // Task 변경 시 Dashboard에 브로드캐스트
  (task: Task) => {
    dashboardNsp.emit('task:changed', task);
    console.log(`[TaskRegistry] Task changed: ${task.id} (${task.status})`);
  },
  // Task 삭제 시 Dashboard에 알림
  (taskId: string) => {
    dashboardNsp.emit('task:removed', taskId);
    console.log(`[TaskRegistry] Task removed: ${taskId}`);
  },
  // Task 이벤트 발생 시 Agent에 반영
  (agentId: string, event) => {
    // Agent의 recentEvents에 추가
    agentRegistry.addRecentEvent(agentId, {
      type: event.type,
      description: event.description,
      taskId: event.taskId
    });

    // 진행률 자동 계산 및 업데이트
    const progress = taskRegistry.calculateAgentProgress(agentId);
    agentRegistry.updateProgress(agentId, progress);

    console.log(`[TaskRegistry] Agent ${agentId} event: ${event.type}, progress: ${progress}%`);
  }
);

// Dashboard client handlers
dashboardNsp.on('connection', (socket) => {
  console.log(`[Dashboard] Client connected: ${socket.id}`);

  // Send current agents list
  socket.emit('agents:sync', agentRegistry.getAllAgents());

  // Send current tasks list
  socket.emit('tasks:sync', taskRegistry.getAllTasks());

  socket.on('disconnect', () => {
    console.log(`[Dashboard] Client disconnected: ${socket.id}`);
  });
});

// Agent reporter handlers
agentNsp.on('connection', (socket) => {
  console.log(`[Agent] Reporter connected: ${socket.id}`);
  let registeredAgentId: string | null = null;

  socket.on('agent:register', (message: unknown) => {
    try {
      if (!isValidAgentMessage(message)) {
        console.warn('[Agent] Invalid register message:', message);
        socket.emit('error', { code: 'INVALID_MESSAGE', message: 'Invalid agent register message' });
        return;
      }
      console.log(`[Agent] Register request:`, message.agentId);
      const agent = agentRegistry.register(
        message.agentId,
        message.payload?.name || '',
        message.parentAgentId,
        message.payload?.terminalInfo,
        message.payload?.prompt
      );
      registeredAgentId = agent.id;
      socket.emit('registered', { agentId: agent.id });
    } catch (error) {
      logError('agent:register', error);
      socket.emit('error', { code: 'REGISTER_FAILED', message: 'Failed to register agent' });
    }
  });

  socket.on('agent:update', (message: unknown) => {
    try {
      if (!isValidAgentMessage(message)) {
        console.warn('[Agent] Invalid update message:', message);
        return;
      }
      console.log(`[Agent] Status update:`, message.agentId, message.payload?.status);

      // Update agent name and prompt if provided
      if (message.payload?.name) {
        agentRegistry.updateName(message.agentId, message.payload.name, message.payload.prompt);
      } else if (message.payload?.prompt) {
        agentRegistry.updatePrompt(message.agentId, message.payload.prompt);
      }

      if (message.payload?.status) {
        agentRegistry.updateStatus(
          message.agentId,
          message.payload.status,
          message.payload.taskDescription
        );
      }

      // Update session dashboard fields if provided
      if (message.payload?.goal !== undefined ||
          message.payload?.blocker !== undefined ||
          message.payload?.nextAction !== undefined) {
        agentRegistry.updateSessionInfo(message.agentId, {
          goal: message.payload.goal,
          blocker: message.payload.blocker,
          nextAction: message.payload.nextAction
        });
      }
    } catch (error) {
      logError('agent:update', error);
    }
  });

  socket.on('agent:heartbeat', (message: unknown) => {
    try {
      if (!isValidAgentMessage(message)) return;
      agentRegistry.heartbeat(message.agentId);
    } catch (error) {
      logError('agent:heartbeat', error);
    }
  });

  socket.on('agent:deregister', (message: unknown) => {
    try {
      if (!isValidAgentMessage(message)) {
        console.warn('[Agent] Invalid deregister message:', message);
        return;
      }
      console.log(`[Agent] Deregister request:`, message.agentId);
      agentRegistry.deregister(message.agentId);
      registeredAgentId = null;
    } catch (error) {
      logError('agent:deregister', error);
    }
  });

  // Task event handlers
  socket.on('task:create', (message: unknown) => {
    try {
      if (!isValidTaskMessage(message)) {
        console.warn('[Task] Invalid create message:', message);
        socket.emit('error', { code: 'INVALID_MESSAGE', message: 'Invalid task create message' });
        return;
      }
      console.log(`[Task] Create request:`, message.taskId, message.agentId);

      // Verify agent exists
      const agent = agentRegistry.getAgent(message.agentId);
      if (!agent) {
        console.warn(`[Task] Agent not found: ${message.agentId}`);
        socket.emit('error', { code: 'AGENT_NOT_FOUND', message: 'Agent not found' });
        return;
      }

      const initialStatus = isValidTaskStatus(message.payload?.status) ? message.payload.status : 'doing';
      const task = taskRegistry.create(
        message.taskId,
        message.agentId,
        message.payload?.title || 'Untitled Task',
        message.payload?.prompt || '',
        initialStatus
      );

      // Agent의 taskIds에 추가
      agentRegistry.addTask(message.agentId, task.id);

      socket.emit('task:created', { taskId: task.id });
    } catch (error) {
      logError('task:create', error);
      socket.emit('error', { code: 'CREATE_FAILED', message: 'Failed to create task' });
    }
  });

  socket.on('task:update', (message: unknown) => {
    try {
      if (!isValidTaskMessage(message)) {
        console.warn('[Task] Invalid update message:', message);
        return;
      }
      console.log(`[Task] Update request:`, message.taskId, message.payload?.status);

      // Verify task exists
      const existingTask = taskRegistry.getTask(message.taskId);
      if (!existingTask) {
        console.warn(`[Task] Task not found: ${message.taskId}`);
        return;
      }

      if (message.payload?.status && isValidTaskStatus(message.payload.status)) {
        taskRegistry.updateStatus(
          message.taskId,
          message.payload.status,
          message.payload.result,
          message.payload.outputLink
        );
      } else if (message.payload?.result !== undefined) {
        taskRegistry.updateResult(
          message.taskId,
          message.payload.result,
          message.payload.outputLink
        );
      }
    } catch (error) {
      logError('task:update', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Agent] Reporter disconnected: ${socket.id}`);
    // Don't mark hook-based agents as error on disconnect (fire-and-forget pattern)
    // Only mark persistent connections as error
    if (registeredAgentId && !registeredAgentId.startsWith('claude-')) {
      const agent = agentRegistry.getAgent(registeredAgentId);
      if (agent && agent.status !== 'completed') {
        agentRegistry.updateStatus(
          registeredAgentId,
          'error',
          'Connection lost (socket disconnected)'
        );
      }
    }
  });
});

// REST API endpoints
app.get('/api/agents', (_req, res) => {
  try {
    res.json(agentRegistry.getAllAgents());
  } catch (error) {
    logError('GET /api/agents', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = agentRegistry.getAgent(req.params.id);
    if (agent) {
      res.json(agent);
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error) {
    logError('GET /api/agents/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  try {
    const success = agentRegistry.deregister(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error) {
    logError('DELETE /api/agents/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  try {
    res.json({
      status: 'ok',
      agents: agentRegistry.getAllAgents().length,
      tasks: taskRegistry.getAllTasks().length,
      uptime: process.uptime()
    });
  } catch (error) {
    logError('GET /api/health', error);
    res.status(500).json({ status: 'error', error: 'Internal server error' });
  }
});

// Task REST API endpoints
app.get('/api/tasks', (req, res) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    if (agentId) {
      res.json(taskRegistry.getTasksByAgent(agentId));
    } else {
      res.json(taskRegistry.getAllTasks());
    }
  } catch (error) {
    logError('GET /api/tasks', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = taskRegistry.getTask(req.params.id);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    logError('GET /api/tasks/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { taskId, agentId, title, prompt, status } = req.body;

    // Validation
    if (!taskId || typeof taskId !== 'string' || taskId.length === 0) {
      res.status(400).json({ error: 'taskId is required and must be a non-empty string' });
      return;
    }
    if (!agentId || typeof agentId !== 'string' || agentId.length === 0) {
      res.status(400).json({ error: 'agentId is required and must be a non-empty string' });
      return;
    }
    if (!title || typeof title !== 'string' || title.length === 0) {
      res.status(400).json({ error: 'title is required and must be a non-empty string' });
      return;
    }

    // Verify agent exists
    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Validate status if provided
    const taskStatus = isValidTaskStatus(status) ? status : 'doing';

    const task = taskRegistry.create(taskId, agentId, title, prompt || '', taskStatus);
    agentRegistry.addTask(agentId, task.id);
    res.status(201).json(task);
  } catch (error) {
    logError('POST /api/tasks', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const { status, result, outputLink } = req.body;
    const existingTask = taskRegistry.getTask(req.params.id);

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Validate status if provided
    if (status && !isValidTaskStatus(status)) {
      res.status(400).json({ error: 'Invalid status. Must be: todo, doing, done, or failed' });
      return;
    }

    let updatedTask: Task | null = null;
    if (status) {
      updatedTask = taskRegistry.updateStatus(req.params.id, status, result, outputLink);
    } else if (result !== undefined) {
      updatedTask = taskRegistry.updateResult(req.params.id, result, outputLink);
    }

    res.json(updatedTask || existingTask);
  } catch (error) {
    logError('PATCH /api/tasks/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const task = taskRegistry.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Agent의 taskIds에서 제거
    agentRegistry.removeTask(task.agentId, task.id);
    taskRegistry.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logError('DELETE /api/tasks/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Agent session info update endpoint
app.patch('/api/agents/:id', (req, res) => {
  try {
    const { goal, blocker, nextAction } = req.body;
    const agent = agentRegistry.updateSessionInfo(req.params.id, {
      goal,
      blocker,
      nextAction
    });

    if (agent) {
      res.json(agent);
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error) {
    logError('PATCH /api/agents/:id', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent task stats
app.get('/api/agents/:id/tasks', (req, res) => {
  try {
    const agent = agentRegistry.getAgent(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const tasks = taskRegistry.getTasksByAgent(req.params.id);
    const stats = taskRegistry.getAgentTaskStats(req.params.id);

    res.json({ tasks, stats });
  } catch (error) {
    logError('GET /api/agents/:id/tasks', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: ErrorCode.INVALID_REQUEST,
      message: 'Route not found',
      timestamp: Date.now()
    }
  });
});

// Global error handler middleware (must be last)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logError(`${req.method} ${req.path}`, err);

  if (isAppError(err)) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: Date.now()
    }
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  // Log but don't exit - let the process continue if possible
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         Agent Kanban Server Started                   ║
╠═══════════════════════════════════════════════════════╣
║  HTTP Server:     http://localhost:${PORT}              ║
║  Dashboard WS:    ws://localhost:${PORT}/dashboard      ║
║  Agent WS:        ws://localhost:${PORT}/agent          ║
╚═══════════════════════════════════════════════════════╝
  `);
});
