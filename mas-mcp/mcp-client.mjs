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

// Helper function to start an MCP server process
function startServerProcess(serverName, config) {
  console.log(`Starting MCP server: ${serverName}`);
  
  const env = {
    ...process.env,
    ...(config.env || {})
  };
  
  const childProcess = spawn(config.command, config.args, {
    env,
    cwd: config.cwd || process.cwd(),
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
async function createClientForServer(serverName) {
  // Get server config
  const config = mcpConfig.mcpServers[serverName];
  if (!config) {
    throw new Error(`Server "${serverName}" not found in MCP configuration`);
  }

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
    cwd: config.cwd || process.cwd(),
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

// Main function to create clients for all configured servers
async function setupMCPClients() {
  const clients = {};
  
  // Create clients for each configured server
  for (const serverName of Object.keys(mcpConfig.mcpServers)) {
    try {
      const clientInfo = await createClientForServer(serverName);
      
      if (clientInfo) {
        clients[serverName] = clientInfo;
      }
    } catch (error) {
      console.error(`Error setting up client for ${serverName}:`, error);
    }
  }
  
  console.log('MCP Client setup complete. Available servers:');
  console.log(Object.keys(clients).join(', '));
  
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
  
  // Return the clients object for external use
  return clients;
}

// Export the function for use as a module
export { setupMCPClients }; 