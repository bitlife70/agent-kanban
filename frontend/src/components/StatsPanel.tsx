import { useAgentStore } from '../stores/agentStore';
import { AgentStatus, STATUS_LABELS } from '../types/agent';

interface StatsPanelProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  working: 'bg-blue-500',
  waiting: 'bg-yellow-500',
  completed: 'bg-green-500',
  error: 'bg-red-500'
};

export function StatsPanel({ onClose }: StatsPanelProps) {
  const getAllAgents = useAgentStore(state => state.getAllAgents);
  const agents = getAllAgents();

  const stats = {
    total: agents.length,
    idle: agents.filter(a => a.status === 'idle').length,
    working: agents.filter(a => a.status === 'working').length,
    waiting: agents.filter(a => a.status === 'waiting').length,
    completed: agents.filter(a => a.status === 'completed').length,
    error: agents.filter(a => a.status === 'error').length,
    withChildren: agents.filter(a => a.children.length > 0).length,
    subAgents: agents.filter(a => a.parentAgentId).length
  };

  const avgElapsedTime = agents.length > 0
    ? Math.floor(agents.reduce((sum, a) => sum + (Date.now() - a.startTime), 0) / agents.length / 1000)
    : 0;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const statuses: AgentStatus[] = ['idle', 'working', 'waiting', 'completed', 'error'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold">Statistics</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Total agents */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
            <div className="text-gray-500 dark:text-gray-400">Total Agents</div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {statuses.map(status => (
              <div key={status} className="text-center">
                <div className={`${STATUS_COLORS[status]} text-white text-xl font-bold rounded-lg py-2`}>
                  {stats[status]}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {STATUS_LABELS[status]}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status Distribution</div>
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
                {statuses.map(status => {
                  const percentage = (stats[status] / stats.total) * 100;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={status}
                      className={`${STATUS_COLORS[status]} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                      title={`${STATUS_LABELS[status]}: ${stats[status]} (${percentage.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.withChildren}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Parent Agents</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.subAgents}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Sub-agents</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 col-span-2">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatDuration(avgElapsedTime)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Average Elapsed Time</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
