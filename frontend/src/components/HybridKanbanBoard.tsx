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

  const filteredTasksByStatus = useMemo(() => {
    let allTasks = Array.from(tasks.values());

    if (selectedAgentFilter) {
      allTasks = allTasks.filter(task => task.agentId === selectedAgentFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allTasks = allTasks.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query) ||
        task.prompt.toLowerCase().includes(query)
      );
    }

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <div className="flex rounded border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('hybrid')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'hybrid'
                ? 'bg-gray-800 dark:bg-gray-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setViewMode('sessions')}
              className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${viewMode === 'sessions'
                ? 'bg-gray-800 dark:bg-gray-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Sessions
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${viewMode === 'tasks'
                ? 'bg-gray-800 dark:bg-gray-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>

        {/* Agent Filter */}
        {(viewMode === 'hybrid' || viewMode === 'tasks') && allAgents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Session</span>
            <select
              value={selectedAgentFilter || ''}
              onChange={(e) => setSelectedAgentFilter(e.target.value || null)}
              className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="">All</option>
              {allAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'hybrid' ? (
          <div className="flex flex-col h-full">
            {/* Sessions Section */}
            <div className="h-[45%] border-b border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sessions</h2>
              </div>
              <div className="flex gap-3 p-4 h-[calc(100%-37px)] overflow-x-auto bg-gray-50 dark:bg-gray-900">
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
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</h2>
              </div>
              <div className="flex gap-3 p-4 h-[calc(100%-37px)] overflow-x-auto bg-gray-50 dark:bg-gray-900">
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
          <div className="flex gap-4 p-4 h-full overflow-x-auto">
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
          <div className="flex gap-3 p-4 h-full overflow-x-auto">
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
