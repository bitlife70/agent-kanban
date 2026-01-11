import { useState, useMemo } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useTaskStore } from '../stores/taskStore';
import { useFilterStore } from '../stores/filterStore';
import { STATUS_COLUMNS, Agent, AgentStatus } from '../types/agent';
import { TASK_STATUS_COLUMNS, Task, TaskStatus } from '../types/task';
import { KanbanColumn } from './KanbanColumn';
import { TaskColumn } from './TaskColumn';
import { AgentDetailModal } from './AgentDetailModal';
import { TaskDetailModal } from './TaskDetailModal';

type ViewMode = 'hybrid' | 'sessions' | 'tasks';

export function HybridKanbanBoard() {
  const agents = useAgentStore(state => state.agents);
  const tasks = useTaskStore(state => state.tasks);
  const { searchQuery, activeFilters } = useFilterStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('hybrid');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null);

  // Filter agents based on search
  const filteredAgentsByStatus = useMemo(() => {
    const allAgents = Array.from(agents.values());

    let filtered = allAgents;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agent.taskDescription.toLowerCase().includes(query) ||
        agent.goal?.toLowerCase().includes(query)
      );
    }

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
  }, [agents, searchQuery]);

  // Filter tasks based on search and agent filter
  const filteredTasksByStatus = useMemo(() => {
    let allTasks = Array.from(tasks.values());

    // Apply agent filter
    if (selectedAgentFilter) {
      allTasks = allTasks.filter(task => task.agentId === selectedAgentFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allTasks = allTasks.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query) ||
        task.prompt.toLowerCase().includes(query)
      );
    }

    // Sort by startTime
    allTasks.sort((a, b) => b.startTime - a.startTime);

    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      doing: [],
      done: [],
      failed: []
    };

    allTasks.forEach(task => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [tasks, searchQuery, selectedAgentFilter]);

  const visibleAgentColumns = activeFilters.length > 0 ? activeFilters : STATUS_COLUMNS;
  const allAgents = Array.from(agents.values());

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Toggle & Agent Filter */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('hybrid')}
              className={`px-3 py-1 text-sm ${viewMode === 'hybrid'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setViewMode('sessions')}
              className={`px-3 py-1 text-sm border-l border-gray-300 dark:border-gray-600 ${viewMode === 'sessions'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-3 py-1 text-sm border-l border-gray-300 dark:border-gray-600 ${viewMode === 'tasks'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>

        {/* Agent Filter for Tasks */}
        {(viewMode === 'hybrid' || viewMode === 'tasks') && allAgents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Filter by session:</span>
            <select
              value={selectedAgentFilter || ''}
              onChange={(e) => setSelectedAgentFilter(e.target.value || null)}
              className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="">All sessions</option>
              {allAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'hybrid' ? (
          <div className="flex flex-col h-full">
            {/* Sessions Section */}
            <div className="h-[45%] border-b border-gray-300 dark:border-gray-600 overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm">
                Sessions (Agents)
              </div>
              <div className="flex gap-4 p-4 h-[calc(100%-36px)] overflow-x-auto">
                {visibleAgentColumns.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    agents={filteredAgentsByStatus[status]}
                    onAgentClick={handleAgentClick}
                  />
                ))}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="h-[55%] overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold text-sm">
                Tasks
              </div>
              <div className="flex gap-3 p-4 h-[calc(100%-36px)] overflow-x-auto">
                {TASK_STATUS_COLUMNS.map(status => (
                  <TaskColumn
                    key={status}
                    status={status}
                    tasks={filteredTasksByStatus[status]}
                    onTaskClick={handleTaskClick}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'sessions' ? (
          <div className="flex gap-4 p-6 h-full overflow-x-auto">
            {visibleAgentColumns.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                agents={filteredAgentsByStatus[status]}
                onAgentClick={handleAgentClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 p-6 h-full overflow-x-auto">
            {TASK_STATUS_COLUMNS.map(status => (
              <TaskColumn
                key={status}
                status={status}
                tasks={filteredTasksByStatus[status]}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
