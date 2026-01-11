import { useAgentStore, ConnectionState } from '../stores/agentStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function getStatusConfig(state: ConnectionState, attempts: number) {
  switch (state) {
    case 'connecting':
      return {
        title: 'Connecting to Server',
        message: 'Establishing connection...',
        showSpinner: true,
        showRetry: false,
        bgColor: 'bg-blue-500'
      };
    case 'disconnected':
      return {
        title: 'Reconnecting...',
        message: attempts > 0
          ? `Attempting to reconnect (${attempts} ${attempts === 1 ? 'attempt' : 'attempts'})...`
          : 'Connection lost. Reconnecting...',
        showSpinner: true,
        showRetry: attempts >= 3,
        bgColor: 'bg-yellow-500'
      };
    case 'error':
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server.',
        showSpinner: false,
        showRetry: true,
        bgColor: 'bg-red-500'
      };
    default:
      return {
        title: 'Connecting...',
        message: '',
        showSpinner: true,
        showRetry: false,
        bgColor: 'bg-gray-500'
      };
  }
}

export function ConnectionStatus() {
  const connectionState = useAgentStore(state => state.connectionState);
  const reconnectAttempts = useAgentStore(state => state.reconnectAttempts);
  const lastError = useAgentStore(state => state.lastError);

  // Don't show when connected
  if (connectionState === 'connected') return null;

  const config = getStatusConfig(connectionState, reconnectAttempts);

  const handleRetry = () => {
    // Reload the page to reinitialize WebSocket connection
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90]">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center border border-gray-700">
        {/* Status Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {config.showSpinner ? (
            <>
              <div className="absolute inset-0 border-4 border-gray-700 rounded-full" />
              <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${config.bgColor.replace('bg-', 'border-')}`} />
            </>
          ) : (
            <div className="w-20 h-20 flex items-center justify-center text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Status Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          {config.title}
        </h2>

        {/* Status Message */}
        <p className="text-gray-400 text-sm mb-2">
          {config.message}
        </p>

        {/* Error Details */}
        {lastError && connectionState === 'error' && (
          <p className="text-red-400 text-xs mb-4 font-mono bg-gray-900 p-2 rounded">
            {lastError}
          </p>
        )}

        {/* Server Info */}
        <p className="text-gray-500 text-xs mb-4">
          Server: {SERVER_URL}
        </p>

        {/* Retry Button */}
        {config.showRetry && (
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Retry Connection
          </button>
        )}

        {/* Connection Tips */}
        {connectionState === 'error' && (
          <div className="mt-4 text-left text-xs text-gray-500 bg-gray-900 p-3 rounded">
            <p className="font-medium text-gray-400 mb-1">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure the server is running</li>
              <li>Check if port 3001 is available</li>
              <li>Verify your network connection</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Small status indicator for the header (when connected with issues)
export function ConnectionIndicator() {
  const connectionState = useAgentStore(state => state.connectionState);
  const reconnectAttempts = useAgentStore(state => state.reconnectAttempts);

  if (connectionState === 'connected' && reconnectAttempts === 0) {
    return (
      <div className="flex items-center gap-2 text-green-500 text-sm">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  if (connectionState === 'connected') {
    return (
      <div className="flex items-center gap-2 text-yellow-500 text-sm">
        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
        <span className="hidden sm:inline">Unstable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-red-500 text-sm">
      <span className="w-2 h-2 bg-red-500 rounded-full" />
      <span className="hidden sm:inline">Disconnected</span>
    </div>
  );
}
