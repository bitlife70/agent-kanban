import { useState, useMemo } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useFilterStore } from '../stores/filterStore';
import { STATUS_COLUMNS, Agent, AgentStatus } from '../types/agent';
import { KanbanColumn } from './KanbanColumn';
import { AgentDetailModal } from './AgentDetailModal';

export function KanbanBoard() {
  const getAllAgents = useAgentStore(state => state.getAllAgents);
  const { searchQuery, activeFilters } = useFilterStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Filter agents based on search and status filters
  const filteredAgentsByStatus = useMemo(() => {
    const allAgents = getAllAgents();

    // Apply search filter
    let filtered = allAgents;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agent.taskDescription.toLowerCase().includes(query) ||
        agent.terminalInfo.cwd?.toLowerCase().includes(query)
      );
    }

    // Group by status
    const grouped: Record<AgentStatus, Agent[]> = {
      idle: [],
      working: [],
      waiting: [],
      completed: [],
      error: []
    };

    filtered.forEach(agent => {
      grouped[agent.status].push(agent);
    });

    return grouped;
  }, [getAllAgents, searchQuery]);

  // Determine which columns to show based on filters
  const visibleColumns = activeFilters.length > 0 ? activeFilters : STATUS_COLUMNS;

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  return (
    <>
      <div className="flex gap-4 p-6 h-full overflow-x-auto">
        {visibleColumns.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            agents={filteredAgentsByStatus[status]}
            onAgentClick={handleAgentClick}
          />
        ))}
      </div>

      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
