import { useState, useCallback, memo } from 'react';
import { Task, TaskStatus, TASK_STATUS_COLORS } from '../types/task';
import { useAgentStore } from '../stores/agentStore';
import { useInterval } from '../hooks/useInterval';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

function formatElapsedTime(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const elapsed = end - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

const STATUS_ICONS: Record<TaskStatus, string> = {
  todo: '📋',
  doing: '🔄',
  done: '✅',
  failed: '❌'
};

function TaskCardComponent({ task, onClick }: TaskCardProps) {
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(task.startTime, task.endTime));
  const colorClass = TASK_STATUS_COLORS[task.status];
  const getAgent = useAgentStore(state => state.getAgent);
  const agent = getAgent(task.agentId);

  // Update elapsed time every second for active tasks
  useInterval(
    useCallback(() => {
      setElapsedTime(formatElapsedTime(task.startTime, task.endTime));
    }, [task.startTime, task.endTime]),
    task.status === 'doing' ? 1000 : null
  );

  const handleClick = useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  return (
    <div
      onClick={handleClick}
      className={`
        p-3 rounded-lg border-2 ${colorClass} shadow-sm
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-200 ease-out
        cursor-pointer
        animate-fade-in
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={task.status}>
            {STATUS_ICONS[task.status]}
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[160px]" title={task.title}>
            {task.title}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
          {task.id.slice(0, 8)}
        </span>
      </div>

      {/* Agent info */}
      {agent && (
        <div className="mb-2 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
          <span>🤖</span>
          <span className="truncate" title={agent.name}>
            {agent.name}
          </span>
        </div>
      )}

      {/* Prompt preview */}
      {task.prompt && (
        <div className="mb-2 bg-blue-50/50 dark:bg-blue-900/20 rounded px-2 py-1 border-l-2 border-blue-400 dark:border-blue-600">
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2" title={task.prompt}>
            {task.prompt}
          </p>
        </div>
      )}

      {/* Result preview */}
      {task.result && (
        <div className="mb-2 bg-green-50/50 dark:bg-green-900/20 rounded px-2 py-1 border-l-2 border-green-400 dark:border-green-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Result:</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2" title={task.result}>
            {task.result}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <span>⏱️</span>
          <span className="font-medium">{elapsedTime}</span>
        </div>
        {task.outputLink && (
          <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
            <span>📁</span>
            <span className="truncate max-w-[100px]" title={task.outputLink}>
              {task.outputLink.split(/[/\\]/).pop()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardComponent, (prevProps, nextProps) => {
  const prev = prevProps.task;
  const next = nextProps.task;

  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.result === next.result &&
    prev.endTime === next.endTime
  );
});
