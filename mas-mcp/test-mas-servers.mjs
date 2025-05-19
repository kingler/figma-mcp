#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for our MAS MCP servers
const serverConfigs = {
  'neo-orchestrator': {
    command: 'node',
    args: [path.join(__dirname, 'neo-orchestrator-server/build/index.js')],
    env: {
      LOG_LEVEL: 'info',
      NODE_ENV: 'development'
    }
  },
  'analysis-mcp': {
    command: 'node',
    args: [path.join(__dirname, 'analysis-mcp-server/build/index.js')]
  }
};

// Helper function to start an MCP server process
function startServerProcess(serverName, config) {
  console.log(`Starting MCP server: ${serverName}`);
  
  const env = {
    ...process.env,
    ...(config.env || {})
  };
  
  const childProcess = spawn(config.command, config.args, {
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  childProcess.stdout.on('data', (data) => {
    console.log(`[${serverName}] stdout: ${data}`);
  });
  
  childProcess.stderr.on('data', (data) => {
    console.error(`[${serverName}] stderr: ${data}`);
  });
  
  childProcess.on('close', (code) => {
    console.log(`[${serverName}] process exited with code ${code}`);
  });
  
  return childProcess;
}

// Function to create a client for an MCP server
async function createClientForServer(serverName, config) {
  console.log(`Creating client for MCP server: ${serverName}`);
  console.log(`Command: ${config.command} ${config.args.join(' ')}`);
  
  // Create a new client
  const client = new Client({
    name: `mcp-client-${serverName}`,
    version: '1.0.0'
  });
  
  // Set up error handler
  client.onerror = (error) => {
    console.error(`\x1b[31m[${serverName}] Client error:`, error, '\x1b[0m');
  };
  
  // Create stdio transport using the command and args
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: {
      ...process.env,
      ...(config.env || {})
    }
  });
  
  // Connect the client to the transport
  try {
    await client.connect(transport);
    console.log(`Connected to MCP server: ${serverName}`);
    return { client, transport, serverName };
  } catch (error) {
    console.error(`Failed to connect to ${serverName}:`, error);
    return null;
  }
}

async function runTest() {
  const clients = {};
  
  // Create clients for each configured server
  for (const [serverName, config] of Object.entries(serverConfigs)) {
    try {
      const clientInfo = await createClientForServer(serverName, config);
      
      if (clientInfo) {
        clients[serverName] = clientInfo;
      }
    } catch (error) {
      console.error(`Error setting up client for ${serverName}:`, error);
    }
  }
  
  console.log('Available servers:', Object.keys(clients).join(', '));
  
  // Set up cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\nShutting down MCP clients...');
    
    // Disconnect all clients
    for (const { transport, serverName } of Object.values(clients)) {
      try {
        await transport.close();
        console.log(`Disconnected from ${serverName}`);
      } catch (error) {
        console.error(`Error disconnecting from ${serverName}:`, error);
      }
    }
    
    console.log('Cleanup complete. Exiting.');
    process.exit(0);
  });
  
  if (clients['neo-orchestrator']) {
    console.log('\n===== Testing Neo Orchestrator MCP Server =====');
    
    try {
      // List available tools
      const toolsResult = await clients['neo-orchestrator'].client.request({
        method: 'tools/list',
        params: {}
      });
      
      console.log('\nAvailable tools in neo-orchestrator:');
      console.log(JSON.stringify(toolsResult, null, 2));
      
      // Test belief_management tool
      console.log('\nTesting belief_management tool...');
      const beliefResult = await clients['neo-orchestrator'].client.request({
        method: 'tools/call',
        params: {
          name: 'belief_management',
          arguments: {
            belief: 'system_status',
            action: 'add',
            value: 'operational'
          }
        }
      });
      
      console.log('\nBelief management result:');
      console.log(JSON.stringify(beliefResult, null, 2));
    } catch (error) {
      console.error('Error calling neo-orchestrator:', error);
    }
  } else {
    console.log('neo-orchestrator client not available.');
  }
  
  if (clients['analysis-mcp']) {
    console.log('\n===== Testing Analysis MCP Server =====');
    
    try {
      // List available tools
      const toolsResult = await clients['analysis-mcp'].client.request({
        method: 'tools/list',
        params: {}
      });
      
      console.log('\nAvailable tools in analysis-mcp:');
      console.log(JSON.stringify(toolsResult, null, 2));
    } catch (error) {
      console.error('Error calling analysis-mcp:', error);
    }
  } else {
    console.log('analysis-mcp client not available.');
  }
  
  console.log('\nTest completed. Press Ctrl+C to exit.');
}

// Run the test
runTest(); 