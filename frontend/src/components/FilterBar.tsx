import { AgentStatus, STATUS_LABELS } from '../types/agent';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: AgentStatus[];
  onFilterToggle: (status: AgentStatus) => void;
  onClearFilters: () => void;
}

const STATUS_FILTER_COLORS: Record<AgentStatus, { active: string; inactive: string }> = {
  idle: {
    active: 'bg-gray-500 text-white',
    inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
  },
  working: {
    active: 'bg-blue-500 text-white',
    inactive: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50'
  },
  waiting: {
    active: 'bg-yellow-500 text-white',
    inactive: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800/50'
  },
  completed: {
    active: 'bg-green-500 text-white',
    inactive: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50'
  },
  error: {
    active: 'bg-red-500 text-white',
    inactive: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50'
  }
};

export function FilterBar({
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterToggle,
  onClearFilters
}: FilterBarProps) {
  const allStatuses: AgentStatus[] = ['idle', 'working', 'waiting', 'completed', 'error'];
  const hasActiveFilters = activeFilters.length > 0 || searchQuery.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
          {allStatuses.map(status => {
            const isActive = activeFilters.includes(status);
            const colors = STATUS_FILTER_COLORS[status];
            return (
              <button
                key={status}
                onClick={() => onFilterToggle(status)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${isActive ? colors.active : colors.inactive}
                `}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
