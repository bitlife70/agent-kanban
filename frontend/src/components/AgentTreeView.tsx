import { useState } from 'react';
import { Agent, AgentStatus, STATUS_LABELS } from '../types/agent';
import { useAgentStore } from '../stores/agentStore';

interface AgentTreeViewProps {
  onAgentClick?: (agent: Agent) => void;
  onClose: () => void;
}

interface TreeNodeProps {
  agent: Agent;
  allAgents: Agent[];
  level: number;
  onAgentClick?: (agent: Agent) => void;
}

const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-400',
  working: 'bg-blue-500 animate-pulse',
  waiting: 'bg-yellow-500',
  completed: 'bg-green-500',
  error: 'bg-red-500'
};

function TreeNode({ agent, allAgents, level, onAgentClick }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = allAgents.filter(a => a.parentAgentId === agent.id);
  const hasChildren = children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors
        `}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => onAgentClick?.(agent)}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Status dot */}
        <span className={`w-3 h-3 rounded-full ${STATUS_DOT_COLORS[agent.status]}`} />

        {/* Agent name */}
        <span className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
          {agent.name}
        </span>

        {/* Status badge */}
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${agent.status === 'idle' ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300' : ''}
          ${agent.status === 'working' ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200' : ''}
          ${agent.status === 'waiting' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200' : ''}
          ${agent.status === 'completed' ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200' : ''}
          ${agent.status === 'error' ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200' : ''}
        `}>
          {STATUS_LABELS[agent.status]}
        </span>

        {/* Children count */}
        {hasChildren && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({children.length})
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
            style={{ left: `${level * 24 + 22}px` }}
          />
          {children.map(child => (
            <TreeNode
              key={child.id}
              agent={child}
              allAgents={allAgents}
              level={level + 1}
              onAgentClick={onAgentClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentTreeView({ onAgentClick, onClose }: AgentTreeViewProps) {
  const getAllAgents = useAgentStore(state => state.getAllAgents);
  const agents = getAllAgents();

  // Find root agents (those without parents or whose parents don't exist)
  const rootAgents = agents.filter(agent => {
    if (!agent.parentAgentId) return true;
    return !agents.find(a => a.id === agent.parentAgentId);
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌳</span>
            <h2 className="text-xl font-bold">Agent Hierarchy</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {agents.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              No agents registered
            </div>
          ) : (
            <div className="space-y-1">
              {rootAgents.map(agent => (
                <TreeNode
                  key={agent.id}
                  agent={agent}
                  allAgents={agents}
                  level={0}
                  onAgentClick={onAgentClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {agents.length} total agent{agents.length !== 1 ? 's' : ''}
          </span>
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
