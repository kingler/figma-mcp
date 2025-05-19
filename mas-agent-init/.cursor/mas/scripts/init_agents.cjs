#!/usr/bin/env node

/**
 * Multi-Agent System Initializer
 * 
 * This script initializes the multi-agent system in Cursor by:
 * 1. Creating the necessary directory structure
 * 2. Opening Cursor with the appropriate agent tabs
 * 3. Setting up the initial project context
 * 
 * This script does not require a package.json file to run.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const agentModes = [
  { name: 'Orchestrator (Agent 4)', id: 'orchestrator', shortcut: 'alt+4' },
  { name: 'System Architect (Agent 1)', id: 'system-architect', shortcut: 'alt+1' },
  { name: 'Development Agent (Agent 2)', id: 'development-agent', shortcut: 'alt+2' },
  { name: 'UX Agent (Agent 3)', id: 'ux-agent', shortcut: 'alt+3' }
];

console.log('\n🧠 Multi-Agent System Initializer 🧠\n');
console.log('This utility will help you set up the Multi-Agent System in Cursor.\n');

// Check if this is a new project or existing one
rl.question('Is this a new project? (y/n): ', (isNewProject) => {
  if (isNewProject.toLowerCase() === 'y') {
    setupNewProject();
  } else {
    setupExistingProject();
  }
});

function setupNewProject() {
  rl.question('Project name: ', (projectName) => {
    rl.question('Brief project description: ', (projectDescription) => {
      console.log('\nSetting up new project: ' + projectName);
      
      // Create project directory
      const projectDir = path.join(process.cwd(), projectName);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir);
      }
      
      // Copy files from current directory to new project directory
      const filesToCopy = [
        'project_description_template.md',
        '.cursor'
      ];
      
      filesToCopy.forEach(item => {
        const sourcePath = path.join(process.cwd(), item);
        if (fs.existsSync(sourcePath)) {
          if (fs.lstatSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, path.join(projectDir, item));
          } else {
            fs.copyFileSync(sourcePath, path.join(projectDir, item));
          }
          console.log(`Copied ${item} to new project`);
        }
      });
      
      // Create directory structure
      createDirectoryStructure(projectDir);
      
      // Create minimal project description file with user input
      fs.writeFileSync(
        path.join(projectDir, 'project_description.md'),
        `# ${projectName}\n\n${projectDescription}\n\n` +
        `*This is an initial description. The Orchestrator agent will help you expand it with more details.*\n\n` +
        `## Quick Notes\n\n` +
        `- Add any quick notes about goals or requirements here\n` +
        `- The Orchestrator will help organize these into a proper specification\n`
      );
      
      // Create both CommonJS and ES Module initialization scripts
      const cjsScript = `#!/usr/bin/env node

// Simple script to initialize the multi-agent system (CommonJS version)
const { spawn } = require('child_process');
const path = require('path');

console.log('🧠 Initializing Multi-Agent System 🧠\\n');

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.cjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});
`;
      
      const esmScript = `#!/usr/bin/env node

// Simple script to initialize the multi-agent system (ES Module version)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🧠 Initializing Multi-Agent System 🧠\\n');

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.cjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});
`;
      
      fs.writeFileSync(path.join(projectDir, 'init-agents.cjs'), cjsScript);
      fs.writeFileSync(path.join(projectDir, 'init-agents.mjs'), esmScript);
      
      // Make them executable
      try {
        fs.chmodSync(path.join(projectDir, 'init-agents.cjs'), '755');
        fs.chmodSync(path.join(projectDir, 'init-agents.mjs'), '755');
        console.log('Created initialization scripts (both CommonJS and ES Module versions)');
      } catch (error) {
        console.log('Note: Could not make the scripts executable. You can still run them with "node init-agents.cjs" or "node init-agents.mjs"');
      }
      
      // Create a simple README with instructions
      fs.writeFileSync(
        path.join(projectDir, 'README.md'),
        `# ${projectName}\n\n${projectDescription}\n\n` +
        `## Multi-Agent System\n\n` +
        `This project uses Cursor's multi-agent system. To initialize the agents:\n\n` +
        `### Option 1: For CommonJS projects\n\n` +
        `\`\`\`bash\n` +
        `node init-agents.cjs\n` +
        `\`\`\`\n\n` +
        `### Option 2: For ES Module projects\n\n` +
        `\`\`\`bash\n` +
        `node init-agents.mjs\n` +
        `\`\`\`\n\n` +
        `### Option 3: Direct initialization\n\n` +
        `\`\`\`bash\n` +
        `node .cursor/agent-system/scripts/init_agents.cjs\n` +
        `\`\`\`\n\n` +
        `### Option 4: Manual initialization\n\n` +
        `1. Open the project in Cursor\n` +
        `2. Press ⌘T (or Ctrl+T on Windows/Linux) to create a tab for Orchestrator\n` +
        `3. Select "Orchestrator (Agent 4)" from the custom modes dropdown\n` +
        `4. Enter "start mas-agents" to trigger initialization\n`
      );
      
      console.log('\nProject structure created successfully!');
      console.log('\nLaunching Cursor with agent tabs...');
      
      // Launch Cursor with the project
      launchCursorWithAgents(projectDir);
    });
  });
}

// Helper function to copy directories recursively
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function setupExistingProject() {
  console.log('\nSetting up multi-agent system for existing project...');
  
  // Check if we're already in a project directory
  const currentDir = process.cwd();
  
  // Create necessary directories if they don't exist
  createDirectoryStructure(currentDir);
  
  // Create both CommonJS and ES Module initialization scripts
  const cjsScript = `#!/usr/bin/env node

// Simple script to initialize the multi-agent system (CommonJS version)
const { spawn } = require('child_process');
const path = require('path');

console.log('🧠 Initializing Multi-Agent System 🧠\\n');

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.cjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});
`;
  
  const esmScript = `#!/usr/bin/env node

// Simple script to initialize the multi-agent system (ES Module version)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🧠 Initializing Multi-Agent System 🧠\\n');

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.cjs');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});
`;
  
  fs.writeFileSync(path.join(currentDir, 'init-agents.cjs'), cjsScript);
  fs.writeFileSync(path.join(currentDir, 'init-agents.mjs'), esmScript);
  
  // Make them executable
  try {
    fs.chmodSync(path.join(currentDir, 'init-agents.cjs'), '755');
    fs.chmodSync(path.join(currentDir, 'init-agents.mjs'), '755');
    console.log('Created initialization scripts (both CommonJS and ES Module versions)');
  } catch (error) {
    console.log('Note: Could not make the scripts executable. You can still run them with "node init-agents.cjs" or "node init-agents.mjs"');
  }
  
  console.log('\nLaunching Cursor with agent tabs...');
  
  // Launch Cursor with the project
  launchCursorWithAgents(currentDir);
}

function createDirectoryStructure(baseDir) {
  // Create .cursor/agent-system directory structure if it doesn't exist
  const dirs = [
    '.cursor',
    '.cursor/agent-system',
    '.cursor/agent-system/shared',
    '.cursor/agent-system/shared/communication',
    '.cursor/agent-system/shared/memory-bank',
    '.cursor/agent-system/shared/memory-bank/core',
    '.cursor/agent-system/rules',
    '.cursor/agent-system/workspace',
    '.cursor/agent-system/templates',
    '.cursor/agent-system/scripts'
  ];
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Create initial Memory Bank files
  const initialFiles = [
    { 
      path: '.cursor/agent-system/shared/memory-bank/core/projectbrief.md',
      content: '# Project Brief\n\nThis document will be populated by the Orchestrator Agent based on your project description.\n'
    },
    { 
      path: '.cursor/agent-system/shared/memory-bank/core/activeContext.md',
      content: '# Active Context\n\nCurrent focus: System initialization\n\nThe multi-agent system is being set up. The Orchestrator will guide the process.\n'
    },
    { 
      path: '.cursor/agent-system/shared/agent_chat.md',
      content: '# Agent Chat\n\n[System] Multi-Agent System initialized. Agents can communicate in this file.\n'
    }
  ];
  
  initialFiles.forEach(file => {
    const filePath = path.join(baseDir, file.path);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      console.log(`Created file: ${file.path}`);
    }
  });
  
  // Handle project description file
  const projectDescPath = path.join(baseDir, 'project_description.md');
  const templatePath = path.join(baseDir, 'project_description_template.md');
  
  // If project description doesn't exist but template does, copy from template
  if (!fs.existsSync(projectDescPath) && fs.existsSync(templatePath)) {
    // Create a simplified version from the template
    const template = fs.readFileSync(templatePath, 'utf8');
    const simplified = template
      .replace(/# Project Description Template/, '# Project Description')
      .replace(/Use this template to create a comprehensive project description.*/, 
        '*Complete this file with your project details, or let the Orchestrator agent help you generate it based on a brief description.*')
      .replace(/## Tips for Writing Effective Project Descriptions[\s\S]*$/, '');
    
    fs.writeFileSync(projectDescPath, simplified);
    console.log('Created project_description.md from template');
  }
  
  // Create initial instruction for the Orchestrator
  const orchestratorInstructions = path.join(baseDir, '.cursor/agent-system/shared/orchestrator_instructions.md');
  if (!fs.existsSync(orchestratorInstructions)) {
    fs.writeFileSync(
      orchestratorInstructions,
      '# Orchestrator Instructions\n\n' +
      'You are the Orchestrator Agent in the Multi-Agent System. Your first tasks are:\n\n' +
      '1. Check the project_description.md file\n' +
      '   - If it\'s incomplete, help the user fill it out with proper details\n' +
      '   - If needed, interview the user to gather requirements\n' +
      '2. Create a comprehensive project brief in .cursor/agent-system/shared/memory-bank/core/projectbrief.md\n' +
      '3. Initialize the System Architect to design the system architecture\n' +
      '4. Initialize the Development Agent to begin implementation planning\n' +
      '5. Initialize the UX Agent to plan the user experience\n' +
      '6. Coordinate and track progress in .cursor/agent-system/shared/memory-bank/core/activeContext.md\n'
    );
    console.log('Created orchestrator instructions');
  }
}

function launchCursorWithAgents(projectDir) {
  // Platform-specific commands to launch Cursor
  let openCommand;
  switch (process.platform) {
    case 'darwin': // macOS
      openCommand = `open -a Cursor "${projectDir}"`;
      break;
    case 'win32': // Windows
      openCommand = `start "" "C:\\Program Files\\Cursor\\Cursor.exe" "${projectDir}"`;
      break;
    default: // Linux
      openCommand = `cursor "${projectDir}"`;
  }
  
  exec(openCommand, (error) => {
    if (error) {
      console.error('Error launching Cursor:', error);
      console.log('\nPlease open Cursor manually and follow these steps:');
      console.log('1. Open the project directory');
      console.log('2. Press ⌘T (or Ctrl+T) to create tabs for each agent');
      console.log('3. Select the appropriate agent mode for each tab');
      rl.close();
      return;
    }
    
    console.log('\nCursor has been launched!');
    console.log('\nNext steps:');
    console.log('1. In Cursor, press ⌘T (or Ctrl+T) to create a new tab');
    console.log('2. Select "Orchestrator (Agent 4)" from the custom modes dropdown');
    console.log('3. The Orchestrator will guide you through the initial setup');
    console.log('4. Create additional agent tabs as needed using ⌘T');
    
    rl.close();
  });
}

module.exports = {
  setupNewProject,
  setupExistingProject,
  createDirectoryStructure,
  launchCursorWithAgents
}; 