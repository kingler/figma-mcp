#!/usr/bin/env node

/**
 * Clean Project Setup Script
 * 
 * This script sets up a clean project with the multi-agent system:
 * 1. Creates a new project directory
 * 2. Copies only the necessary files (.cursor directory and template)
 * 3. Creates a minimal project_description.md file
 * 4. Creates a simple init script instead of modifying package.json
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🧠 Clean Project Setup 🧠\n');
console.log('This utility will create a clean project with the multi-agent system.\n');

rl.question('Project name: ', (projectName) => {
  rl.question('Brief project description: ', (projectDescription) => {
    console.log('\nSetting up clean project: ' + projectName);
    
    // Create project directory
    const projectDir = path.join(process.cwd(), projectName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir);
    }
    
    // Copy only the .cursor directory
    const sourceCursorDir = path.join(process.cwd(), '.cursor');
    const targetCursorDir = path.join(projectDir, '.cursor');
    
    if (fs.existsSync(sourceCursorDir)) {
      copyDirectory(sourceCursorDir, targetCursorDir);
      console.log('Copied .cursor directory to new project');
    }
    
    // Copy template file
    const templateSource = path.join(process.cwd(), 'project_description_template.md');
    const templateTarget = path.join(projectDir, 'project_description_template.md');
    
    if (fs.existsSync(templateSource)) {
      fs.copyFileSync(templateSource, templateTarget);
      console.log('Copied project_description_template.md to new project');
    }
    
    // Create init script instead of package.json
    const initScript = `#!/usr/bin/env node

// Simple script to initialize the multi-agent system
const { spawn } = require('child_process');
const path = require('path');

console.log('🧠 Initializing Multi-Agent System 🧠\\n');

// Path to the main initialization script
const scriptPath = path.join(__dirname, '.cursor', 'agent-system', 'scripts', 'init_agents.js');

// Run the initialization script
const child = spawn('node', [scriptPath], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initialization failed with code ' + code);
  }
});
`;
    
    fs.writeFileSync(path.join(projectDir, 'init-agents.js'), initScript);
    // Make it executable
    fs.chmodSync(path.join(projectDir, 'init-agents.js'), '755');
    console.log('Created init-agents.js script');
    
    // Create minimal project description file with user input
    fs.writeFileSync(
      path.join(projectDir, 'project_description.md'),
      `# ${projectName}\n\n${projectDescription}\n\n` +
      `*This is an initial description. The Orchestrator agent will help you expand it with more details.*\n\n` +
      `## Quick Notes\n\n` +
      `- Add any quick notes about goals or requirements here\n` +
      `- The Orchestrator will help organize these into a proper specification\n`
    );
    console.log('Created project_description.md');
    
    // Create a simple README.md with instructions
    fs.writeFileSync(
      path.join(projectDir, 'README.md'),
      `# ${projectName}\n\n${projectDescription}\n\n` +
      `## Multi-Agent System\n\n` +
      `This project uses Cursor's multi-agent system. To initialize the agents:\n\n` +
      `### Option 1: Using Node.js\n\n` +
      `\`\`\`bash\n` +
      `node init-agents.js\n` +
      `\`\`\`\n\n` +
      `### Option 2: Direct initialization\n\n` +
      `\`\`\`bash\n` +
      `node .cursor/agent-system/scripts/init_agents.js\n` +
      `\`\`\`\n\n` +
      `### Option 3: Manual initialization\n\n` +
      `1. Open the project in Cursor\n` +
      `2. Press ⌘T (or Ctrl+T on Windows/Linux) to create a tab for Orchestrator\n` +
      `3. Select "Orchestrator (Agent 4)" from the custom modes dropdown\n` +
      `4. Enter "start mas-agents" to trigger initialization\n`
    );
    console.log('Created README.md with initialization instructions');
    
    console.log('\nProject structure created successfully!');
    console.log(`\nTo start working with your project:\n`);
    console.log(`cd ${projectName}`);
    console.log(`node init-agents.js`);
    
    rl.close();
  });
});

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