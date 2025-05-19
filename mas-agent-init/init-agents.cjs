#!/usr/bin/env node

// Simple script to initialize the multi-agent system (CommonJS version)
const { spawn } = require('child_process');
const path = require('path');

console.log('🧠 Initializing Multi-Agent System 🧠\n');

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.cjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
}); 