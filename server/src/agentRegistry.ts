import { Agent, AgentStatus, TerminalInfo, SessionEvent } from './types';

const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
const HOOKS_TIMEOUT = 300000; // 5 minutes for hook-based agents
const MAX_RECENT_EVENTS = 5; // 최근 이벤트 최대 개수

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
    terminalInfo?: TerminalInfo,
    prompt?: string
  ): Agent {
    const now = Date.now();

    const agent: Agent = {
      id: agentId,
      name: name || `Agent-${agentId.slice(0, 8)}`,
      prompt: prompt || '',
      status: 'idle',
      taskDescription: '',
      startTime: now,
      lastActivity: now,
      parentAgentId,
      children: [],
      terminalInfo: terminalInfo || {},
      // 세션 대시보드 필드 초기화
      goal: '',
      progress: 0,
      blocker: undefined,
      nextAction: undefined,
      recentEvents: [],
      taskIds: []
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

    // Allow restarting from completed/error state when new prompt starts (working status)
    // This handles the case where a new prompt is submitted in the same terminal
    if (agent.status === 'completed' || agent.status === 'error') {
      if (status === 'working') {
        // New prompt started - allow restart
        console.log(`[Registry] Restarting agent ${agentId} from ${agent.status} to ${status} (new prompt)`);
      } else {
        // Don't allow other status changes for terminal states
        console.log(`[Registry] Ignoring status update for ${agentId}: already in terminal state (${agent.status})`);
        return agent;
      }
    }

    agent.status = status;
    agent.lastActivity = Date.now();
    if (taskDescription !== undefined) {
      agent.taskDescription = taskDescription;
    }

    this.resetHeartbeatTimer(agentId);
    this.onAgentChange?.(agent);
    return agent;
  }

  updateName(agentId: string, name: string, prompt?: string): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.name = name;
    if (prompt !== undefined) {
      agent.prompt = prompt;
    }
    agent.lastActivity = Date.now();

    this.resetHeartbeatTimer(agentId);
    this.onAgentChange?.(agent);
    return agent;
  }

  updatePrompt(agentId: string, prompt: string): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.prompt = prompt;
    agent.lastActivity = Date.now();

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

  // 세션 대시보드 필드 업데이트
  updateSessionInfo(
    agentId: string,
    updates: {
      goal?: string;
      blocker?: string;
      nextAction?: string;
    }
  ): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    if (updates.goal !== undefined) {
      agent.goal = updates.goal;
    }
    if (updates.blocker !== undefined) {
      agent.blocker = updates.blocker;
    }
    if (updates.nextAction !== undefined) {
      agent.nextAction = updates.nextAction;
    }

    agent.lastActivity = Date.now();
    this.resetHeartbeatTimer(agentId);
    this.onAgentChange?.(agent);
    return agent;
  }

  // 진행률 업데이트 (Task 완료 시 호출)
  updateProgress(agentId: string, progress: number): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.progress = Math.max(0, Math.min(100, progress));
    agent.lastActivity = Date.now();

    this.onAgentChange?.(agent);
    return agent;
  }

  // Task 추가 (Task 생성 시 호출)
  addTask(agentId: string, taskId: string): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    if (!agent.taskIds.includes(taskId)) {
      agent.taskIds.push(taskId);
      agent.lastActivity = Date.now();
      this.onAgentChange?.(agent);
    }

    return agent;
  }

  // Task 제거 (Task 삭제 시 호출)
  removeTask(agentId: string, taskId: string): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const index = agent.taskIds.indexOf(taskId);
    if (index !== -1) {
      agent.taskIds.splice(index, 1);
      agent.lastActivity = Date.now();
      this.onAgentChange?.(agent);
    }

    return agent;
  }

  // 최근 이벤트 추가
  addRecentEvent(
    agentId: string,
    event: {
      type: SessionEvent['type'];
      description: string;
      taskId?: string;
    }
  ): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const sessionEvent: SessionEvent = {
      type: event.type,
      timestamp: Date.now(),
      description: event.description,
      taskId: event.taskId
    };

    // 최신 이벤트를 앞에 추가
    agent.recentEvents.unshift(sessionEvent);

    // 최대 개수 유지
    if (agent.recentEvents.length > MAX_RECENT_EVENTS) {
      agent.recentEvents = agent.recentEvents.slice(0, MAX_RECENT_EVENTS);
    }

    agent.lastActivity = Date.now();
    this.onAgentChange?.(agent);
    return agent;
  }

  private resetHeartbeatTimer(agentId: string) {
    // Clear existing timer
    const existingTimer = this.heartbeatTimers.get(agentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.heartbeatTimers.delete(agentId);
    }

    // Don't set timer for completed or error agents
    const agent = this.agents.get(agentId);
    if (agent && (agent.status === 'completed' || agent.status === 'error')) {
      return;
    }

    // Use longer timeout for hook-based agents (fire-and-forget pattern)
    const isHookAgent = agentId.startsWith('claude-');
    const timeout = isHookAgent ? HOOKS_TIMEOUT : HEARTBEAT_TIMEOUT;

    // Set new timer
    const timer = setTimeout(() => {
      console.log(`Agent ${agentId} heartbeat timeout, marking as error`);
      const agent = this.agents.get(agentId);
      if (agent && agent.status !== 'completed' && agent.status !== 'error') {
        this.updateStatus(agentId, 'error', 'Connection lost (heartbeat timeout)');
      }
    }, timeout);

    this.heartbeatTimers.set(agentId, timer);
  }
}

export const agentRegistry = new AgentRegistry();
