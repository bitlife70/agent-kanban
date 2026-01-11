# Agent Kanban - Development Progress

## Project Overview
여러 터미널에서 동시에 실행되는 Claude 에이전트들을 칸반 보드 형식으로 실시간 모니터링하고 관리할 수 있는 통합 대시보드 도구.

## Current Status: Phase 4 완료 (하이브리드 칸반 보드)

### Completed Phases

#### Phase 1-3: 기본 기능 (완료)
- WebSocket 서버 구현
- 에이전트 레지스트리
- 칸반 보드 UI (5개 컬럼: Idle, Working, Waiting, Completed, Error)
- 에이전트 카드 컴포넌트
- 실시간 상태 반영
- 다크 모드
- 필터링 및 검색
- 에이전트 계층 구조 시각화

#### Phase 4: 하이브리드 방식 전환 (완료 - 2025-01-11)
ChatGPT 추천에 따라 "세션 대시보드 + Task 칸반" 하이브리드 방식 구현

**구현 내용:**

1. **백엔드 데이터 모델 (Phase 4-1)**
   - `server/src/types.ts` - Task, SessionEvent, TaskStatusChange 타입 추가
   - `server/src/taskRegistry.ts` - Task CRUD 및 Agent 연동
   - `server/src/agentRegistry.ts` - 세션 대시보드 필드 확장 (goal, progress, blocker, nextAction, recentEvents, taskIds)

2. **WebSocket 이벤트 (Phase 4-2)**
   - `server/src/index.ts` - Task 이벤트 핸들러 + REST API
   - 이벤트: task:create, task:update, tasks:sync, task:changed, task:removed

3. **프론트엔드 타입/Store (Phase 4-3)**
   - `frontend/src/types/task.ts` - Task 타입 정의
   - `frontend/src/types/agent.ts` - SessionEvent, 세션 필드 확장
   - `frontend/src/stores/taskStore.ts` - Task 상태 관리 (Zustand)

4. **WebSocket 훅 (Phase 4-4)**
   - `frontend/src/hooks/useWebSocket.ts` - Task 이벤트 리스너 추가

5. **UI 컴포넌트 (Phase 4-5~4-7)**
   - `frontend/src/components/TaskCard.tsx` - Task 카드
   - `frontend/src/components/TaskColumn.tsx` - Task 컬럼
   - `frontend/src/components/TaskKanbanBoard.tsx` - Task 칸반 보드
   - `frontend/src/components/TaskDetailModal.tsx` - Task 상세 모달
   - `frontend/src/components/HybridKanbanBoard.tsx` - 하이브리드 레이아웃 (2단 구조)
   - `frontend/src/components/AgentCard.tsx` - 세션 필드 표시 추가 (goal, progress bar, blocker, nextAction, taskIds)

6. **Reporter 확장 (Phase 4-8)**
   - `reporter/reporter.js` - 세션/Task 명령어 추가
     - goal, blocker, nextaction
     - task:create, task:start, task:done, task:fail

---

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express + Socket.io
- **Reporter/Hooks**: Node.js + Socket.io-client

### Data Models

```typescript
// Agent (Session)
interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'error';
  // Session Dashboard Fields
  goal?: string;
  progress: number;  // 0-100, auto-calculated
  blocker?: string;
  nextAction?: string;
  recentEvents: SessionEvent[];
  taskIds: string[];
  // ...
}

// Task
interface Task {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  status: 'todo' | 'doing' | 'done' | 'failed';
  result?: string;
  outputLink?: string;
  startTime: number;
  endTime?: number;
  statusHistory: TaskStatusChange[];
}
```

### API Endpoints

**Agent API:**
- GET /api/agents
- GET /api/agents/:id
- PATCH /api/agents/:id (goal, blocker, nextAction)
- DELETE /api/agents/:id
- GET /api/agents/:id/tasks

**Task API:**
- GET /api/tasks
- GET /api/tasks?agentId=xxx
- GET /api/tasks/:id
- POST /api/tasks
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id

---

## How to Run

```bash
# Backend
cd server
npm install
npm run build
npm start  # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Reporter (CLI)
cd reporter
node reporter.js register "My Agent"
node reporter.js goal "Implement feature X"
node reporter.js task:create task-1 "Task title" "Task prompt"
node reporter.js task:done task-1 "Completed successfully"
```

---

## Next Steps (Phase 5: 안정화)

- [ ] 에러 핸들링 강화
- [ ] 성능 최적화
- [ ] 문서화
- [ ] Claude Code hooks에서 Task 자동 생성 연동 (hooks/claude-hook.js 확장)

---

## Files Modified/Created in Phase 4

### Backend (server/src/)
- `types.ts` - Task, SessionEvent 타입 추가, Agent 확장
- `taskRegistry.ts` - 신규 생성
- `agentRegistry.ts` - 세션 필드 메서드 추가
- `index.ts` - Task 이벤트 핸들러, REST API 추가

### Frontend (frontend/src/)
- `types/task.ts` - 신규 생성
- `types/agent.ts` - SessionEvent, 세션 필드 추가
- `stores/taskStore.ts` - 신규 생성
- `hooks/useWebSocket.ts` - Task 이벤트 리스너 추가
- `components/TaskCard.tsx` - 신규 생성
- `components/TaskColumn.tsx` - 신규 생성
- `components/TaskKanbanBoard.tsx` - 신규 생성
- `components/TaskDetailModal.tsx` - 신규 생성
- `components/HybridKanbanBoard.tsx` - 신규 생성
- `components/AgentCard.tsx` - 세션 필드 UI 추가
- `App.tsx` - HybridKanbanBoard 사용

### Reporter
- `reporter/reporter.js` - 세션/Task 명령어 추가

### Documentation
- `PRD.md` - 하이브리드 방식 반영 업데이트

---

## Key Features

### Hybrid Kanban Board
- **View Modes**: Hybrid / Sessions / Tasks 전환
- **Session Dashboard**: Goal, Progress bar, Blocker, Next Action, Recent Events
- **Task Kanban**: To Do / Doing / Done / Failed 컬럼
- **Session Filter**: 특정 세션의 Task만 필터링
- **Auto Progress**: Task 완료 시 Session progress 자동 계산

### Real-time Updates
- WebSocket 기반 실시간 동기화
- Task 상태 변경 시 Toast 알림
- Session의 recentEvents 자동 업데이트

---

Last Updated: 2025-01-11
