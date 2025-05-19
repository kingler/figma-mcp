#!/usr/bin/env node

/**
 * NeDB-backed Figma MCP server with strict JSON-RPC 2.0 implementation.
 */

require('dotenv').config();
const { NedbMcpServer } = require('../src/mcp-server-nedb');
const figmaTools = require('../src/tools');
const path = require('path');
const logger = require('../src/utils/logger');
const readline = require('readline');

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
const tools = figmaTools.createTools();
tools.forEach((tool, name) => {
  // Modify tool handler to include the figmaToken
  const wrappedHandler = async (args) => {
    return await tool.handler({ ...args, figmaToken });
  };

  server.registerTool({
    name,
    description: tool.description,
    handler: wrappedHandler
  });
});

// Add example custom tool to synchronize design tokens from Figma to NeDB
server.registerTool({
  name: 'sync-design-tokens',
  description: 'Synchronize design tokens from Figma to NeDB',
  parameters: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'Figma file key'
      },
      force: {
        type: 'boolean',
        description: 'Force sync even if tokens are already up to date'
      }
    },
    required: ['fileKey']
  },
  handler: async (args) => {
    try {
      const { fileKey, force = false } = args;
      const now = new Date().toISOString();
      
      // Find the extract-design-tokens tool
      const extractTokensTool = server.tools.get('extract-design-tokens');
      if (!extractTokensTool) {
        throw new Error('extract-design-tokens tool not found');
      }
      
      // Find the store-design-tokens tool
      const storeTokensTool = server.tools.get('store-design-tokens');
      if (!storeTokensTool) {
        throw new Error('store-design-tokens tool not found');
      }
      
      // 1. Extract tokens from Figma
      const extractResult = await extractTokensTool.handler({
        fileKey,
        format: 'json'
      });
      
      if (!extractResult || !extractResult.tokens) {
        throw new Error('No tokens found in Figma file');
      }
      
      // 2. Store tokens in NeDB
      const storeResult = await storeTokensTool.handler({
        fileKey,
        tokens: extractResult.tokens,
        force
      });
      
      return {
        success: true,
        extractedTokens: extractResult.summary,
        storedTokens: storeResult,
        fileKey,
        timestamp: now
      };
    } catch (error) {
      throw error;
    }
  }
});

// Register example tool to generate component usage report
server.registerTool({
  name: 'component-usage-report',
  description: 'Generate a report of component usage across files',
  parameters: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component ID to report on (optional)'
      }
    }
  },
  handler: async (args) => {
    try {
      const { componentId } = args;
      const now = new Date().toISOString();
      
      // Query for components
      const query = componentId ? { componentId } : {};
      
      // Get components from database
      const components = await new Promise((resolve, reject) => {
        server.db.designComponents.find(query)
          .sort({ updatedAt: -1 })
          .exec((err, docs) => {
            if (err) reject(err);
            else resolve(docs);
          });
      });
      
      // Group by file
      const byFile = components.reduce((acc, component) => {
        if (!acc[component.fileKey]) {
          acc[component.fileKey] = [];
        }
        acc[component.fileKey].push({
          id: component.componentId,
          name: component.name,
          updatedAt: component.updatedAt
        });
        return acc;
      }, {});
      
      // Calculate stats
      const totalComponents = components.length;
      const totalFiles = Object.keys(byFile).length;
      const mostRecentUpdate = components.length > 0 
        ? components[0].updatedAt 
        : null;
      
      return {
        success: true,
        stats: {
          totalComponents,
          totalFiles,
          mostRecentUpdate
        },
        componentsByFile: byFile,
        timestamp: now
      };
    } catch (error) {
      throw error;
    }
  }
});

// Set up readline interface for receiving requests
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Send initial metadata
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  result: {
    server: "figma-mcp",
    version: "1.0.0"
  },
  id: null
}) + '\n');

// Handle protocol messages
rl.on('line', async (line) => {
  try {
    // Parse the incoming JSON message
    const message = JSON.parse(line);
    
    // Handle request based on method
    if (message.method === 'listTools') {
      // List available tools
      const tools = Array.from(server.tools.entries()).map(([name, tool]) => {
        return {
          name,
          description: tool.description || ''
        };
      });
      
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        result: tools,
        id: message.id
      }) + '\n');
      
    } else if (message.method === 'runTool') {
      // Run a tool
      try {
        const { name, args } = message.params || {};
        
        if (!name || !server.tools.has(name)) {
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Tool not found: ${name}`
            },
            id: message.id
          }) + '\n');
          return;
        }
        
        // Execute the tool
        const toolHandler = server.tools.get(name).handler;
        const result = await toolHandler(args || {});
        
        // Return the result
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          result,
          id: message.id
        }) + '\n');
        
      } catch (error) {
        // Return the error
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error.message
          },
          id: message.id
        }) + '\n');
      }
    } else {
      // Unsupported method
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        },
        id: message.id
      }) + '\n');
    }
  } catch (error) {
    // Parse error
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32700,
        message: `Parse error: ${error.message}`
      },
      id: null
    }) + '\n');
  }
});

// Handle end of input stream
rl.on('close', () => {
  process.exit(0);
});