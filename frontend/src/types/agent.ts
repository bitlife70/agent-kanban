export type AgentStatus = 'idle' | 'working' | 'waiting' | 'completed' | 'error';

export interface TerminalInfo {
  pid?: number;
  cwd?: string;
  sessionId?: string;
}

export interface SessionEvent {
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_failed' | 'status_changed';
  timestamp: number;
  description: string;
  taskId?: string;
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
  goal?: string;
  progress: number;
  blocker?: string;
  nextAction?: string;
  recentEvents: SessionEvent[];
  taskIds: string[];
}

export const STATUS_COLUMNS: AgentStatus[] = ['idle', 'working', 'waiting', 'completed', 'error'];

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  waiting: 'Waiting',
  completed: 'Completed',
  error: 'Error'
};

// Simplified corporate colors - muted and professional
export const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-white dark:bg-gray-800 border-l-4 border-l-gray-400 border-y border-r border-gray-200 dark:border-gray-700',
  working: 'bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 border-y border-r border-gray-200 dark:border-gray-700',
  waiting: 'bg-white dark:bg-gray-800 border-l-4 border-l-amber-500 border-y border-r border-gray-200 dark:border-gray-700',
  completed: 'bg-white dark:bg-gray-800 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 dark:border-gray-700',
  error: 'bg-white dark:bg-gray-800 border-l-4 border-l-red-500 border-y border-r border-gray-200 dark:border-gray-700'
};

export const STATUS_HEADER_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  working: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  waiting: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  completed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  error: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
};

// Status dot colors for indicators
export const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-400',
  working: 'bg-blue-500',
  waiting: 'bg-amber-500',
  completed: 'bg-emerald-500',
  error: 'bg-red-500'
};
