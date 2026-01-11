import { create } from 'zustand';
import { Task, TaskStatus } from '../types/task';

interface TaskStore {
  tasks: Map<string, Task>;

  // Actions
  syncTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  clearTasks: () => void;

  // Selectors
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByAgent: (agentId: string) => Task[];
  getTask: (id: string) => Task | undefined;
  getAllTasks: () => Task[];
  getTaskStats: (agentId?: string) => {
    total: number;
    todo: number;
    doing: number;
    done: number;
    failed: number;
  };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: new Map(),

  syncTasks: (tasks) => {
    const taskMap = new Map<string, Task>();
    tasks.forEach(task => taskMap.set(task.id, task));
    set({ tasks: taskMap });
  },

  updateTask: (task) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.set(task.id, task);
      return { tasks: newTasks };
    });
  },

  removeTask: (taskId) => {
    set((state) => {
      const newTasks = new Map(state.tasks);
      newTasks.delete(taskId);
      return { tasks: newTasks };
    });
  },

  clearTasks: () => {
    set({ tasks: new Map() });
  },

  getTasksByStatus: (status) => {
    return Array.from(get().tasks.values()).filter(t => t.status === status);
  },

  getTasksByAgent: (agentId) => {
    return Array.from(get().tasks.values()).filter(t => t.agentId === agentId);
  },

  getTask: (id) => {
    return get().tasks.get(id);
  },

  getAllTasks: () => {
    return Array.from(get().tasks.values());
  },

  getTaskStats: (agentId) => {
    const tasks = agentId
      ? get().getTasksByAgent(agentId)
      : get().getAllTasks();

    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      doing: tasks.filter(t => t.status === 'doing').length,
      done: tasks.filter(t => t.status === 'done').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }
}));
