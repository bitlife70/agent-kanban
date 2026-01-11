export type TaskStatus = 'todo' | 'doing' | 'done' | 'failed';

export interface TaskStatusChange {
  from: TaskStatus;
  to: TaskStatus;
  timestamp: number;
}

export interface Task {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  result?: string;
  outputLink?: string;
  startTime: number;
  endTime?: number;
  statusHistory: TaskStatusChange[];
}

export const TASK_STATUS_COLUMNS: TaskStatus[] = ['todo', 'doing', 'done', 'failed'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'In Progress',
  done: 'Done',
  failed: 'Failed'
};

// Simplified corporate colors
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-white dark:bg-gray-800 border-l-4 border-l-gray-400 border-y border-r border-gray-200 dark:border-gray-700',
  doing: 'bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 border-y border-r border-gray-200 dark:border-gray-700',
  done: 'bg-white dark:bg-gray-800 border-l-4 border-l-emerald-500 border-y border-r border-gray-200 dark:border-gray-700',
  failed: 'bg-white dark:bg-gray-800 border-l-4 border-l-red-500 border-y border-r border-gray-200 dark:border-gray-700'
};

export const TASK_STATUS_HEADER_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  doing: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  done: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  failed: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
};

// Status dot colors
export const TASK_STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-400',
  doing: 'bg-blue-500',
  done: 'bg-emerald-500',
  failed: 'bg-red-500'
};
