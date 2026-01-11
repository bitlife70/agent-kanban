import { useState, useCallback, memo } from 'react';
import { Agent, STATUS_COLORS, AgentStatus, STATUS_DOT_COLORS } from '../types/agent';
import { useInterval } from '../hooks/useInterval';

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
}

function formatElapsedTime(startTime: number): string {
  const elapsed = Date.now() - startTime;
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Simple monochrome status icons
function StatusIcon({ status }: { status: AgentStatus }) {
  const iconClass = "w-4 h-4 text-gray-500 dark:text-gray-400";

  switch (status) {
    case 'idle':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'working':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      );
    case 'waiting':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'completed':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'error':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
  }
}

function AgentCardComponent({ agent, onClick }: AgentCardProps) {
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(agent.startTime));
  const colorClass = STATUS_COLORS[agent.status];
  const dotColor = STATUS_DOT_COLORS[agent.status];

  useInterval(
    useCallback(() => {
      setElapsedTime(formatElapsedTime(agent.startTime));
    }, [agent.startTime]),
    agent.status === 'working' || agent.status === 'waiting' ? 1000 : null
  );

  const handleClick = useCallback(() => {
    onClick?.(agent);
  }, [onClick, agent]);

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
          <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate max-w-[150px]" title={agent.name}>
            {agent.name}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {agent.id.slice(0, 6)}
        </span>
      </div>

      {/* Prompt */}
      {agent.prompt && (
        <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
          {agent.prompt}
        </div>
      )}

      {/* Task Description */}
      {agent.taskDescription && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
          {agent.taskDescription}
        </p>
      )}

      {/* Goal */}
      {agent.goal && (
        <div className="mb-2 text-xs border-l-2 border-gray-300 dark:border-gray-600 pl-2">
          <span className="text-gray-400">Goal:</span>
          <span className="text-gray-600 dark:text-gray-300 ml-1 line-clamp-1">{agent.goal}</span>
        </div>
      )}

      {/* Progress Bar */}
      {agent.taskIds && agent.taskIds.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{agent.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div
              className="bg-gray-500 dark:bg-gray-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${agent.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Blocker */}
      {agent.blocker && (
        <div className="mb-2 text-xs text-red-600 dark:text-red-400 border-l-2 border-red-400 pl-2">
          Blocker: {agent.blocker}
        </div>
      )}

      {/* Next Action */}
      {agent.nextAction && (
        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 border-l-2 border-amber-400 pl-2">
          Next: {agent.nextAction}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span>{elapsedTime}</span>
          <span>{formatTime(agent.lastActivity)}</span>
        </div>
        <StatusIcon status={agent.status} />
      </div>

      {/* Sub-info */}
      {(agent.children.length > 0 || agent.parentAgentId || (agent.taskIds && agent.taskIds.length > 0)) && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 text-xs text-gray-400">
          {agent.taskIds && agent.taskIds.length > 0 && (
            <span>{agent.taskIds.length} tasks</span>
          )}
          {agent.children.length > 0 && (
            <span>{agent.children.length} sub-agents</span>
          )}
          {agent.parentAgentId && (
            <span>Parent: {agent.parentAgentId.slice(0, 6)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const AgentCard = memo(AgentCardComponent, (prevProps, nextProps) => {
  const prev = prevProps.agent;
  const next = nextProps.agent;

  return (
    prev.id === next.id &&
    prev.status === next.status &&
    prev.prompt === next.prompt &&
    prev.taskDescription === next.taskDescription &&
    prev.lastActivity === next.lastActivity &&
    prev.children.length === next.children.length &&
    prev.progress === next.progress &&
    prev.goal === next.goal &&
    prev.blocker === next.blocker &&
    prev.nextAction === next.nextAction &&
    prev.taskIds?.length === next.taskIds?.length
  );
});
