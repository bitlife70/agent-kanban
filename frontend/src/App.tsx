import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useThemeStore } from './stores/themeStore';
import { useFilterStore } from './stores/filterStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentTreeView } from './components/AgentTreeView';
import { StatsPanel } from './components/StatsPanel';
import { Agent } from './types/agent';

function AppContent() {
  useWebSocket();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { searchQuery, setSearchQuery, activeFilters, toggleFilter, clearFilters } = useFilterStore();

  const [showTree, setShowTree] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Apply dark class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Keyboard shortcuts
  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[placeholder="Search agents..."]') as HTMLInputElement;
    searchInput?.focus();
  }, []);

  useKeyboardShortcuts({
    onToggleTheme: toggleTheme,
    onShowTree: () => setShowTree(true),
    onShowStats: () => setShowStats(true),
    onFocusSearch: handleFocusSearch,
    onClearFilters: clearFilters
  });

  const handleAgentClickFromTree = (_agent: Agent) => {
    setShowTree(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-200 dark:bg-gray-900 transition-colors">
      <Header
        onShowTree={() => setShowTree(true)}
        onShowStats={() => setShowStats(true)}
      />
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilters={activeFilters}
        onFilterToggle={toggleFilter}
        onClearFilters={clearFilters}
      />
      <main className="flex-1 overflow-hidden">
        <KanbanBoard />
      </main>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 dark:text-gray-600 bg-white/80 dark:bg-gray-800/80 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm">
        <span className="font-mono">T</span> Tree &nbsp;
        <span className="font-mono">S</span> Stats &nbsp;
        <span className="font-mono">/</span> Search &nbsp;
        <span className="font-mono">Ctrl+D</span> Theme
      </div>

      {/* Modals */}
      {showTree && (
        <AgentTreeView
          onAgentClick={handleAgentClickFromTree}
          onClose={() => setShowTree(false)}
        />
      )}
      {showStats && (
        <StatsPanel onClose={() => setShowStats(false)} />
      )}

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
