#!/usr/bin/env node

/**
 * Design Token Extractor Example
 * 
 * This example demonstrates how to use the Figma MCP tools
 * to extract design tokens from a Figma file and generate
 * CSS variables or a JSON configuration file.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// File paths
const outputDir = path.join(__dirname, 'output');
const cssOutputPath = path.join(outputDir, 'design-tokens.css');
const jsonOutputPath = path.join(outputDir, 'design-tokens.json');

// Configuration
const config = {
  figmaApiKey: process.env.FIGMA_API_KEY || 'YOUR_FIGMA_API_KEY',
  figmaFileKey: process.env.FIGMA_FILE_KEY || 'FIGMA_FILE_KEY'
};

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Initialize MCP client
function initializeMcpClient() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Show welcome message
  log('===================================', colors.blue);
  log('  Figma Design Token Extractor', colors.blue);
  log('===================================', colors.blue);
  log('');
  
  // Validate config
  if (config.figmaApiKey === 'YOUR_FIGMA_API_KEY') {
    log('Error: Please set your Figma API key via FIGMA_API_KEY environment variable', colors.red);
    process.exit(1);
  }
  
  if (config.figmaFileKey === 'FIGMA_FILE_KEY') {
    log('Error: Please set your Figma file key via FIGMA_FILE_KEY environment variable', colors.red);
    process.exit(1);
  }
  
  log(`Using Figma file key: ${config.figmaFileKey}`, colors.cyan);
  
  // Spawn the CLI process with stdio mode
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  
  log(`Starting Figma MCP Server...`, colors.cyan);
  
  const child = spawn('node', [
    cliPath,
    '--stdio',
    '--figma-api-key', config.figmaApiKey
  ], {
    env: {
      ...process.env,
      FIGMA_ACCESS_TOKEN: config.figmaApiKey,
      NODE_ENV: 'development'
    }
  });
  
  // Handle server process termination
  child.on('close', (code) => {
    if (code !== 0) {
      log(`Figma MCP Server process exited with code ${code}`, colors.red);
    }
  });
  
  return child;
}

// Wait for initial metadata 
function waitForMetadata(child) {
  return new Promise((resolve, reject) => {
    let dataBuffer = '';
    
    function onStdout(data) {
      const chunk = data.toString();
      dataBuffer += chunk;
      
      // Process complete lines
      const lines = dataBuffer.split('\n');
      
      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const response = JSON.parse(line);
          
          if (response.type === 'metadata') {
            log(`Connected to Figma MCP Server ${response.version}`, colors.green);
            child.stdout.removeListener('data', onStdout);
            resolve(response);
            return;
          }
        } catch (err) {
          // Ignore parsing errors for incomplete lines
        }
      }
      
      // Keep the last (potentially incomplete) line
      dataBuffer = lines[lines.length - 1];
    }
    
    // Listen for stdout data
    child.stdout.on('data', onStdout);
    
    // Handle stderr (for debugging)
    child.stderr.on('data', (data) => {
      log(`[Server Debug] ${data.toString().trim()}`, colors.yellow);
    });
    
    // Set a timeout for metadata reception
    setTimeout(() => {
      child.stdout.removeListener('data', onStdout);
      reject(new Error('Timeout waiting for metadata'));
    }, 5000);
  });
}

// Send a request to the MCP server and await response
function sendRequest(child, request) {
  return new Promise((resolve, reject) => {
    log(`Sending request...`, colors.blue);
    
    // Write the request to stdin
    child.stdin.write(JSON.stringify(request) + '\n');
    
    // Set up response handler
    let dataBuffer = '';
    
    function onResponse(data) {
      const chunk = data.toString();
      dataBuffer += chunk;
      
      // Process complete lines
      const lines = dataBuffer.split('\n');
      
      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const response = JSON.parse(line);
          log(`Response received`, colors.green);
          
          child.stdout.removeListener('data', onResponse);
          resolve(response);
          return;
        } catch (err) {
          // Ignore parsing errors for incomplete lines
        }
      }
      
      // Keep the last (potentially incomplete) line
      dataBuffer = lines[lines.length - 1];
    }
    
    // Listen for response
    child.stdout.on('data', onResponse);
    
    // Set timeout for response
    setTimeout(() => {
      child.stdout.removeListener('data', onResponse);
      reject(new Error('Timeout waiting for response'));
    }, 10000);
  });
}

// Save data to file
function saveToFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    log(`✅ File saved: ${filePath}`, colors.green);
  } catch (error) {
    log(`❌ Error saving file: ${error.message}`, colors.red);
  }
}

// Main function
async function extractDesignTokens() {
  let mcpProcess = null;
  
  try {
    // Initialize MCP client
    mcpProcess = initializeMcpClient();
    
    // Wait for metadata
    await waitForMetadata(mcpProcess);
    
    // Get file information
    log('Fetching file information...', colors.magenta);
    const fileResponse = await sendRequest(mcpProcess, {
      function: 'figma-mcp.get-file',
      args: { fileKey: config.figmaFileKey }
    });
    
    if (!fileResponse.success) {
      throw new Error(`Failed to fetch file information: ${fileResponse.error}`);
    }
    
    log(`Working with Figma file: ${fileResponse.file.name}`, colors.cyan);
    
    // Extract design tokens in JSON format
    log('Extracting design tokens (JSON format)...', colors.magenta);
    const jsonResponse = await sendRequest(mcpProcess, {
      function: 'figma-mcp.get-design-tokens',
      args: { 
        fileKey: config.figmaFileKey,
        format: 'json'
      }
    });
    
    if (!jsonResponse.success) {
      throw new Error(`Failed to extract JSON tokens: ${jsonResponse.error}`);
    }
    
    // Save JSON tokens
    log('Saving JSON tokens...', colors.magenta);
    saveToFile(jsonOutputPath, JSON.stringify(jsonResponse.tokens, null, 2));
    
    // Extract design tokens in CSS format
    log('Extracting design tokens (CSS format)...', colors.magenta);
    const cssResponse = await sendRequest(mcpProcess, {
      function: 'figma-mcp.get-design-tokens',
      args: { 
        fileKey: config.figmaFileKey,
        format: 'css'
      }
    });
    
    if (!cssResponse.success) {
      throw new Error(`Failed to extract CSS tokens: ${cssResponse.error}`);
    }
    
    // Save CSS tokens
    log('Saving CSS tokens...', colors.magenta);
    saveToFile(cssOutputPath, cssResponse.tokens);
    
    log('\n✨ Design tokens extracted successfully! ✨', colors.green);
    log(`JSON tokens: ${jsonOutputPath}`, colors.cyan);
    log(`CSS tokens: ${cssOutputPath}`, colors.cyan);
    
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    // Clean up the MCP process
    if (mcpProcess) {
      log('Shutting down Figma MCP Server...', colors.blue);
      mcpProcess.kill();
    }
  }
}

// Run the application
if (require.main === module) {
  extractDesignTokens();
} 