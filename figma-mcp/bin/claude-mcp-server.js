#!/usr/bin/env node

/**
 * Simple MCP server specifically designed for Claude Desktop compatibility.
 * Follows the JSON-RPC 2.0 specification closely to avoid parsing errors.
 */

require('dotenv').config();
const { NedbMcpServer } = require('../src/mcp-server-nedb');
const figmaTools = require('../src/tools');
const path = require('path');
const readline = require('readline');
const logger = require('../src/utils/logger');

// Read environment variables
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
const dataDir = process.env.NEDB_DATA_DIR || path.join(__dirname, '..', 'data');
const inMemory = process.env.NEDB_IN_MEMORY === 'true';

// Validate required environment variables
if (!figmaToken) {
  console.error('FIGMA_ACCESS_TOKEN is required.');
  process.exit(1);
}

// Create the NeDB MCP server instance
const server = new NedbMcpServer({
  dataDir,
  inMemory,
  name: 'figma-nedb-mcp',
  description: 'Figma MCP Server with NeDB integration for storing design data',
  version: '1.0.0'
});

// Register standard Figma tools
const toolsMap = figmaTools.createTools();
toolsMap.forEach((tool, name) => {
  // Modify tool handler to include the figmaToken
  const wrappedHandler = async (args) => {
    return await tool.handler({ ...args, figmaToken });
  };

  server.registerTool({
    name,
    description: tool.description,
    handler: wrappedHandler,
    parameters: tool.parameters || {}
  });
});

// Set up readline interface for receiving requests
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Handle line-by-line input
rl.on('line', async (line) => {
  let id = null;
  
  try {
    // Parse the incoming message - this is where most errors happen
    const message = JSON.parse(line);
    id = message.id; // Extract ID for response correlation
    
    // Log the message for debugging
    logger.info(`Received request: ${JSON.stringify(message)}`);
    
    // MCP uses 'method' field to determine the action
    const { method, params } = message;
    
    // Handle initialize method (protocol negotiation)
    if (method === 'initialize') {
      sendResponse(id, {
        serverInfo: {
          name: 'figma-mcp',
          version: '1.0.0'
        },
        protocolVersion: params.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {
            supported: true
          }
        }
      });
    }
    // Handle initialized notification
    else if (method === 'initialized') {
      // No response needed for notifications
      logger.info('Client initialized the connection');
    }
    // Handle metadata request
    else if (method === 'metadata') {
      sendResponse(id, {
        server: 'figma-mcp',
        description: 'Figma MCP Server with NeDB integration',
        version: '1.0.0'
      });
    }
    // Handle tool discovery - both standard JSON-RPC and MCP protocol styles
    else if (method === 'discovery' || method === 'listTools' || method === 'tools/list') {
      const toolsList = Array.from(server.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description || '',
        parameters: tool.parameters || {},
        examples: tool.examples || []
      }));
      
      // Different formats depending on the method name
      if (method === 'tools/list') {
        sendResponse(id, { tools: toolsList });
      } else {
        sendResponse(id, method === 'discovery' ? { tools: toolsList } : toolsList);
      }
    }
    // Handle tool execution - both standard JSON-RPC and MCP protocol styles
    else if (method === 'toolCall' || method === 'runTool' || method === 'tools/call') {
      let toolName, toolArgs;
      
      // Extract parameters based on the protocol variant
      if (method === 'tools/call') {
        if (!params || !params.name) {
          throw new Error('Tool name is required');
        }
        toolName = params.name;
        toolArgs = params.arguments || {};
      } else if (method === 'toolCall') {
        if (!params || !params.name) {
          throw new Error('Tool name is required');
        }
        toolName = params.name;
        toolArgs = params.arguments || {};
      } else { // runTool format
        if (!params || !params.name) {
          throw new Error('Tool name is required');
        }
        toolName = params.name;
        toolArgs = params.args || {};
      }
      
      logger.info(`Executing tool: ${toolName}`);
      
      // Check if tool exists
      if (!server.tools.has(toolName)) {
        sendError(id, -32601, `Tool not found: ${toolName}`);
        return;
      }
      
      try {
        // Execute tool
        const result = await server.tools.get(toolName).handler(toolArgs);
        sendResponse(id, result);
        logger.info(`Tool execution completed: ${toolName}`);
      } catch (error) {
        sendError(id, -32603, error.message);
        logger.error(`Tool execution error: ${error.message}`);
      }
    }
    // Handle shutdown
    else if (method === 'shutdown') {
      sendResponse(id, { success: true });
      logger.info('Received shutdown request, closing...');
      setTimeout(() => process.exit(0), 100);
    }
    // Handle unknown methods
    else {
      sendError(id, -32601, `Method not supported: ${method}`);
      logger.error(`Unsupported method: ${method}`);
    }
  } catch (error) {
    // JSON parsing error or other unexpected error
    sendError(id, -32700, `Parse error: ${error.message}`);
    logger.error(`Error processing request: ${error.message}`);
    logger.error(`Problematic JSON: ${line}`);
  }
});

// Helper function to send a successful response
function sendResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id,
    result
  };
  const jsonResponse = JSON.stringify(response);
  process.stdout.write(jsonResponse + '\n');
  
  logger.info(`Sent response: ${jsonResponse}`);
}

// Helper function to send an error response
function sendError(id, code, message, data = undefined) {
  const error = {
    code,
    message
  };
  
  if (data !== undefined) {
    error.data = data;
  }
  
  const response = {
    jsonrpc: "2.0",
    id,
    error
  };
  
  const jsonResponse = JSON.stringify(response);
  process.stdout.write(jsonResponse + '\n');
  
  logger.info(`Sent error: ${jsonResponse}`);
}

// Send initial metadata - important for the handshake
logger.info('Sending initial handshake');
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  result: {
    server: "figma-mcp",
    version: "1.0.0"
  },
  id: null
}) + '\n');

// Handle termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});

logger.info('Figma MCP server started and ready for connections');