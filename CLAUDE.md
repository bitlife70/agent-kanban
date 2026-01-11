# Agent Kanban - Development Progress

## Project Overview
여러 터미널에서 동시에 실행되는 Claude 에이전트들을 칸반 보드 형식으로 실시간 모니터링하고 관리할 수 있는 통합 대시보드 도구.

## Current Status: Phase 5 진행 중 (안정화)

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

## Setup for Other Projects

다른 프로젝트에서 Agent Kanban 모니터링을 활성화하려면:

```bash
# Windows (해당 프로젝트 폴더에서 실행)
C:\Users\User\projects\agent-kanban\bin\setup.cmd

# Unix/Mac
/path/to/agent-kanban/bin/setup.sh

# Non-interactive 모드 (자동 Yes)
C:\Users\User\projects\agent-kanban\bin\setup.cmd -y

# 브라우저 열지 않음
C:\Users\User\projects\agent-kanban\bin\setup.cmd -y --no-browser

# 서버 상태 확인
C:\Users\User\projects\agent-kanban\bin\setup.cmd --status
```

### Setup 스크립트 동작

1. Agent Kanban 사용 여부 질문 (y/n)
2. Yes 선택 시:
   - 서버 실행 여부 확인 → 미실행 시 자동 시작
   - `.claude/settings.local.json`에 hooks 설정 자동 추가
   - 대시보드 브라우저에서 열기

### 옵션

| 옵션 | 설명 |
|------|------|
| `-y, --yes` | 질문 건너뛰기 (자동 Yes) |
| `--no-browser` | 브라우저 열지 않음 |
| `--status` | 서버 상태 확인 |
| `-h, --help` | 도움말 |

---

## Phase 5: 안정화 (진행 중 - 2026-01-11)

### 완료된 항목

#### 5-1. 에러 핸들링 강화
- `server/src/errors.ts` - 중앙화된 에러 코드 및 AppError 클래스
- `server/src/index.ts` - 글로벌 에러 핸들러, 404 핸들러, Graceful shutdown
- `frontend/src/stores/agentStore.ts` - 연결 상태 관리 (connecting, connected, disconnected, error)
- `frontend/src/hooks/useWebSocket.ts` - 재연결 시도 카운트, 에러 상태 관리
- `frontend/src/components/ConnectionStatus.tsx` - 재연결 시도 표시, 재시도 버튼
- `frontend/src/components/ErrorBoundary.tsx` - 스택 트레이스 표시, useErrorHandler 훅

#### 5-2. UI 리디자인 (기업형 미니멀 스타일)
- 강렬한 색상 제거, 그레이스케일 기반 디자인
- 좌측 보더 액센트 패턴으로 상태 표시
- 이모지 → 단색 SVG 아이콘으로 교체
- 그라디언트 헤더 제거, 심플한 섹션 헤더
- 컴포넌트: AgentCard, TaskCard, KanbanColumn, TaskColumn, HybridKanbanBoard, ToastContainer, ConnectionStatus, ErrorBoundary

#### 5-3. Task 상태 동기화 버그 수정
- `hooks/claude-hook.js` - processTodoWrite에서 제거된 Todo 감지 및 Task 'failed' 처리
- `hooks/claude-hook.js` - completeIncompleteTasks 함수 추가 (세션 종료 시 미완료 Task 정리)
- 'stop'/'deregister' 훅에서 completeIncompleteTasks 호출

#### 5-4. 음성/소리 알림
- `frontend/src/utils/notifications.ts` - Web Speech API + Web Audio API 알림
- Waiting/Completed/Error 상태 변경 시 소리 + 한국어 음성 알림
- 헤더에 볼륨 조절 UI (Sound/Voice 슬라이더, On/Off 토글)
- 설정 localStorage에 저장

#### 5-5. Setup 스크립트
- `bin/agent-kanban-setup.js` - 다른 프로젝트에서 모니터링 활성화
- `bin/setup.cmd` / `bin/setup.sh` - Windows/Unix 실행 스크립트
- 서버 자동 시작, hooks 설정 자동 추가, 대시보드 열기
- 옵션: `-y`, `--no-browser`, `--status`, `-h`

### 남은 항목

- [ ] 성능 최적화
- [ ] 문서화

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

Last Updated: 2026-01-11
