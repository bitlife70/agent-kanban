import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleTheme?: () => void;
  onShowTree?: () => void;
  onShowStats?: () => void;
  onFocusSearch?: () => void;
  onClearFilters?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            handlers.onToggleTheme?.();
            break;
          case 'k':
            e.preventDefault();
            handlers.onFocusSearch?.();
            break;
        }
        return;
      }

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case 't':
          handlers.onShowTree?.();
          break;
        case 's':
          handlers.onShowStats?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onFocusSearch?.();
          break;
        case 'escape':
          handlers.onClearFilters?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
