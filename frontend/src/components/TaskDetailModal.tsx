import { useCallback, useEffect } from 'react';
import { Task, TASK_STATUS_LABELS } from '../types/task';
import { useAgentStore } from '../stores/agentStore';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatDuration(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const elapsed = end - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const getAgent = useAgentStore(state => state.getAgent);
  const agent = getAgent(task.agentId);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{task.title}</h2>
              <p className="text-sm opacity-80 font-mono">{task.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] space-y-4">
          {/* Status & Agent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {TASK_STATUS_LABELS[task.status]}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Session</label>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {agent?.name || task.agentId.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Time info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</label>
              <p className="text-sm text-gray-800 dark:text-gray-100">
                {formatTime(task.startTime)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {task.endTime ? 'Ended' : 'Running'}
              </label>
              <p className="text-sm text-gray-800 dark:text-gray-100">
                {task.endTime ? formatTime(task.endTime) : '-'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</label>
              <p className="text-sm text-gray-800 dark:text-gray-100">
                {formatDuration(task.startTime, task.endTime)}
              </p>
            </div>
          </div>

          {/* Prompt */}
          {task.prompt && (
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border-l-4 border-blue-500">
              <label className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">Prompt</label>
              <p className="mt-1 text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                {task.prompt}
              </p>
            </div>
          )}

          {/* Result */}
          {task.result && (
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border-l-4 border-green-500">
              <label className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-medium">Result</label>
              <p className="mt-1 text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                {task.result}
              </p>
            </div>
          )}

          {/* Output Link */}
          {task.outputLink && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Output</label>
              <p className="font-mono text-sm text-blue-600 dark:text-blue-400 break-all">
                {task.outputLink}
              </p>
            </div>
          )}

          {/* Status History */}
          {task.statusHistory.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Status History
              </label>
              <div className="mt-2 space-y-2">
                {task.statusHistory.map((change, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {formatTime(change.timestamp)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {TASK_STATUS_LABELS[change.from]} → {TASK_STATUS_LABELS[change.to]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
