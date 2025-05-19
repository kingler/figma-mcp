#!/usr/bin/env node
/**
 * Test script for n8n-mcp-server
 * 
 * This script checks if the n8n-mcp-server is properly configured and can connect to the n8n instance.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { printHeader, printSuccess, printError, printWarning, printInfo } from './utils/colors.js';
import { checkClaudeConfig } from './utils/config.js';

/**
 * Check if the n8n-mcp-server is properly built
 */
function checkServerBuild(): boolean {
  printHeader('Checking n8n-mcp-server Build');
  
  // Get the path to the n8n-mcp-server build directory
  const currentDir = process.cwd();
  const buildPath = path.join(currentDir, 'build', 'index.js');
  
  if (!fs.existsSync(buildPath)) {
    printError(`n8n-mcp-server build not found at ${buildPath}`);
    return false;
  }
  
  printSuccess(`n8n-mcp-server build found at ${buildPath}`);
  return true;
}

/**
 * Check if the n8n-mcp-server can connect to the n8n instance
 */
async function checkN8nConnection(config: { host: string; apiKey: string }): Promise<boolean> {
  printHeader('Checking n8n Connection');
  
  const n8nHost = config.host;
  const n8nApiKey = config.apiKey;
  
  try {
    // Check if n8n is running
    printInfo(`Checking if n8n is running at ${n8nHost}...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${n8nHost}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const workflows = await response.json() as { data: unknown[] };
        printSuccess('Successfully connected to n8n instance');
        printInfo(`Found ${workflows.data?.length || 0} workflows`);
        return true;
      } else {
        printError(`Failed to connect to n8n instance: HTTP ${response.status}`);
        printInfo(`Response: ${await response.text()}`);
        return false;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        printError('Connection to n8n instance timed out');
      } else if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        printError(`Failed to connect to n8n instance at ${n8nHost}`);
        printWarning('Make sure n8n is running and accessible');
      } else {
        printError(`Error connecting to n8n instance: ${error instanceof Error ? error.message : String(error)}`);
      }
      return false;
    }
  } catch (error) {
    printError(`Error checking n8n connection: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  printHeader('n8n-mcp-server Test');
  
  // Check if the n8n-mcp-server is properly built
  if (!checkServerBuild()) {
    printWarning('Please build the n8n-mcp-server first:');
    printInfo('cd n8n-mcp-server && npm run build');
    return;
  }
  
  // Check if the n8n-mcp-server is properly configured in Claude Desktop
  const config = checkClaudeConfig();
  if (!config) {
    printWarning('Please configure the n8n-mcp-server in Claude Desktop');
    return;
  }
  
  // Check if the n8n-mcp-server can connect to the n8n instance
  if (!await checkN8nConnection(config)) {
    printWarning('Please check your n8n instance and API key');
    return;
  }
  
  printHeader('Test Complete');
  printSuccess('n8n-mcp-server is properly configured and can connect to the n8n instance');
  printInfo('You can now restart Claude Desktop to use the n8n-mcp-server');
  printInfo('After restarting, you should see the n8n tools available in Claude');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
