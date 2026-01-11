import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_HEADER_COLORS, TASK_STATUS_DOT_COLORS } from '../types/task';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const headerColor = TASK_STATUS_HEADER_COLORS[status];
  const dotColor = TASK_STATUS_DOT_COLORS[status];

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded min-w-[260px] max-w-[300px] flex-1 h-full border border-gray-200 dark:border-gray-700">
      <div className={`${headerColor} px-3 py-2 rounded-t border-b border-gray-200 dark:border-gray-600 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="font-medium text-sm">{TASK_STATUS_LABELS[status]}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-xs py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded">
            No tasks
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
