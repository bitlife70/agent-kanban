import { useAgentStore } from '../stores/agentStore';

export function ConnectionStatus() {
  const connected = useAgentStore(state => state.connected);

  if (connected) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center animate-scale-in">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Connecting to Server
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Attempting to establish connection...
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-4">
          Server: localhost:3001
        </p>
      </div>
    </div>
  );
}
