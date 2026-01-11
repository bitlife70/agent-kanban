import { Agent, AgentStatus, STATUS_LABELS, STATUS_HEADER_COLORS, STATUS_DOT_COLORS } from '../types/agent';
import { AgentCard } from './AgentCard';

interface KanbanColumnProps {
  status: AgentStatus;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export function KanbanColumn({ status, agents, onAgentClick }: KanbanColumnProps) {
  const headerColor = STATUS_HEADER_COLORS[status];
  const dotColor = STATUS_DOT_COLORS[status];

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded min-w-[280px] max-w-[320px] flex-1 h-full border border-gray-200 dark:border-gray-700">
      <div className={`${headerColor} px-3 py-2.5 rounded-t border-b border-gray-200 dark:border-gray-600 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="font-medium text-sm">{STATUS_LABELS[status]}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded">
          {agents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
        {agents.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-xs py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded">
            No sessions
          </div>
        ) : (
          agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={onAgentClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
