import { create } from 'zustand';
import { Agent, AgentStatus } from '../types/agent';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface AgentStore {
  agents: Map<string, Agent>;
  connected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastError: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnectionState: (state: ConnectionState, error?: string) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  syncAgents: (agents: Agent[]) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;

  // Selectors
  getAgentsByStatus: (status: AgentStatus) => Agent[];
  getAgent: (id: string) => Agent | undefined;
  getAllAgents: () => Agent[];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: new Map(),
  connected: false,
  connectionState: 'connecting',
  reconnectAttempts: 0,
  lastError: null,

  setConnected: (connected) => set({
    connected,
    connectionState: connected ? 'connected' : 'disconnected'
  }),

  setConnectionState: (state, error) => set({
    connectionState: state,
    connected: state === 'connected',
    lastError: error || null
  }),

  incrementReconnectAttempts: () => set((s) => ({
    reconnectAttempts: s.reconnectAttempts + 1
  })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  syncAgents: (agents) => {
    const agentMap = new Map<string, Agent>();
    agents.forEach(agent => agentMap.set(agent.id, agent));
    set({ agents: agentMap });
  },

  updateAgent: (agent) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.set(agent.id, agent);
      return { agents: newAgents };
    });
  },

  removeAgent: (agentId) => {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.delete(agentId);
      return { agents: newAgents };
    });
  },

  getAgentsByStatus: (status) => {
    return Array.from(get().agents.values()).filter(a => a.status === status);
  },

  getAgent: (id) => {
    return get().agents.get(id);
  },

  getAllAgents: () => {
    return Array.from(get().agents.values());
  }
}));
