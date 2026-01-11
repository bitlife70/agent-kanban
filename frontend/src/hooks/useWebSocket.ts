import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAgentStore } from '../stores/agentStore';
import { toast } from '../stores/toastStore';
import { Agent } from '../types/agent';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const wasConnected = useRef(false);
  const { setConnected, syncAgents, updateAgent, removeAgent } = useAgentStore();

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
      setConnected(true);

      if (wasConnected.current) {
        toast.success('Reconnected to server');
      } else {
        toast.info('Connected to server');
      }

      wasConnected.current = true;
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected from server:', reason);
      setConnected(false);

      if (reason === 'io server disconnect') {
        toast.error('Server closed the connection');
      } else if (reason === 'transport close') {
        toast.warning('Connection lost, attempting to reconnect...');
      }
    });

    socket.on('connect_error', (error) => {
      reconnectAttempts.current++;
      console.log(`[WebSocket] Connection error (attempt ${reconnectAttempts.current}):`, error.message);

      if (reconnectAttempts.current === 1) {
        toast.error('Unable to connect to server');
      }
    });

    socket.on('agents:sync', (agents: Agent[]) => {
      console.log('[WebSocket] Agents sync:', agents.length);
      syncAgents(agents);
    });

    socket.on('agent:changed', (agent: Agent) => {
      console.log('[WebSocket] Agent changed:', agent.id, agent.status);
      updateAgent(agent);

      // Show toast for important status changes
      if (agent.status === 'error') {
        toast.warning(`Agent "${agent.name}" encountered an error`);
      } else if (agent.status === 'completed') {
        toast.success(`Agent "${agent.name}" completed`);
      }
    });

    socket.on('agent:removed', (agentId: string) => {
      console.log('[WebSocket] Agent removed:', agentId);
      removeAgent(agentId);
    });

    return () => {
      socket.disconnect();
    };
  }, [setConnected, syncAgents, updateAgent, removeAgent]);

  return socketRef.current;
}
