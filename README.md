# Agent Kanban

Multi-agent monitoring dashboard with Kanban view for Claude agents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Real-time Monitoring**: WebSocket-based live updates for agent status changes
- **Kanban Board View**: Organize agents by status (Idle, Working, Waiting, Completed, Error)
- **Agent Hierarchy**: Visualize parent-child relationships in tree view
- **Search & Filter**: Find agents by name, ID, or task description
- **Dark Mode**: Toggle between light and dark themes
- **Statistics Dashboard**: View agent distribution and metrics
- **Toast Notifications**: Get notified of important status changes
- **Keyboard Shortcuts**: Quick access to common actions
- **Claude Code Hooks**: Automatic agent status reporting

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start the application

```bash
npm run dev
```

This starts both the server and frontend:
- **Server**: http://localhost:3001
- **Frontend**: http://localhost:5173

### 3. (Optional) Install Claude Code hooks

```bash
npm run install-hooks
```

This will configure Claude Code to automatically report agent status to the dashboard.

## Claude Code Integration

Agent Kanban integrates with Claude Code through hooks to automatically track agent activity.

### Automatic Setup

Run the interactive installer:

```bash
npm run install-hooks
```

Choose between:
- **Global**: All Claude Code sessions report to Agent Kanban
- **Project**: Only sessions in the current directory

### Manual Setup

Add to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/agent-kanban/hooks/claude-hook.js pretool"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/agent-kanban/hooks/claude-hook.js posttool"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/agent-kanban/hooks/claude-hook.js notify"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/agent-kanban/hooks/claude-hook.js stop"
          }
        ]
      }
    ]
  }
}
```

### Hook Events

| Hook | Trigger | Status |
|------|---------|--------|
| PreToolUse | Before any tool is used | Working |
| PostToolUse | After tool completes | Idle |
| Notification | User input requested | Waiting |
| Stop | Session ends | Completed |

### Uninstall Hooks

```bash
npm run uninstall-hooks
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│                   Kanban Board Dashboard                 │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket (/dashboard)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Server (Node.js)               │
│              - WebSocket Server (Socket.io)              │
│              - REST API (Express)                        │
│              - Agent Registry                            │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket (/agent)
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Claude Code │ │ Claude Code │ │   Custom    │
│  (Hooks)    │ │  (Hooks)    │ │  Reporter   │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Reporter Usage

For custom integrations, use the reporter client directly.

### CLI Commands

```bash
cd reporter

# Register a new agent (stays running)
node reporter.js register "My Agent"

# Update status (one-shot commands)
node reporter.js working "Implementing feature X"
node reporter.js waiting "Waiting for user input"
node reporter.js idle
node reporter.js completed "Task finished"
node reporter.js error "Something went wrong"

# Deregister
node reporter.js deregister
```

### Programmatic Usage

```javascript
const { AgentReporter } = require('./reporter');

const reporter = new AgentReporter({
  name: 'My Agent',
  parentAgentId: process.env.PARENT_AGENT_ID
});

await reporter.connect();
reporter.working('Processing data...');
// ... do work ...
reporter.completed('Done!');
reporter.deregister();
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_KANBAN_SERVER` | Server URL | `http://localhost:3001` |
| `AGENT_ID` | Agent ID | Auto-generated UUID |
| `AGENT_NAME` | Agent display name | `Agent-{id}` |
| `PARENT_AGENT_ID` | Parent agent ID (for sub-agents) | - |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Open Agent Tree View |
| `S` | Open Statistics Panel |
| `/` | Focus Search Input |
| `Ctrl+D` | Toggle Dark Mode |
| `Escape` | Clear Filters / Close Modal |

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| DELETE | `/api/agents/:id` | Remove agent |
| GET | `/api/health` | Health check |

### WebSocket Events

#### Dashboard Namespace (`/dashboard`)

| Event | Direction | Description |
|-------|-----------|-------------|
| `agents:sync` | Server → Client | Full agent list sync |
| `agent:changed` | Server → Client | Single agent update |
| `agent:removed` | Server → Client | Agent removed |

#### Agent Namespace (`/agent`)

| Event | Direction | Description |
|-------|-----------|-------------|
| `agent:register` | Client → Server | Register new agent |
| `agent:update` | Client → Server | Update agent status |
| `agent:heartbeat` | Client → Server | Keep-alive ping |
| `agent:deregister` | Client → Server | Remove agent |

## Project Structure

```
agent-kanban/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── stores/           # Zustand stores
│   │   └── types/            # TypeScript types
│   └── package.json
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── index.ts          # Express + Socket.io server
│   │   ├── agentRegistry.ts  # Agent state management
│   │   └── types.ts          # TypeScript types
│   └── package.json
├── reporter/                 # Agent reporter client
│   ├── reporter.js           # CLI + library
│   └── package.json
├── hooks/                    # Claude Code hooks
│   ├── claude-hook.js        # Hook script
│   ├── install.js            # Installer
│   └── package.json
├── PRD.md                    # Product requirements
└── README.md
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- Socket.io-client (WebSocket)

### Backend
- Node.js + TypeScript
- Express (HTTP server)
- Socket.io (WebSocket server)

### Reporter & Hooks
- Node.js
- Socket.io-client

## Development

### Running individually

```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Building for production

```bash
npm run build
```

## Configuration

### Frontend Environment Variables

Create `.env` file in `frontend/`:

```env
VITE_SERVER_URL=http://localhost:3001
```

### Server Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |

## Troubleshooting

### Connection Issues

1. Ensure the server is running on port 3001
2. Check browser console for WebSocket errors
3. Verify no firewall blocking WebSocket connections

### Agent Not Appearing

1. Check reporter console for connection errors
2. Verify `AGENT_KANBAN_SERVER` environment variable
3. Ensure agent sends heartbeat within 30 seconds

### Hooks Not Working

1. Verify hooks are installed: check `~/.claude/settings.json` or `.claude/settings.json`
2. Ensure the hook script path is correct
3. Check Claude Code console for hook errors
4. Verify server is running before starting Claude Code session

## License

MIT
