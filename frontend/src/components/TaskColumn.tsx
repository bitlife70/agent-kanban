import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_HEADER_COLORS } from '../types/task';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const headerColor = TASK_STATUS_HEADER_COLORS[status];

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg min-w-[280px] max-w-[320px] flex-1 h-full shadow-lg">
      <div className={`${headerColor} text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{TASK_STATUS_LABELS[status]}</span>
        </div>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium min-w-[24px] text-center">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
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
