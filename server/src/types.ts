export type AgentStatus = 'idle' | 'working' | 'waiting' | 'completed' | 'error';

export interface TerminalInfo {
  pid?: number;
  cwd?: string;
  sessionId?: string;
}

export interface Agent {
  id: string;
  name: string;
  prompt?: string;
  status: AgentStatus;
  taskDescription: string;
  startTime: number;
  lastActivity: number;
  parentAgentId?: string;
  children: string[];
  terminalInfo: TerminalInfo;
}

export interface AgentMessage {
  type: 'register' | 'status_update' | 'heartbeat' | 'deregister';
  agentId: string;
  parentAgentId?: string;
  timestamp: number;
  payload: {
    name?: string;
    prompt?: string;
    status?: AgentStatus;
    taskDescription?: string;
    progress?: number;
    terminalInfo?: TerminalInfo;
    metadata?: Record<string, unknown>;
  };
}

export interface ServerToClientEvents {
  'agents:sync': (agents: Agent[]) => void;
  'agent:changed': (agent: Agent) => void;
  'agent:removed': (agentId: string) => void;
}

export interface ClientToServerEvents {
  'subscribe': () => void;
  'unsubscribe': () => void;
}

export interface AgentToServerEvents {
  'agent:register': (message: AgentMessage) => void;
  'agent:update': (message: AgentMessage) => void;
  'agent:heartbeat': (message: AgentMessage) => void;
  'agent:deregister': (message: AgentMessage) => void;
}
