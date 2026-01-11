export type AgentStatus = 'idle' | 'working' | 'waiting' | 'completed' | 'error';

// Task 상태 타입
export type TaskStatus = 'todo' | 'doing' | 'done' | 'failed';

export interface TerminalInfo {
  pid?: number;
  cwd?: string;
  sessionId?: string;
}

// 세션 이벤트 (최근 활동 기록)
export interface SessionEvent {
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_failed' | 'status_changed';
  timestamp: number;
  description: string;
  taskId?: string;
}

// Task 상태 변경 이력
export interface TaskStatusChange {
  from: TaskStatus;
  to: TaskStatus;
  timestamp: number;
}

// Task 데이터 모델
export interface Task {
  id: string;
  agentId: string;           // 소속 세션(에이전트)
  title: string;             // 프롬프트 요약
  prompt: string;            // 입력 프롬프트 전문
  status: TaskStatus;
  result?: string;           // 결과 요약
  outputLink?: string;       // 출력물 링크
  startTime: number;
  endTime?: number;
  statusHistory: TaskStatusChange[];
}

export interface Agent {
  id: string;
  name: string;
  prompt?: string;
  status: AgentStatus;
  taskDescription: string;
  startTime: number;
  lastActivity: number;
  parentAgentId?: string;
  children: string[];
  terminalInfo: TerminalInfo;
  // 세션 대시보드 필드 (하이브리드 방식)
  goal?: string;              // 현재 목표
  progress: number;           // 전체 진행률 0-100 (자동 계산)
  blocker?: string;           // 현재 블로커
  nextAction?: string;        // 다음 액션
  recentEvents: SessionEvent[]; // 최근 이벤트 (최대 5개)
  taskIds: string[];          // 소속 Task ID 목록
}

export interface AgentMessage {
  type: 'register' | 'status_update' | 'heartbeat' | 'deregister';
  agentId: string;
  parentAgentId?: string;
  timestamp: number;
  payload: {
    name?: string;
    prompt?: string;
    status?: AgentStatus;
    taskDescription?: string;
    progress?: number;
    terminalInfo?: TerminalInfo;
    metadata?: Record<string, unknown>;
    // 세션 대시보드 필드
    goal?: string;
    blocker?: string;
    nextAction?: string;
  };
}

// Task 관련 메시지
export interface TaskMessage {
  type: 'task_create' | 'task_update' | 'task_complete' | 'task_fail';
  taskId: string;
  agentId: string;
  timestamp: number;
  payload: {
    title?: string;
    prompt?: string;
    status?: TaskStatus;
    result?: string;
    outputLink?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ServerToClientEvents {
  'agents:sync': (agents: Agent[]) => void;
  'agent:changed': (agent: Agent) => void;
  'agent:removed': (agentId: string) => void;
  // Task 이벤트
  'tasks:sync': (tasks: Task[]) => void;
  'task:changed': (task: Task) => void;
  'task:removed': (taskId: string) => void;
}

export interface ClientToServerEvents {
  'subscribe': () => void;
  'unsubscribe': () => void;
}

export interface AgentToServerEvents {
  'agent:register': (message: AgentMessage) => void;
  'agent:update': (message: AgentMessage) => void;
  'agent:heartbeat': (message: AgentMessage) => void;
  'agent:deregister': (message: AgentMessage) => void;
  // Task 이벤트
  'task:create': (message: TaskMessage) => void;
  'task:update': (message: TaskMessage) => void;
}
