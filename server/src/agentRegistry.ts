import { Agent, AgentStatus, TerminalInfo } from './types';

const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
const HOOKS_TIMEOUT = 300000; // 5 minutes for hook-based agents

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private onAgentChange?: (agent: Agent) => void;
  private onAgentRemove?: (agentId: string) => void;

  setCallbacks(
    onAgentChange: (agent: Agent) => void,
    onAgentRemove: (agentId: string) => void
  ) {
    this.onAgentChange = onAgentChange;
    this.onAgentRemove = onAgentRemove;
  }

  register(
    agentId: string,
    name: string,
    parentAgentId?: string,
    terminalInfo?: TerminalInfo
  ): Agent {
    const now = Date.now();

    const agent: Agent = {
      id: agentId,
      name: name || `Agent-${agentId.slice(0, 8)}`,
      status: 'idle',
      taskDescription: '',
      startTime: now,
      lastActivity: now,
      parentAgentId,
      children: [],
      terminalInfo: terminalInfo || {}
    };

    this.agents.set(agentId, agent);
    this.resetHeartbeatTimer(agentId);

    // Update parent's children list
    if (parentAgentId) {
      const parent = this.agents.get(parentAgentId);
      if (parent && !parent.children.includes(agentId)) {
        parent.children.push(agentId);
        this.onAgentChange?.(parent);
      }
    }

    this.onAgentChange?.(agent);
    return agent;
  }

  updateStatus(
    agentId: string,
    status: AgentStatus,
    taskDescription?: string
  ): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.status = status;
    agent.lastActivity = Date.now();
    if (taskDescription !== undefined) {
      agent.taskDescription = taskDescription;
    }

    this.resetHeartbeatTimer(agentId);
    this.onAgentChange?.(agent);
    return agent;
  }

  heartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastActivity = Date.now();
    this.resetHeartbeatTimer(agentId);
    return true;
  }

  deregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Clear heartbeat timer
    const timer = this.heartbeatTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(agentId);
    }

    // Remove from parent's children list
    if (agent.parentAgentId) {
      const parent = this.agents.get(agent.parentAgentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== agentId);
        this.onAgentChange?.(parent);
      }
    }

    // Recursively deregister children
    for (const childId of agent.children) {
      this.deregister(childId);
    }

    this.agents.delete(agentId);
    this.onAgentRemove?.(agentId);
    return true;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByStatus(status: AgentStatus): Agent[] {
    return this.getAllAgents().filter(agent => agent.status === status);
  }

  private resetHeartbeatTimer(agentId: string) {
    // Clear existing timer
    const existingTimer = this.heartbeatTimers.get(agentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Use longer timeout for hook-based agents (fire-and-forget pattern)
    const isHookAgent = agentId.startsWith('claude-');
    const timeout = isHookAgent ? HOOKS_TIMEOUT : HEARTBEAT_TIMEOUT;

    // Set new timer
    const timer = setTimeout(() => {
      console.log(`Agent ${agentId} heartbeat timeout, marking as error`);
      const agent = this.agents.get(agentId);
      if (agent && agent.status !== 'completed') {
        this.updateStatus(agentId, 'error', 'Connection lost (heartbeat timeout)');
      }
    }, timeout);

    this.heartbeatTimers.set(agentId, timer);
  }
}

export const agentRegistry = new AgentRegistry();
