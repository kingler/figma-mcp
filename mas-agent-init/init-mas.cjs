#!/usr/bin/env node

/**
 * Multi-Agent System Integration Helper (CommonJS version)
 * 
 * This script helps integrate the multi-agent system into an existing project
 * by running the initialization script with the correct context.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n🧠 Multi-Agent System Integration 🧠\n');
console.log('Initializing multi-agent system for your project...\n');

// First, let's find the ESM initialization script
const esModulePath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.mjs');
const commonJSPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.js');

let scriptPath;
if (fs.existsSync(esModulePath)) {
  scriptPath = esModulePath;
} else if (fs.existsSync(commonJSPath)) {
  scriptPath = commonJSPath;
} else {
  console.error(`Error: Initialization script not found at either ${esModulePath} or ${commonJSPath}`);
  console.error('Make sure you have properly set up the Multi-Agent System files in your project.');
  process.exit(1);
}

// Run the initialization script
const child = spawn('node', [scriptPath], {
  stdio: 'inherit', // This ensures output from the child process appears in the parent's console
  cwd: process.cwd() // Run in the current working directory
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Initialization script exited with code ${code}`);
  } else {
    console.log('\n✅ Multi-Agent System successfully initialized!\n');
    console.log('You can now interact with the agents in Cursor.');
  }
}); 