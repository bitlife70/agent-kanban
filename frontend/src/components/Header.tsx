import { useAgentStore } from '../stores/agentStore';
import { useThemeStore } from '../stores/themeStore';

interface HeaderProps {
  onShowTree?: () => void;
  onShowStats?: () => void;
}

export function Header({ onShowTree, onShowStats }: HeaderProps) {
  const connected = useAgentStore(state => state.connected);
  const agentCount = useAgentStore(state => state.agents.size);
  const { isDark, toggle } = useThemeStore();

  return (
    <header className="bg-gray-800 dark:bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📋</span>
          <div>
            <h1 className="text-xl font-bold">Agent Kanban</h1>
            <p className="text-xs text-gray-400">Multi-Agent Monitoring Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onShowTree}
            className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Agent Hierarchy (T)"
          >
            <span className="text-xl">🌳</span>
          </button>
          <button
            onClick={onShowStats}
            className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            title="Statistics (S)"
          >
            <span className="text-xl">📊</span>
          </button>
        </div>

        {/* Agent count */}
        <div className="flex items-center gap-2 bg-gray-700 dark:bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-2xl">🤖</span>
          <div>
            <span className="text-xl font-bold">{agentCount}</span>
            <span className="text-gray-400 text-sm ml-1">agent{agentCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Connection status */}
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          ${connected
            ? 'bg-green-900/50 text-green-300'
            : 'bg-red-900/50 text-red-300'
          }
        `}>
          <span
            className={`
              w-3 h-3 rounded-full
              ${connected
                ? 'bg-green-400 animate-pulse-dot'
                : 'bg-red-400'
              }
            `}
          />
          <span className="text-sm font-medium">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
          title={isDark ? 'Switch to light mode (Ctrl+D)' : 'Switch to dark mode (Ctrl+D)'}
        >
          <span className="text-xl">
            {isDark ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
    </header>
  );
}
