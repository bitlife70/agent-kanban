#!/usr/bin/env node

/**
 * Agent Kanban Setup Script
 *
 * Run this in any project folder to enable Agent Kanban monitoring.
 * Usage: npx agent-kanban-setup
 *        or: node /path/to/agent-kanban/bin/agent-kanban-setup.js
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const readline = require('readline');
const http = require('http');

// Configuration
const AGENT_KANBAN_ROOT = path.resolve(__dirname, '..');
const SERVER_PORT = 3001;
const DASHBOARD_PORT = 5173;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  yes: args.includes('-y') || args.includes('--yes'),
  help: args.includes('-h') || args.includes('--help'),
  noBrowser: args.includes('--no-browser'),
  status: args.includes('--status')
};

// Show help
function showHelp() {
  console.log(`
${colors.cyan}Agent Kanban Setup${colors.reset}
Enable Claude agent monitoring for your project.

${colors.bright}Usage:${colors.reset}
  agent-kanban-setup [options]

${colors.bright}Options:${colors.reset}
  -y, --yes        Skip confirmation prompt (auto-yes)
  --no-browser     Don't open dashboard in browser
  --status         Check if server is running
  -h, --help       Show this help message

${colors.bright}Examples:${colors.reset}
  # Interactive setup
  agent-kanban-setup

  # Non-interactive setup (for scripts)
  agent-kanban-setup -y

  # Check server status
  agent-kanban-setup --status

${colors.bright}From other projects (Windows):${colors.reset}
  ${AGENT_KANBAN_ROOT.replace(/\\/g, '\\\\')}\\bin\\setup.cmd

${colors.bright}From other projects (Unix/Mac):${colors.reset}
  ${AGENT_KANBAN_ROOT}/bin/setup.sh

${colors.dim}Server: ${SERVER_URL}
Dashboard: ${DASHBOARD_URL}${colors.reset}
`);
}

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logError(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

// Ask user a yes/no question
function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${colors.yellow}?${colors.reset} ${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Check if server is running
function checkServerRunning() {
  return new Promise((resolve) => {
    http.get(`${SERVER_URL}/api/agents`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Start the server
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(AGENT_KANBAN_ROOT, 'server');

    // Check if server is built
    const distPath = path.join(serverPath, 'dist', 'index.js');
    if (!fs.existsSync(distPath)) {
      logStep('Build', 'Building server...');
      const isWindows = process.platform === 'win32';
      exec(isWindows ? 'npm.cmd run build' : 'npm run build', { cwd: serverPath }, (err) => {
        if (err) {
          reject(new Error('Failed to build server'));
          return;
        }
        spawnServer();
      });
    } else {
      spawnServer();
    }

    function spawnServer() {
      logStep('Server', 'Starting Agent Kanban server...');

      const isWindows = process.platform === 'win32';
      const server = spawn(isWindows ? 'npm.cmd' : 'npm', ['start'], {
        cwd: serverPath,
        detached: true,
        stdio: 'ignore',
        shell: isWindows
      });

      server.unref();

      // Wait for server to be ready
      let attempts = 0;
      const maxAttempts = 30;
      const checkInterval = setInterval(async () => {
        attempts++;
        if (await checkServerRunning()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Server failed to start within timeout'));
        }
      }, 500);
    }
  });
}

// Get hooks configuration
function getHooksConfig() {
  const hookScriptPath = path.join(AGENT_KANBAN_ROOT, 'hooks', 'claude-hook.js');
  const absoluteHookPath = hookScriptPath.replace(/\\/g, '/');

  return {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "",
          "hooks": [
            { "type": "command", "command": `node "${absoluteHookPath}" pretool` }
          ]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "",
          "hooks": [
            { "type": "command", "command": `node "${absoluteHookPath}" posttool` }
          ]
        }
      ],
      "Notification": [
        {
          "matcher": "",
          "hooks": [
            { "type": "command", "command": `node "${absoluteHookPath}" notify` }
          ]
        }
      ],
      "Stop": [
        {
          "matcher": "",
          "hooks": [
            { "type": "command", "command": `node "${absoluteHookPath}" stop` }
          ]
        }
      ]
    }
  };
}

// Setup hooks in project
async function setupHooks(projectPath) {
  const claudeDir = path.join(projectPath, '.claude');
  const settingsFile = path.join(claudeDir, 'settings.local.json');

  // Create .claude directory if not exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
    logStep('Setup', 'Created .claude directory');
  }

  // Read existing settings or create new
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch (e) {
      settings = {};
    }
  }

  // Merge hooks configuration
  const hooksConfig = getHooksConfig();
  settings = { ...settings, ...hooksConfig };

  // Write settings
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  logSuccess(`Hooks configured in ${settingsFile}`);
}

// Open browser
function openBrowser(url) {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  let command;
  if (isWindows) {
    command = `start "" "${url}"`;
  } else if (isMac) {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      log(`Open dashboard manually: ${url}`, colors.dim);
    }
  });
}

// Show status
async function showStatus() {
  const running = await checkServerRunning();
  console.log('');
  log('Agent Kanban Status', colors.cyan);
  console.log('');
  if (running) {
    logSuccess(`Server is running at ${SERVER_URL}`);
    log(`Dashboard: ${DASHBOARD_URL}`, colors.dim);
  } else {
    logError('Server is not running');
    log(`Run 'agent-kanban-setup' to start`, colors.dim);
  }
  console.log('');
}

// Main setup function
async function main() {
  // Handle help
  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  // Handle status check
  if (flags.status) {
    await showStatus();
    process.exit(0);
  }

  const projectPath = process.cwd();
  const projectName = path.basename(projectPath);

  console.log('');
  log('╔══════════════════════════════════════════════╗', colors.cyan);
  log('║       Agent Kanban Setup                     ║', colors.cyan);
  log('║   Multi-Agent Monitoring Dashboard           ║', colors.cyan);
  log('╚══════════════════════════════════════════════╝', colors.cyan);
  console.log('');
  log(`Project: ${projectName}`, colors.dim);
  log(`Path: ${projectPath}`, colors.dim);
  console.log('');

  // Ask if user wants to use Agent Kanban (skip if -y flag)
  let useKanban = flags.yes;
  if (!useKanban) {
    useKanban = await askQuestion('Enable Agent Kanban monitoring for this project?');
  }

  if (!useKanban) {
    log('Setup cancelled.', colors.dim);
    process.exit(0);
  }

  console.log('');

  try {
    // Step 1: Check if server is already running
    logStep('1/4', 'Checking server status...');
    const serverRunning = await checkServerRunning();

    if (serverRunning) {
      logSuccess('Server is already running');
    } else {
      // Step 2: Start server
      logStep('2/4', 'Starting server...');
      await startServer();
      logSuccess('Server started successfully');
    }

    // Step 3: Setup hooks
    logStep('3/4', 'Configuring Claude Code hooks...');
    await setupHooks(projectPath);

    // Step 4: Open dashboard (unless --no-browser)
    if (!flags.noBrowser) {
      logStep('4/4', 'Opening dashboard...');
      openBrowser(DASHBOARD_URL);
      logSuccess('Dashboard opened');
    } else {
      logStep('4/4', 'Skipping browser open');
    }

    console.log('');
    log('═══════════════════════════════════════════════', colors.green);
    log('  Agent Kanban is now active!', colors.green);
    log('═══════════════════════════════════════════════', colors.green);
    console.log('');
    log(`Dashboard: ${DASHBOARD_URL}`, colors.cyan);
    log(`Server:    ${SERVER_URL}`, colors.cyan);
    console.log('');
    log('All Claude agents in this project will now be monitored.', colors.dim);
    log('Start Claude Code to begin tracking!', colors.dim);
    console.log('');

  } catch (error) {
    console.log('');
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
