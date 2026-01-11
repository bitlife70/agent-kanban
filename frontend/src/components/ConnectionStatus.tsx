import { useAgentStore, ConnectionState } from '../stores/agentStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function getStatusConfig(state: ConnectionState, attempts: number) {
  switch (state) {
    case 'connecting':
      return {
        title: 'Connecting',
        message: 'Establishing connection to server...',
        showSpinner: true,
        showRetry: false
      };
    case 'disconnected':
      return {
        title: 'Reconnecting',
        message: attempts > 0
          ? `Attempt ${attempts}...`
          : 'Connection lost',
        showSpinner: true,
        showRetry: attempts >= 3
      };
    case 'error':
      return {
        title: 'Connection Failed',
        message: 'Unable to connect to server',
        showSpinner: false,
        showRetry: true
      };
    default:
      return {
        title: 'Connecting',
        message: '',
        showSpinner: true,
        showRetry: false
      };
  }
}

export function ConnectionStatus() {
  const connectionState = useAgentStore(state => state.connectionState);
  const reconnectAttempts = useAgentStore(state => state.reconnectAttempts);
  const lastError = useAgentStore(state => state.lastError);

  if (connectionState === 'connected') return null;

  const config = getStatusConfig(connectionState, reconnectAttempts);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-[90]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
        {/* Spinner or Icon */}
        <div className="flex justify-center mb-4">
          {config.showSpinner ? (
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2 className="text-center text-lg font-medium text-gray-800 dark:text-gray-100 mb-1">
          {config.title}
        </h2>

        {/* Message */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          {config.message}
        </p>

        {/* Error Details */}
        {lastError && connectionState === 'error' && (
          <p className="text-center text-xs text-gray-400 mb-3 font-mono">
            {lastError}
          </p>
        )}

        {/* Server Info */}
        <p className="text-center text-xs text-gray-400 mb-4">
          {SERVER_URL}
        </p>

        {/* Retry Button */}
        {config.showRetry && (
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 text-white text-sm font-medium rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function ConnectionIndicator() {
  const connectionState = useAgentStore(state => state.connectionState);

  if (connectionState === 'connected') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
}
