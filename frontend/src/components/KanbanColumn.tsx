import { Agent, AgentStatus, STATUS_LABELS, STATUS_HEADER_COLORS } from '../types/agent';
import { AgentCard } from './AgentCard';

interface KanbanColumnProps {
  status: AgentStatus;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export function KanbanColumn({ status, agents, onAgentClick }: KanbanColumnProps) {
  const headerColor = STATUS_HEADER_COLORS[status];

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg min-w-[300px] max-w-[350px] flex-1 h-full shadow-lg">
      <div className={`${headerColor} text-white px-4 py-3 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">{STATUS_LABELS[status]}</span>
        </div>
        <span className="bg-white/20 px-2.5 py-1 rounded-full text-sm font-medium min-w-[28px] text-center">
          {agents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {agents.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            No agents
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
