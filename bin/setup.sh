#!/bin/bash
# Agent Kanban Quick Setup for Unix/Mac
# Run this from any project folder to enable monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/agent-kanban-setup.js" "$@"
