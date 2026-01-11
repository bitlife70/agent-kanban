import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAgentStore } from '../stores/agentStore';
import { useTaskStore } from '../stores/taskStore';
import { toast } from '../stores/toastStore';
import { Agent, AgentStatus, STATUS_COLUMNS } from '../types/agent';
import { Task, TaskStatus, TASK_STATUS_COLUMNS } from '../types/task';
import { notifyStatusChange } from '../utils/notifications';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Validation helpers
function isValidAgentStatus(status: unknown): status is AgentStatus {
  return STATUS_COLUMNS.includes(status as AgentStatus);
}

function isValidTaskStatus(status: unknown): status is TaskStatus {
  return TASK_STATUS_COLUMNS.includes(status as TaskStatus);
}

function isValidAgent(data: unknown): data is Agent {
  if (!data || typeof data !== 'object') return false;
  const agent = data as Record<string, unknown>;
  return (
    typeof agent.id === 'string' && agent.id.length > 0 &&
    typeof agent.name === 'string' &&
    isValidAgentStatus(agent.status)
  );
}

function isValidTask(data: unknown): data is Task {
  if (!data || typeof data !== 'object') return false;
  const task = data as Record<string, unknown>;
  return (
    typeof task.id === 'string' && task.id.length > 0 &&
    typeof task.agentId === 'string' &&
    typeof task.title === 'string' &&
    isValidTaskStatus(task.status)
  );
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const wasConnected = useRef(false);
  const {
    setConnected,
    setConnectionState,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    syncAgents,
    updateAgent,
    removeAgent
  } = useAgentStore();
  const { syncTasks, updateTask, removeTask } = useTaskStore();

  useEffect(() => {
    const socket = io(`${SERVER_URL}/dashboard`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      setConnectionState('connected');
      resetReconnectAttempts();

      if (wasConnected.current) {
        toast.success('Reconnected to server');
      } else {
        toast.info('Connected to server');
      }

      wasConnected.current = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected from server:', reason);

      if (reason === 'io server disconnect') {
        setConnectionState('error', 'Server closed the connection');
        toast.error('Server closed the connection');
      } else if (reason === 'transport close') {
        setConnectionState('disconnected', 'Connection lost');
        toast.warning('Connection lost, attempting to reconnect...');
      } else {
        setConnectionState('disconnected', reason);
      }
    });

    socket.on('connect_error', (error) => {
      incrementReconnectAttempts();
      const attempts = useAgentStore.getState().reconnectAttempts;
      console.log(`[WebSocket] Connection error (attempt ${attempts}):`, error.message);
      setConnectionState('error', error.message);

      if (attempts === 1) {
        toast.error('Unable to connect to server');
      }
    });

    socket.on('agents:sync', (data: unknown) => {
      try {
        if (!Array.isArray(data)) {
          console.warn('[WebSocket] Invalid agents:sync data:', data);
          return;
        }
        const validAgents = data.filter(isValidAgent);
        if (validAgents.length !== data.length) {
          console.warn(`[WebSocket] Filtered ${data.length - validAgents.length} invalid agents`);
        }
        console.log('[WebSocket] Agents sync:', validAgents.length);
        syncAgents(validAgents);
      } catch (error) {
        console.error('[WebSocket] Error handling agents:sync:', error);
      }
    });

    socket.on('agent:changed', (data: unknown) => {
      try {
        if (!isValidAgent(data)) {
          console.warn('[WebSocket] Invalid agent:changed data:', data);
          return;
        }
        console.log('[WebSocket] Agent changed:', data.id, data.status);

        // Check if status actually changed for notifications
        const currentAgents = useAgentStore.getState().agents;
        const existingAgent = currentAgents.get(data.id);
        const statusChanged = !existingAgent || existingAgent.status !== data.status;

        updateAgent(data);

        // Show toast and sound notification for important status changes
        if (statusChanged) {
          if (data.status === 'error') {
            toast.warning(`Agent "${data.name}" encountered an error`);
            notifyStatusChange(data.name, 'error');
          } else if (data.status === 'completed') {
            toast.success(`Agent "${data.name}" completed`);
            notifyStatusChange(data.name, 'completed');
          } else if (data.status === 'waiting') {
            toast.info(`Agent "${data.name}" is waiting for input`);
            notifyStatusChange(data.name, 'waiting');
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error handling agent:changed:', error);
      }
    });

    socket.on('agent:removed', (agentId: unknown) => {
      try {
        if (typeof agentId !== 'string' || agentId.length === 0) {
          console.warn('[WebSocket] Invalid agent:removed data:', agentId);
          return;
        }
        console.log('[WebSocket] Agent removed:', agentId);
        removeAgent(agentId);
      } catch (error) {
        console.error('[WebSocket] Error handling agent:removed:', error);
      }
    });

    // Task event listeners
    socket.on('tasks:sync', (data: unknown) => {
      try {
        if (!Array.isArray(data)) {
          console.warn('[WebSocket] Invalid tasks:sync data:', data);
          return;
        }
        const validTasks = data.filter(isValidTask);
        if (validTasks.length !== data.length) {
          console.warn(`[WebSocket] Filtered ${data.length - validTasks.length} invalid tasks`);
        }
        console.log('[WebSocket] Tasks sync:', validTasks.length);
        syncTasks(validTasks);
      } catch (error) {
        console.error('[WebSocket] Error handling tasks:sync:', error);
      }
    });

    socket.on('task:changed', (data: unknown) => {
      try {
        if (!isValidTask(data)) {
          console.warn('[WebSocket] Invalid task:changed data:', data);
          return;
        }
        console.log('[WebSocket] Task changed:', data.id, data.status);
        updateTask(data);

        // Show toast for task status changes
        if (data.status === 'done') {
          toast.success(`Task "${data.title}" completed`);
        } else if (data.status === 'failed') {
          toast.warning(`Task "${data.title}" failed`);
        }
      } catch (error) {
        console.error('[WebSocket] Error handling task:changed:', error);
      }
    });

    socket.on('task:removed', (taskId: unknown) => {
      try {
        if (typeof taskId !== 'string' || taskId.length === 0) {
          console.warn('[WebSocket] Invalid task:removed data:', taskId);
          return;
        }
        console.log('[WebSocket] Task removed:', taskId);
        removeTask(taskId);
      } catch (error) {
        console.error('[WebSocket] Error handling task:removed:', error);
      }
    });

    // Server error event
    socket.on('error', (error: { code: string; message: string }) => {
      console.error('[WebSocket] Server error:', error);
      toast.error(`Server error: ${error.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [setConnected, setConnectionState, incrementReconnectAttempts, resetReconnectAttempts, syncAgents, updateAgent, removeAgent, syncTasks, updateTask, removeTask]);

  return socketRef.current;
}
