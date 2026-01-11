import { useState, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { TASK_STATUS_COLUMNS, Task, TaskStatus } from '../types/task';
import { TaskColumn } from './TaskColumn';
import { TaskDetailModal } from './TaskDetailModal';

interface TaskKanbanBoardProps {
  agentFilter?: string; // Filter tasks by agent ID
}

export function TaskKanbanBoard({ agentFilter }: TaskKanbanBoardProps) {
  const tasks = useTaskStore(state => state.tasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filter and group tasks by status
  const tasksByStatus = useMemo(() => {
    let allTasks = Array.from(tasks.values());

    // Apply agent filter if provided
    if (agentFilter) {
      allTasks = allTasks.filter(task => task.agentId === agentFilter);
    }

    // Sort by startTime (newest first for doing, oldest first for others)
    allTasks.sort((a, b) => {
      if (a.status === 'doing' && b.status === 'doing') {
        return b.startTime - a.startTime; // Newest first for active
      }
      return a.startTime - b.startTime; // Oldest first otherwise
    });

    // Group by status
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
  }, [tasks, agentFilter]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  return (
    <>
      <div className="flex gap-3 h-full overflow-x-auto pb-2">
        {TASK_STATUS_COLUMNS.map(status => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
