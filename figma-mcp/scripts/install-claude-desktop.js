#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Define config file paths based on OS
const configPaths = {
  darwin: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
  win32: path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
  linux: path.join(os.homedir(), '.config/Claude/claude_desktop_config.json')
};

// Get the absolute path to the index.js file
const indexPath = path.resolve(__dirname, '..', 'index.js');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get Figma API token from user
function getFigmaToken() {
  return new Promise((resolve) => {
    rl.question('Enter your Figma API token: ', (token) => {
      if (!token || token.trim() === '') {
        console.log('A Figma API token is required.');
        return getFigmaToken().then(resolve);
      }
      resolve(token.trim());
    });
  });
}

// Function to update or create the config
async function updateConfig() {
  try {
    const configPath = configPaths[process.platform];
    
    if (!configPath) {
      console.error(`Unsupported platform: ${process.platform}`);
      rl.close();
      return;
    }
    
    console.log(`Using config path: ${configPath}`);
    
    // Check if config directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      console.log(`Creating config directory: ${configDir}`);
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Get Figma token from user
    const figmaToken = await getFigmaToken();
    
    // Read existing config or create new one
    let config = { mcpServers: {} };
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configData);
        if (!config.mcpServers) {
          config.mcpServers = {};
        }
      } catch (err) {
        console.warn(`Error reading config file: ${err.message}`);
        console.log('Creating a new config file.');
      }
    }
    
    // Update config with our server
    config.mcpServers.figma = {
      command: 'node',
      args: [indexPath],
      env: {
        FIGMA_ACCESS_TOKEN: figmaToken
      }
    };
    
    // Write config back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`
✅ Configuration updated successfully!

The Figma MCP server has been added to Claude Desktop.
- Config file: ${configPath}
- Server path: ${indexPath}

Please restart Claude Desktop for the changes to take effect.
    `);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    rl.close();
  }
}

// Main execution
console.log(`
--------------------------------------
Figma MCP Server - Claude Desktop Setup
--------------------------------------

This script will install the Figma MCP server in your Claude Desktop configuration.

Make sure you have:
1. A valid Figma API token
2. Claude Desktop installed
`);

updateConfig(); 