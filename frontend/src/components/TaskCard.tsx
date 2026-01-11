import { useState, useCallback, memo } from 'react';
import { Task, TaskStatus, TASK_STATUS_COLORS, TASK_STATUS_DOT_COLORS } from '../types/task';
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

// Simple monochrome status icons
function StatusIcon({ status }: { status: TaskStatus }) {
  const iconClass = "w-4 h-4 text-gray-500 dark:text-gray-400";

  switch (status) {
    case 'todo':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
        </svg>
      );
    case 'doing':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      );
    case 'done':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'failed':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
  }
}

function TaskCardComponent({ task, onClick }: TaskCardProps) {
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(task.startTime, task.endTime));
  const colorClass = TASK_STATUS_COLORS[task.status];
  const dotColor = TASK_STATUS_DOT_COLORS[task.status];
  const getAgent = useAgentStore(state => state.getAgent);
  const agent = getAgent(task.agentId);

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
        p-3 rounded ${colorClass}
        hover:shadow-md
        transition-shadow duration-150
        cursor-pointer
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate max-w-[160px]" title={task.title}>
            {task.title}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {task.id.slice(0, 6)}
        </span>
      </div>

      {/* Agent info */}
      {agent && (
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Agent: {agent.name}
        </div>
      )}

      {/* Prompt preview */}
      {task.prompt && (
        <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
          {task.prompt}
        </div>
      )}

      {/* Result preview */}
      {task.result && (
        <div className="mb-2 text-xs border-l-2 border-gray-300 dark:border-gray-600 pl-2">
          <span className="text-gray-400">Result:</span>
          <span className="text-gray-600 dark:text-gray-300 ml-1 line-clamp-2">{task.result}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
        <span>{elapsedTime}</span>
        <div className="flex items-center gap-2">
          {task.outputLink && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          )}
          <StatusIcon status={task.status} />
        </div>
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
