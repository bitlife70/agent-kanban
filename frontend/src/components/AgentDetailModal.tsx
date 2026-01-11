import { useEffect, useState, useCallback } from 'react';
import { Agent, AgentStatus, STATUS_LABELS } from '../types/agent';
import { useAgentStore } from '../stores/agentStore';
import { useInterval } from '../hooks/useInterval';

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function formatElapsedTime(startTime: number): string {
  const elapsed = Date.now() - startTime;
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

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  working: 'bg-blue-500',
  waiting: 'bg-yellow-500',
  completed: 'bg-green-500',
  error: 'bg-red-500'
};

export function AgentDetailModal({ agent: initialAgent, onClose }: AgentDetailModalProps) {
  const getAgent = useAgentStore(state => state.getAgent);
  const getAllAgents = useAgentStore(state => state.getAllAgents);
  const removeAgent = useAgentStore(state => state.removeAgent);
  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(initialAgent.startTime));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get live agent data
  const agent = getAgent(initialAgent.id) || initialAgent;

  // Get child agents
  const childAgents = getAllAgents().filter(a => agent.children.includes(a.id));

  // Get parent agent
  const parentAgent = agent.parentAgentId ? getAgent(agent.parentAgentId) : undefined;

  // Update elapsed time
  useInterval(
    useCallback(() => {
      setElapsedTime(formatElapsedTime(agent.startTime));
    }, [agent.startTime]),
    agent.status === 'working' || agent.status === 'waiting' ? 1000 : null
  );

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showDeleteConfirm]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/agents/${agent.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        removeAgent(agent.id);
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${STATUS_COLORS[agent.status]} text-white px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <p className="text-white/80 text-sm font-mono">{agent.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Prompt */}
          {agent.prompt && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Prompt</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-3">
                <p className="text-gray-700 dark:text-gray-200">{agent.prompt}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</h3>
            <div className="flex items-center gap-3">
              <span className={`${STATUS_COLORS[agent.status]} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                {STATUS_LABELS[agent.status]}
              </span>
              {agent.taskDescription && (
                <span className="text-gray-600 dark:text-gray-300">{agent.taskDescription}</span>
              )}
            </div>
          </div>

          {/* Time Info */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Started</h3>
              <p className="text-gray-800 dark:text-gray-200">{formatDateTime(agent.startTime)}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Elapsed</h3>
              <p className="text-gray-800 dark:text-gray-200 font-mono">{elapsedTime}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Last Activity</h3>
              <p className="text-gray-800 dark:text-gray-200">{formatDateTime(agent.lastActivity)}</p>
            </div>
          </div>

          {/* Terminal Info */}
          {(agent.terminalInfo.cwd || agent.terminalInfo.pid) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Terminal Info</h3>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm">
                {agent.terminalInfo.pid && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">PID:</span>
                    <span className="text-gray-800 dark:text-gray-200">{agent.terminalInfo.pid}</span>
                  </div>
                )}
                {agent.terminalInfo.cwd && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">CWD:</span>
                    <span className="text-gray-800 dark:text-gray-200 truncate ml-2" title={agent.terminalInfo.cwd}>
                      {agent.terminalInfo.cwd}
                    </span>
                  </div>
                )}
                {agent.terminalInfo.sessionId && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-500">Session:</span>
                    <span className="text-gray-800 dark:text-gray-200 truncate ml-2">
                      {agent.terminalInfo.sessionId.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parent Agent */}
          {parentAgent && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Parent Agent</h3>
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-purple-800 dark:text-purple-200">{parentAgent.name}</span>
                  <span className={`${STATUS_COLORS[parentAgent.status]} text-white px-2 py-0.5 rounded text-xs`}>
                    {STATUS_LABELS[parentAgent.status]}
                  </span>
                </div>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">{parentAgent.id}</span>
              </div>
            </div>
          )}

          {/* Child Agents */}
          {childAgents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Sub-agents ({childAgents.length})
              </h3>
              <div className="space-y-2">
                {childAgents.map(child => (
                  <div
                    key={child.id}
                    className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-800 dark:text-blue-200">{child.name}</span>
                      <span className={`${STATUS_COLORS[child.status]} text-white px-2 py-0.5 rounded text-xs`}>
                        {STATUS_LABELS[child.status]}
                      </span>
                    </div>
                    {child.taskDescription && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{child.taskDescription}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-red-600 dark:text-red-400 text-sm">Delete this agent?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                🗑️ Delete
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
