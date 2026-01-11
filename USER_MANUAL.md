# Agent Kanban 사용자 메뉴얼

## 📋 목차
1. [개요](#개요)
2. [작동 원리](#작동-원리)
3. [설치 및 실행](#설치-및-실행)
4. [사용 방법](#사용-방법)
5. [대시보드 기능](#대시보드-기능)
6. [키보드 단축키](#키보드-단축키)
7. [문제 해결](#문제-해결)

---

## 개요

Agent Kanban은 여러 터미널에서 동시에 실행되는 Claude Code 에이전트들을 실시간으로 모니터링하는 대시보드입니다.

### 주요 기능
- 🎯 **실시간 모니터링**: 여러 Claude 세션을 한눈에 확인
- 📊 **Kanban 보드**: 5가지 상태(Idle, Working, Waiting, Completed, Error)로 구분
- 🔍 **작업 내용 표시**: 각 에이전트가 무엇을 하고 있는지 실시간 확인
- 🌳 **계층 구조**: Sub-agent 관계를 트리뷰로 시각화
- 🌙 **다크모드**: 눈의 피로를 줄이는 테마 지원

---

## 작동 원리

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  브라우저 (대시보드)                   │
│              http://localhost:5173                  │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket 연결
                   ▼
┌─────────────────────────────────────────────────────┐
│               서버 (Node.js + Socket.io)             │
│              http://localhost:3001                  │
└──────────────────┬──────────────────────────────────┘
                   │ WebSocket 메시지
        ┌──────────┼──────────┐
        ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 터미널 1     │ │ 터미널 2     │ │ 터미널 3     │
│ Claude Code │ │ Claude Code │ │ Claude Code │
│   (Hooks)   │ │   (Hooks)   │ │   (Hooks)   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Hook 작동 방식

Claude Code는 특정 이벤트가 발생할 때 Hook 스크립트를 자동 실행합니다:

| Hook 이벤트 | 실행 시점 | 서버로 전송하는 상태 |
|------------|----------|-------------------|
| **UserPromptSubmit** | 사용자가 프롬프트 입력 | 에이전트 이름 설정 |
| **PreToolUse** | 도구 사용 직전 | Working (작업 내용 포함) |
| **PostToolUse** | 도구 사용 완료 | Idle |
| **Notification** | 사용자 입력 대기 | Waiting |
| **Stop** | 세션 종료 | Completed |

### 데이터 흐름

1. **사용자 입력**: "테트리스 게임 만들어줘"
   - UserPromptSubmit Hook 실행
   - 서버에 에이전트 등록 (이름: "테트리스 게임 만들어줘")
   - 대시보드에 카드 생성 (Idle 상태)

2. **Claude가 파일 작성 시작**: `Write` 도구 사용
   - PreToolUse Hook 실행
   - 상태 업데이트: Working
   - 작업 내용: "Writing: tetris.py"
   - 대시보드에서 카드가 Working 컬럼으로 이동

3. **파일 작성 완료**
   - PostToolUse Hook 실행
   - 상태 업데이트: Idle
   - 대시보드에서 카드가 Idle 컬럼으로 이동

4. **세션 종료**
   - Stop Hook 실행
   - 상태 업데이트: Completed
   - 대시보드에서 카드가 Completed 컬럼으로 이동 (삭제되지 않음)

---

## 설치 및 실행

### 1. 의존성 설치

```bash
cd C:\Users\User\projects\agent-kanban
npm run install:all
```

### 2. Claude Code Hooks 설치

```bash
npm run install-hooks
```

설치 옵션 선택:
- **Global (1)**: 모든 Claude Code 세션에서 자동 추적
- **Project (2)**: 현재 디렉토리에서만 추적

### 3. 서버 및 대시보드 실행

```bash
npm run dev
```

자동으로 실행됩니다:
- **서버**: http://localhost:3001
- **대시보드**: http://localhost:5173

### 4. 브라우저에서 대시보드 열기

http://localhost:5173 접속

---

## 사용 방법

### 기본 사용 흐름

1. **대시보드 실행**: `npm run dev`
2. **새 터미널 열기**: 작업하려는 프로젝트 폴더로 이동
3. **Claude Code 시작**: `claude` 명령어 실행
4. **작업 지시**: "React로 Todo 앱 만들어줘" 등 입력
5. **대시보드 확인**: 브라우저에서 실시간으로 진행 상황 확인

### 카드 상태 설명

#### 🔵 Idle (대기)
- Claude가 현재 작업 중이 아님
- 사용자 입력을 기다리거나 이전 작업 완료

#### 🟢 Working (작업 중)
- Claude가 도구를 사용하여 작업 수행 중
- 카드에 현재 작업 내용 표시:
  - `Writing: game.py` - 파일 작성 중
  - `Running: npm install` - 명령 실행 중
  - `Reading: config.json` - 파일 읽기 중
  - `Searching: "game logic"` - 코드 검색 중

#### 🟡 Waiting (대기 중)
- 사용자 입력을 기다림
- 예: 파일 덮어쓰기 확인, 선택지 제공

#### 🟣 Completed (완료)
- Claude 세션이 정상 종료됨
- 작업 이력 확인 가능

#### 🔴 Error (오류)
- 연결 끊김 또는 타임아웃
- 5분 동안 활동이 없으면 자동으로 Error 상태

### 여러 세션 동시 실행

**시나리오**: 3개의 게임을 동시에 만들기

1. **터미널 1**: `claude` 실행 → "테트리스 게임 만들어줘"
2. **터미널 2**: `claude` 실행 → "스네이크 게임 만들어줘"
3. **터미널 3**: `claude` 실행 → "인베이더 게임 만들어줘"

대시보드에 3개의 카드가 각각 표시됩니다:
```
┌─────────────────────────┐
│ 테트리스 게임 만들어줘      │
│ Status: Working          │
│ Writing: tetris.py      │
└─────────────────────────┘

┌─────────────────────────┐
│ 스네이크 게임 만들어줘      │
│ Status: Idle            │
└─────────────────────────┘

┌─────────────────────────┐
│ 인베이더 게임 만들어줘      │
│ Status: Working         │
│ Writing: invader.py     │
└─────────────────────────┘
```

---

## 대시보드 기능

### 1. 카드 클릭 - 상세 정보 모달

카드를 클릭하면 상세 정보 확인:
- 에이전트 ID
- 현재 상태
- 작업 설명
- 시작 시간
- 마지막 활동 시간
- 경과 시간 (실시간 업데이트)
- 터미널 정보 (PID, 작업 디렉토리, 세션 ID)

### 2. 검색 및 필터

**검색바 (`/` 키)**:
- 에이전트 이름으로 검색
- 작업 설명으로 검색
- 디렉토리 경로로 검색

**상태 필터**:
- 특정 상태만 표시 (예: Working만 보기)
- 여러 상태 동시 선택 가능

### 3. 트리뷰 (`T` 키)

Sub-agent 계층 구조 확인:
```
Main Orchestrator (Working)
├── Code Writer (Idle)
│   └── File Editor (Completed)
└── Test Runner (Working)
```

### 4. 통계 패널 (`S` 키)

전체 에이전트 통계:
- 총 에이전트 수
- 상태별 개수
- 활성 에이전트 비율

### 5. 다크모드 (`Ctrl+D`)

밝은 테마 ↔ 어두운 테마 전환

### 6. 연결 상태 표시

우측 상단에 서버 연결 상태 표시:
- 🟢 Connected
- 🔴 Disconnected
- 🟡 Reconnecting...

---

## 키보드 단축키

| 키 | 기능 |
|---|------|
| `T` | 트리뷰 열기/닫기 |
| `S` | 통계 패널 열기/닫기 |
| `/` | 검색창 포커스 |
| `Ctrl+D` | 다크모드 토글 |
| `Esc` | 모달 닫기 / 필터 초기화 |

---

## 문제 해결

### Q1. 카드가 대시보드에 나타나지 않아요

**확인 사항**:
1. 서버가 실행 중인가? → `curl http://localhost:3001/api/health`
2. Hooks가 설치되었나? → `cat ~/.claude/settings.json` 확인
3. 새 Claude 세션인가? → Hooks는 세션 시작 시 로드됨

**해결책**:
```bash
# 1. Hooks 재설치
npm run install-hooks

# 2. 서버 재시작
npm run dev

# 3. Claude 세션 재시작
exit  # Claude 종료
claude  # 새로 시작
```

### Q2. 카드가 Working으로 안 바뀌어요

**원인**: Hook이 실행되지 않거나 session_id 불일치

**확인**:
```bash
# Hook 로그 확인
cat /tmp/agent-kanban-hook.log

# 서버 로그 확인 (터미널에서 npm run dev 실행 중인 곳)
```

**해결책**:
```bash
# 상태 파일 정리
rm -f /tmp/agent-kanban-state*.json

# Claude 재시작
exit
claude
```

### Q3. 여러 개의 중복 카드가 생성돼요

**원인**: 이전 버전 사용 또는 상태 파일 충돌

**해결책**:
```bash
# 1. 최신 버전으로 업데이트
cd C:\Users\User\projects\agent-kanban
git pull origin master

# 2. 서버 재시작
npm run dev

# 3. 모든 상태 파일 삭제
rm -f /tmp/agent-kanban-state*.json

# 4. 대시보드에서 모든 에이전트 삭제 (Delete 버튼)
```

### Q4. Error 상태로 바뀌어요

**원인**:
1. 5분 동안 활동 없음 (Heartbeat timeout)
2. 네트워크 연결 끊김

**해결책**:
- Error 카드는 무시하거나 Delete 버튼으로 삭제
- 세션이 활성 상태라면 자동으로 복구됨

### Q5. 카드 제목이 "Claude-test1"로 표시돼요

**원인**: UserPromptSubmit Hook이 실행되지 않음

**확인**:
```bash
# settings.json에 UserPromptSubmit 있는지 확인
cat ~/.claude/settings.json | grep UserPromptSubmit
```

**해결책**:
```bash
# Hooks 재설치
npm run install-hooks

# Claude 재시작
exit
claude
```

---

## 고급 사용법

### 프로그램에서 직접 연동

Reporter 클라이언트를 사용하여 커스텀 프로그램에서 Agent Kanban에 상태 보고:

```javascript
const { AgentReporter } = require('./reporter/reporter.js');

const reporter = new AgentReporter({
  name: 'My Custom Agent',
  parentAgentId: process.env.PARENT_AGENT_ID  // 선택적
});

await reporter.connect();

// 작업 진행
reporter.working('Processing data...');
await doSomeWork();

// 완료
reporter.completed('Done!');
reporter.deregister();
```

### Hooks 제거

```bash
npm run uninstall-hooks
```

---

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **State**: Zustand
- **Real-time**: WebSocket (Socket.io)

---

## 라이선스

MIT

---

## 피드백 및 문의

문제가 발생하거나 제안사항이 있으시면:
- GitHub Issues: https://github.com/bitlife70/agent-kanban/issues

---

**버전**: 1.0.0
**최종 업데이트**: 2026-01-11
