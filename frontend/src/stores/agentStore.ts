import { create } from 'zustand';
import { Agent, AgentStatus } from '../types/agent';

interface AgentStore {
  agents: Map<string, Agent>;
  connected: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
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

  setConnected: (connected) => set({ connected }),

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
