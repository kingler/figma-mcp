#!/usr/bin/env node

/**
 * Ultra-simple MCP server for Figma that only implements the bare minimum needed for Claude Desktop.
 * No complex schema validation, just plain JSON-RPC with simple tool handling.
 */

require('dotenv').config();
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { createTools } = require('../src/tools');

// Read environment variables
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
const dataDir = process.env.NEDB_DATA_DIR || path.join(__dirname, '..', 'data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create figma tools
const allTools = new Map();
const toolsMap = createTools();
toolsMap.forEach((tool, name) => {
  // Wrap original handler to inject figmaToken
  allTools.set(name, {
    name,
    description: tool.description || "",
    handler: async (args) => {
      try {
        return await tool.handler({ ...args, figmaToken });
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        throw error;
      }
    }
  });
});

// Add a test tool to verify the server is working
allTools.set('test', {
  name: 'test',
  description: 'Test if the server is working',
  handler: async () => {
    return {
      success: true,
      message: 'The Figma MCP server is working!'
    };
  }
});

// Setup readline for stdio communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Handle requests
rl.on('line', (line) => {
  try {
    // Parse incoming message
    const message = JSON.parse(line);
    const id = message.id;
    
    // Handle different methods
    if (message.method === 'metadata') {
      // Server metadata
      respond(id, {
        server: 'figma-mcp',
        version: '1.0.0'
      });
    }
    else if (message.method === 'listTools') {
      // List tools
      const tools = Array.from(allTools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description || ''
      }));
      
      respond(id, tools);
    }
    else if (message.method === 'runTool') {
      // Execute a tool
      handleToolExecution(id, message.params);
    }
    else {
      // Unknown method
      respondError(id, -32601, `Method not supported: ${message.method}`);
    }
  } catch (error) {
    // JSON parsing error
    respondError(null, -32700, `Parse error: ${error.message}`);
  }
});

// Helper to handle tool execution
async function handleToolExecution(id, params) {
  try {
    // Check params
    if (!params || !params.name) {
      respondError(id, -32602, 'Invalid params: tool name is required');
      return;
    }
    
    const { name, args = {} } = params;
    
    // Check if tool exists
    if (!allTools.has(name)) {
      respondError(id, -32601, `Tool not found: ${name}`);
      return;
    }
    
    // Execute tool
    const result = await allTools.get(name).handler(args);
    
    // Send response
    respond(id, result);
  } catch (error) {
    // Tool execution error
    respondError(id, -32603, error.message);
  }
}

// Helper to send a successful response
function respond(id, result) {
  const response = {
    jsonrpc: "2.0",
    id,
    result
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Helper to send an error response
function respondError(id, code, message) {
  const response = {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  };
  
  process.stdout.write(JSON.stringify(response) + '\n');
}

// Send initial message to indicate the server is ready
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  result: {
    server: "figma-mcp",
    version: "1.0.0"
  },
  id: null
}) + '\n');

// Log startup
console.error('Figma simple MCP server started and ready for connections');