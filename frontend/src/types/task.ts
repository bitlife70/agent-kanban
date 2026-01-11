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
  doing: 'Doing',
  done: 'Done',
  failed: 'Failed'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
  doing: 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700',
  done: 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700',
  failed: 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700'
};

export const TASK_STATUS_HEADER_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-500',
  doing: 'bg-blue-500',
  done: 'bg-green-500',
  failed: 'bg-red-500'
};

export const TASK_STATUS_ICONS: Record<TaskStatus, string> = {
  todo: 'clipboard-list',
  doing: 'play-circle',
  done: 'check-circle',
  failed: 'x-circle'
};
