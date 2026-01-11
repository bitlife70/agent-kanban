import { Task, TaskStatus, TaskStatusChange } from './types';

const MAX_STATUS_HISTORY = 20;

export class TaskRegistry {
  private tasks: Map<string, Task> = new Map();
  private onTaskChange?: (task: Task) => void;
  private onTaskRemove?: (taskId: string) => void;
  private onAgentTaskEvent?: (agentId: string, event: {
    type: 'task_created' | 'task_started' | 'task_completed' | 'task_failed';
    taskId: string;
    description: string;
  }) => void;

  setCallbacks(
    onTaskChange: (task: Task) => void,
    onTaskRemove: (taskId: string) => void,
    onAgentTaskEvent?: (agentId: string, event: {
      type: 'task_created' | 'task_started' | 'task_completed' | 'task_failed';
      taskId: string;
      description: string;
    }) => void
  ) {
    this.onTaskChange = onTaskChange;
    this.onTaskRemove = onTaskRemove;
    this.onAgentTaskEvent = onAgentTaskEvent;
  }

  create(
    taskId: string,
    agentId: string,
    title: string,
    prompt: string,
    initialStatus: TaskStatus = 'doing'
  ): Task {
    const now = Date.now();

    const task: Task = {
      id: taskId,
      agentId,
      title,
      prompt,
      status: initialStatus,
      startTime: now,
      statusHistory: []
    };

    this.tasks.set(taskId, task);
    this.onTaskChange?.(task);

    // 에이전트에 이벤트 알림
    this.onAgentTaskEvent?.(agentId, {
      type: 'task_created',
      taskId,
      description: `Task "${title}" 생성됨`
    });

    console.log(`[TaskRegistry] Task created: ${taskId} for agent ${agentId}`);
    return task;
  }

  updateStatus(
    taskId: string,
    status: TaskStatus,
    result?: string,
    outputLink?: string
  ): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.log(`[TaskRegistry] Task not found: ${taskId}`);
      return null;
    }

    const now = Date.now();
    const oldStatus = task.status;

    // 상태 변경 이력 추가
    if (oldStatus !== status) {
      const change: TaskStatusChange = {
        from: oldStatus,
        to: status,
        timestamp: now
      };
      task.statusHistory.push(change);

      // 이력 개수 제한
      if (task.statusHistory.length > MAX_STATUS_HISTORY) {
        task.statusHistory = task.statusHistory.slice(-MAX_STATUS_HISTORY);
      }
    }

    task.status = status;

    if (result !== undefined) {
      task.result = result;
    }

    if (outputLink !== undefined) {
      task.outputLink = outputLink;
    }

    // 완료/실패 시 종료 시간 기록
    if (status === 'done' || status === 'failed') {
      task.endTime = now;

      // 에이전트에 이벤트 알림
      const eventType = status === 'done' ? 'task_completed' : 'task_failed';
      const eventDesc = status === 'done'
        ? `Task "${task.title}" 완료됨`
        : `Task "${task.title}" 실패`;

      this.onAgentTaskEvent?.(task.agentId, {
        type: eventType,
        taskId,
        description: eventDesc
      });
    } else if (status === 'doing' && oldStatus === 'todo') {
      // todo -> doing 전환 시 시작 이벤트
      this.onAgentTaskEvent?.(task.agentId, {
        type: 'task_started',
        taskId,
        description: `Task "${task.title}" 시작됨`
      });
    }

    this.onTaskChange?.(task);
    console.log(`[TaskRegistry] Task ${taskId} status: ${oldStatus} -> ${status}`);
    return task;
  }

  updateResult(taskId: string, result: string, outputLink?: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.result = result;
    if (outputLink !== undefined) {
      task.outputLink = outputLink;
    }

    this.onTaskChange?.(task);
    return task;
  }

  delete(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.tasks.delete(taskId);
    this.onTaskRemove?.(taskId);
    console.log(`[TaskRegistry] Task deleted: ${taskId}`);
    return true;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByAgent(agentId: string): Task[] {
    return this.getAllTasks().filter(task => task.agentId === agentId);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  // 에이전트의 진행률 계산 (완료된 Task / 전체 Task * 100)
  calculateAgentProgress(agentId: string): number {
    const agentTasks = this.getTasksByAgent(agentId);
    if (agentTasks.length === 0) return 0;

    const completedTasks = agentTasks.filter(t => t.status === 'done').length;
    return Math.round((completedTasks / agentTasks.length) * 100);
  }

  // 에이전트의 Task 통계
  getAgentTaskStats(agentId: string): {
    total: number;
    todo: number;
    doing: number;
    done: number;
    failed: number;
  } {
    const agentTasks = this.getTasksByAgent(agentId);
    return {
      total: agentTasks.length,
      todo: agentTasks.filter(t => t.status === 'todo').length,
      doing: agentTasks.filter(t => t.status === 'doing').length,
      done: agentTasks.filter(t => t.status === 'done').length,
      failed: agentTasks.filter(t => t.status === 'failed').length
    };
  }

  // 에이전트 삭제 시 연관 Task도 삭제
  deleteTasksByAgent(agentId: string): void {
    const agentTasks = this.getTasksByAgent(agentId);
    for (const task of agentTasks) {
      this.delete(task.id);
    }
    console.log(`[TaskRegistry] Deleted ${agentTasks.length} tasks for agent ${agentId}`);
  }
}

export const taskRegistry = new TaskRegistry();
