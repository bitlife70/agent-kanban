import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { agentRegistry } from './agentRegistry';
import { AgentMessage, Agent } from './types';

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
    console.log(`[Registry] Agent removed: ${agentId}`);
  }
);

// Dashboard client handlers
dashboardNsp.on('connection', (socket) => {
  console.log(`[Dashboard] Client connected: ${socket.id}`);

  // Send current agents list
  socket.emit('agents:sync', agentRegistry.getAllAgents());

  socket.on('disconnect', () => {
    console.log(`[Dashboard] Client disconnected: ${socket.id}`);
  });
});

// Agent reporter handlers
agentNsp.on('connection', (socket) => {
  console.log(`[Agent] Reporter connected: ${socket.id}`);
  let registeredAgentId: string | null = null;

  socket.on('agent:register', (message: AgentMessage) => {
    console.log(`[Agent] Register request:`, message);
    const agent = agentRegistry.register(
      message.agentId,
      message.payload.name || '',
      message.parentAgentId,
      message.payload.terminalInfo
    );
    registeredAgentId = agent.id;
    socket.emit('registered', { agentId: agent.id });
  });

  socket.on('agent:update', (message: AgentMessage) => {
    console.log(`[Agent] Status update:`, message.agentId, message.payload.status);
    if (message.payload.status) {
      agentRegistry.updateStatus(
        message.agentId,
        message.payload.status,
        message.payload.taskDescription
      );
    }
  });

  socket.on('agent:heartbeat', (message: AgentMessage) => {
    agentRegistry.heartbeat(message.agentId);
  });

  socket.on('agent:deregister', (message: AgentMessage) => {
    console.log(`[Agent] Deregister request:`, message.agentId);
    agentRegistry.deregister(message.agentId);
    registeredAgentId = null;
  });

  socket.on('disconnect', () => {
    console.log(`[Agent] Reporter disconnected: ${socket.id}`);
    // Mark as error if not properly deregistered
    if (registeredAgentId) {
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
app.get('/api/agents', (req, res) => {
  res.json(agentRegistry.getAllAgents());
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agentRegistry.getAgent(req.params.id);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  const success = agentRegistry.deregister(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agents: agentRegistry.getAllAgents().length });
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
