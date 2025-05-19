#!/usr/bin/env node

// Simple script to initialize the multi-agent system (ES Module version)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧠 Initializing Multi-Agent System 🧠\n');

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.mjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});