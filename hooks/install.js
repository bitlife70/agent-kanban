#!/usr/bin/env node

/**
 * Claude Code Hooks Installer for Agent Kanban
 *
 * This script helps set up Claude Code hooks to integrate with Agent Kanban.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const HOOK_SCRIPT = path.resolve(__dirname, 'claude-hook.js');

// Claude Code settings locations
const SETTINGS_LOCATIONS = {
  global: path.join(os.homedir(), '.claude', 'settings.json'),
  project: path.join(process.cwd(), '.claude', 'settings.json')
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function readSettings(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return {};
}

function writeSettings(filePath, settings) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

function createHooksConfig(hookPath) {
  return {
    PreToolUse: [
      {
        matcher: {},
        hooks: [
          {
            type: 'command',
            command: `node "${hookPath}" pretool`
          }
        ]
      }
    ],
    PostToolUse: [
      {
        matcher: {},
        hooks: [
          {
            type: 'command',
            command: `node "${hookPath}" posttool`
          }
        ]
      }
    ],
    Notification: [
      {
        matcher: {},
        hooks: [
          {
            type: 'command',
            command: `node "${hookPath}" notify`
          }
        ]
      }
    ],
    Stop: [
      {
        matcher: {},
        hooks: [
          {
            type: 'command',
            command: `node "${hookPath}" stop`
          }
        ]
      }
    ]
  };
}

async function install() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     Agent Kanban - Claude Code Hooks Installer        ║
╚═══════════════════════════════════════════════════════╝
`);

  console.log('This will configure Claude Code hooks to report agent status');
  console.log('to your Agent Kanban dashboard.\n');

  // Choose installation scope
  console.log('Installation scope:');
  console.log('  1. Global (all Claude Code sessions)');
  console.log('  2. Project (current directory only)');
  console.log('  3. Cancel\n');

  const choice = await question('Choose an option [1/2/3]: ');

  let settingsPath;
  switch (choice.trim()) {
    case '1':
      settingsPath = SETTINGS_LOCATIONS.global;
      break;
    case '2':
      settingsPath = SETTINGS_LOCATIONS.project;
      break;
    default:
      console.log('Installation cancelled.');
      rl.close();
      return;
  }

  // Read existing settings
  const settings = readSettings(settingsPath);

  // Check if hooks already exist
  if (settings.hooks) {
    console.log('\nExisting hooks configuration found.');
    const overwrite = await question('Merge with existing hooks? [Y/n]: ');
    if (overwrite.toLowerCase() === 'n') {
      console.log('Installation cancelled.');
      rl.close();
      return;
    }
  }

  // Configure server URL
  const defaultServer = process.env.AGENT_KANBAN_SERVER || 'http://localhost:3001';
  const serverUrl = await question(`Server URL [${defaultServer}]: `);

  // Create hooks config
  const newHooks = createHooksConfig(HOOK_SCRIPT);

  // Merge with existing hooks
  if (settings.hooks) {
    for (const hookType of Object.keys(newHooks)) {
      if (settings.hooks[hookType]) {
        // Filter out existing agent-kanban hooks (check both old and new format)
        const filteredHooks = settings.hooks[hookType].filter(h => {
          // New format: check inside hooks array
          if (h.hooks && Array.isArray(h.hooks)) {
            return !h.hooks.some(hook =>
              hook.command && (
                hook.command.includes('claude-hook.js') ||
                hook.command.includes('agent-kanban')
              )
            );
          }
          // Old format: check command directly
          if (h.command) {
            return !h.command.includes('claude-hook.js') &&
                   !h.command.includes('agent-kanban');
          }
          return true;
        });
        // Append new hooks
        settings.hooks[hookType] = [...filteredHooks, ...newHooks[hookType]];
      } else {
        settings.hooks[hookType] = newHooks[hookType];
      }
    }
  } else {
    settings.hooks = newHooks;
  }

  // Write settings
  writeSettings(settingsPath, settings);

  // Create environment file if custom server
  const finalServerUrl = serverUrl.trim() || defaultServer;
  if (finalServerUrl !== 'http://localhost:3001') {
    const envNote = `
Note: You've configured a custom server URL.
Add this to your environment:

  export AGENT_KANBAN_SERVER="${finalServerUrl}"

Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
`;
    console.log(envNote);
  }

  console.log(`
✅ Installation complete!

Settings file: ${settingsPath}
Hook script: ${HOOK_SCRIPT}

Your Claude Code sessions will now report to Agent Kanban.

To verify:
  1. Start the Agent Kanban server: npm run dev
  2. Open a new Claude Code session
  3. Check the dashboard at http://localhost:5173
`);

  rl.close();
}

async function uninstall() {
  console.log('Uninstalling Agent Kanban hooks...\n');

  for (const [scope, settingsPath] of Object.entries(SETTINGS_LOCATIONS)) {
    if (fs.existsSync(settingsPath)) {
      const settings = readSettings(settingsPath);

      if (settings.hooks) {
        let modified = false;

        for (const hookType of Object.keys(settings.hooks)) {
          const originalLength = settings.hooks[hookType].length;
          settings.hooks[hookType] = settings.hooks[hookType].filter(h => {
            // New format: check inside hooks array
            if (h.hooks && Array.isArray(h.hooks)) {
              return !h.hooks.some(hook =>
                hook.command && (
                  hook.command.includes('claude-hook.js') ||
                  hook.command.includes('agent-kanban')
                )
              );
            }
            // Old format: check command directly
            if (h.command) {
              return !h.command.includes('claude-hook.js') &&
                     !h.command.includes('agent-kanban');
            }
            return true;
          });

          if (settings.hooks[hookType].length !== originalLength) {
            modified = true;
          }

          if (settings.hooks[hookType].length === 0) {
            delete settings.hooks[hookType];
          }
        }

        if (Object.keys(settings.hooks).length === 0) {
          delete settings.hooks;
        }

        if (modified) {
          writeSettings(settingsPath, settings);
          console.log(`✅ Removed from ${scope} settings: ${settingsPath}`);
        }
      }
    }
  }

  console.log('\nUninstall complete.');
  rl.close();
}

// Main
const command = process.argv[2];

if (command === 'uninstall' || command === 'remove') {
  uninstall().catch(console.error);
} else {
  install().catch(console.error);
}
