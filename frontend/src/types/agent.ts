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

export const STATUS_COLUMNS: AgentStatus[] = ['idle', 'working', 'waiting', 'completed', 'error'];

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  waiting: 'Waiting',
  completed: 'Completed',
  error: 'Error'
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
  working: 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700',
  waiting: 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-700',
  completed: 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700',
  error: 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700'
};

export const STATUS_HEADER_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  working: 'bg-blue-500',
  waiting: 'bg-yellow-500',
  completed: 'bg-green-500',
  error: 'bg-red-500'
};
