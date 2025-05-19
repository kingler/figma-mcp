import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the MCP configuration from the user's mcp.json file
const homeDir = process.env.HOME || process.env.USERPROFILE;
const mcpConfigPath = path.join(homeDir, '.cursor', 'mcp.json');
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));

console.log('Loading MCP configuration from:', mcpConfigPath);
console.log('Available MCP servers:', Object.keys(mcpConfig.mcpServers).join(', '));

// Function to create a client for a specific MCP server
async function createClient(serverName) {
  // Check if the server exists in config
  if (!mcpConfig.mcpServers[serverName]) {
    throw new Error(`Server "${serverName}" not found in MCP configuration`);
  }
  
  const serverConfig = mcpConfig.mcpServers[serverName];
  
  console.log(`Creating client for ${serverName}...`);
  console.log(`Command: ${serverConfig.command} ${serverConfig.args.join(' ')}`);
  
  // Create a new client
  const client = new Client({
    name: `mcp-client-${serverName}`,
    version: '1.0.0'
  });
  
  // Set up error handler
  client.onerror = (error) => {
    console.error(`\x1b[31m[${serverName}] Client error:`, error, '\x1b[0m');
  };
  
  // Create transport with the appropriate command
  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    cwd: serverConfig.cwd || process.cwd(),
    env: { ...process.env, ...(serverConfig.env || {}) },
    onStdout: (data) => console.log(`[${serverName}] stdout: ${data.toString().trim()}`),
    onStderr: (data) => console.error(`[${serverName}] stderr: ${data.toString().trim()}`),
    onExit: (code) => console.log(`[${serverName}] process exited with code ${code || 'unknown'}`)
  });
  
  try {
    // Connect to the server
    await client.connect(transport);
    console.log(`Connected to ${serverName} MCP server!`);
    return { client, transport };
  } catch (error) {
    console.error(`Failed to connect to ${serverName}:`, error);
    await transport.close().catch(() => {});
    return null;
  }
}

// Get a list of available tools for a client
async function listTools(clientInfo) {
  if (!clientInfo || !clientInfo.client) {
    console.log('Client not available');
    return [];
  }
  
  try {
    const result = await clientInfo.client.request({
      method: 'tools/list',
      params: {}
    });
    
    return result.tools || [];
  } catch (error) {
    console.error('Error listing tools:', error);
    return [];
  }
}

// Call a tool
async function callTool(clientInfo, toolName, args = {}) {
  if (!clientInfo || !clientInfo.client) {
    console.log('Client not available');
    return null;
  }
  
  try {
    const result = await clientInfo.client.request({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error calling tool ${toolName}:`, error);
    return null;
  }
}

// Clean up resources
async function cleanup(clientInfo) {
  if (!clientInfo) return;
  
  try {
    if (clientInfo.transport) {
      await clientInfo.transport.close();
      console.log('Transport closed');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Example usage
async function runExample() {
  let clientInfo = null;
  
  try {
    // Connect to taskmaster-ai server
    clientInfo = await createClient('taskmaster-ai');
    
    if (clientInfo) {
      // List available tools
      console.log('\nListing available tools:');
      const tools = await listTools(clientInfo);
      
      if (tools && tools.length > 0) {
        console.log(`Found ${tools.length} tools:`);
        tools.forEach(tool => {
          console.log(`- ${tool.name}: ${tool.description || ''}`);
        });
        
        // Try calling the get_tasks tool
        if (tools.some(tool => tool.name === 'get_tasks')) {
          console.log('\nCalling get_tasks tool...');
          const result = await callTool(clientInfo, 'get_tasks', { 
            projectRoot: process.cwd()
          });
          
          if (result) {
            console.log('Result:', JSON.stringify(result, null, 2));
          }
        }
      } else {
        console.log('No tools found on the server');
      }
    }
  } catch (error) {
    console.error('Error running example:', error);
  } finally {
    // Clean up resources
    if (clientInfo) {
      await cleanup(clientInfo);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  process.exit(0);
});

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}

// Export functions for external use
export { createClient, listTools, callTool, cleanup }; 