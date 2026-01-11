import { useState, useCallback, memo } from 'react';
import { Agent, STATUS_COLORS, AgentStatus } from '../types/agent';
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
  return new Date(timestamp).toLocaleTimeString();
}

const STATUS_ICONS: Record<AgentStatus, string> = {
  idle: '😴',
  working: '🔨',
  waiting: '⏳',
  completed: '✅',
  error: '❌'
};

function AgentCardComponent({ agent, onClick }: AgentCardProps) {
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(agent.startTime));
  const colorClass = STATUS_COLORS[agent.status];

  // Update elapsed time every second for active agents
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
        p-3 rounded-lg border-2 ${colorClass} shadow-sm
        hover:shadow-lg hover:scale-[1.02]
        transition-all duration-200 ease-out
        cursor-pointer
        animate-fade-in
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={agent.status}>
            {STATUS_ICONS[agent.status]}
          </span>
          <span className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[140px]" title={agent.name}>
            {agent.name}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
          {agent.id.slice(0, 8)}
        </span>
      </div>

      {agent.prompt && (
        <div className="mb-2 bg-blue-50/50 dark:bg-blue-900/20 rounded px-2 py-1 border-l-2 border-blue-400 dark:border-blue-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Prompt:</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2" title={agent.prompt}>
            {agent.prompt}
          </p>
        </div>
      )}

      {agent.taskDescription && (
        <p className="text-sm text-gray-700 dark:text-gray-200 mb-2 line-clamp-2 bg-white/30 dark:bg-black/20 rounded px-2 py-1" title={agent.taskDescription}>
          {agent.taskDescription}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>⏱️</span>
            <span className="font-medium">{elapsedTime}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span>🕐</span>
            <span>{formatTime(agent.lastActivity)}</span>
          </div>
        </div>

        {agent.terminalInfo.cwd && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span>📁</span>
            <span className="truncate" title={agent.terminalInfo.cwd}>
              {agent.terminalInfo.cwd.split(/[/\\]/).slice(-2).join('/')}
            </span>
          </div>
        )}
      </div>

      {(agent.children.length > 0 || agent.parentAgentId) && (
        <div className="mt-2 pt-2 border-t border-gray-300/50 dark:border-gray-600/50 flex items-center justify-between text-xs">
          {agent.children.length > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              👥 {agent.children.length} sub-agent{agent.children.length > 1 ? 's' : ''}
            </span>
          )}
          {agent.parentAgentId && (
            <span className="text-purple-600 dark:text-purple-400">
              ↑ {agent.parentAgentId.slice(0, 8)}
            </span>
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
    prev.children.length === next.children.length
  );
});
