#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { startServer } = require('../index');
const { createTestTools } = require('../test-tools');
const { createMinimalTools } = require('../minimal-tools');

// Parse command line arguments
const args = process.argv.slice(2);
let port = process.env.PORT || 3000;
let figmaToken = process.env.FIGMA_ACCESS_TOKEN;
let debug = false;
let useStdio = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--port' && i + 1 < args.length) {
    port = parseInt(args[++i], 10);
  } else if (arg === '--figma-api-key' && i + 1 < args.length) {
    figmaToken = args[++i];
  } else if (arg === '--debug') {
    debug = true;
  } else if (arg === '--stdio') {
    useStdio = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Figma MCP Unified Server - Global CLI

Usage:
  figma-mcp-unified [options]

Options:
  --port <number>         Set the server port (default: 3000 or PORT env var)
  --figma-api-key <key>   Set the Figma API key (default: FIGMA_ACCESS_TOKEN env var)
  --debug                 Enable debug mode with verbose logging
  --stdio                 Run in stdio mode for MCP communication
  --help, -h              Show this help message

Environment Variables:
  FIGMA_ACCESS_TOKEN      Figma API access token
  PORT                    Server port number
  LOG_LEVEL               Logging level (error, warn, info, debug)
  NODE_ENV                Node environment (development, production)
  CACHE_TTL               Cache time-to-live in milliseconds
  CACHE_MAX_ITEMS         Maximum cache items
    `);
    process.exit(0);
  }
}

// Check for Figma token
if (!figmaToken) {
  console.error('Error: Figma API token is required.');
  console.error('Provide it using the --figma-api-key option or set the FIGMA_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

// Set the token in the environment for API calls
process.env.FIGMA_ACCESS_TOKEN = figmaToken;

// If stdio mode is enabled, run in that mode instead of starting the HTTP server
if (useStdio) {
  if (debug) {
    console.error('[DEBUG] Starting Figma MCP Server in stdio mode');
    console.error('[DEBUG] FIGMA_ACCESS_TOKEN available:', !!process.env.FIGMA_ACCESS_TOKEN);
    console.error('[DEBUG] Working directory:', process.cwd());
  }

  // Create tools
  const testTools = createTestTools();
  const minimalTools = createMinimalTools();
  
  // Combine all tools
  const tools = new Map([...testTools, ...minimalTools]);
  
  if (debug) {
    console.error('[DEBUG] Registered tools:');
    tools.forEach((tool, name) => {
      console.error(`[DEBUG]   - ${name}: ${tool.description}`);
    });
    console.error('[DEBUG] Total tools registered:', tools.size);
  }
  
  // Set up metadata
  const metadata = {
    server: 'figma-mcp',
    description: 'Figma MCP Server',
    version: '1.0.0',
    toolCount: tools.size
  };
  
  // Send initial metadata
  if (debug) {
    console.error('[DEBUG] Sending initial metadata');
  }
  
  const initialResponse = {
    type: 'metadata',
    ...metadata,
    protocol: {
      version: '2.0',
      supportsDiscovery: true,
      supportsStreaming: false
    }
  };
  
  process.stdout.write(JSON.stringify(initialResponse) + '\n');
  
  // Listen for stdin messages
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (data) => {
    if (debug) {
      console.error('[DEBUG] Received request:', data.toString().trim());
    }
    
    try {
      const request = JSON.parse(data);
      
      // Handle discovery request
      if (request.type === 'discovery') {
        if (debug) {
          console.error('[DEBUG] Handling discovery request');
        }
        
        // Convert tools to the expected format
        const toolDefinitions = Array.from(tools.entries()).map(([name, tool]) => {
          return {
            name: `figma-mcp.${name}`,
            description: tool.description || '',
            parameters: tool.parameters || {
              type: 'object',
              properties: {},
              required: []
            },
            examples: tool.examples || []
          };
        });
        
        const response = {
          type: 'discovery',
          tools: toolDefinitions
        };
        
        if (debug) {
          console.error('[DEBUG] Sending discovery response with', toolDefinitions.length, 'tools');
        }
        
        process.stdout.write(JSON.stringify(response) + '\n');
      } 
      // Handle function call
      else if (request.function) {
        const funcName = request.function;
        const args = request.args || {};
        
        if (debug) {
          console.error(`[DEBUG] Handling function call: ${funcName}`);
        }
        
        // Extract tool name (remove namespace if present)
        const toolName = funcName.includes('.') ? funcName.split('.')[1] : funcName;
        
        // Find the tool
        const tool = tools.get(toolName);
        
        if (!tool) {
          if (debug) {
            console.error(`[DEBUG] Tool not found: ${toolName}`);
          }
          
          process.stdout.write(JSON.stringify({
            error: `Tool not found: ${toolName}`
          }) + '\n');
          return;
        }
        
        try {
          // Execute the tool handler
          const result = await tool.handler(args);
          
          if (debug) {
            console.error(`[DEBUG] Tool executed successfully: ${toolName}`);
          }
          
          process.stdout.write(JSON.stringify(result) + '\n');
        } catch (error) {
          if (debug) {
            console.error(`[DEBUG] Error executing tool ${toolName}:`, error);
          }
          
          process.stdout.write(JSON.stringify({
            error: `Error executing tool ${toolName}: ${error.message}`
          }) + '\n');
        }
      }
      // Handle metadata request
      else if (request.type === 'metadata') {
        if (debug) {
          console.error('[DEBUG] Handling metadata request');
        }
        
        const response = {
          type: 'metadata',
          ...metadata,
          protocol: {
            version: '2.0',
            supportsDiscovery: true,
            supportsStreaming: false
          }
        };
        
        process.stdout.write(JSON.stringify(response) + '\n');
      }
      // Handle unknown request
      else {
        if (debug) {
          console.error('[DEBUG] Unknown request type:', request);
        }
        
        process.stdout.write(JSON.stringify({
          error: 'Invalid request format',
          details: 'Request must follow the MCP protocol'
        }) + '\n');
      }
    } catch (error) {
      if (debug) {
        console.error('[DEBUG] Error parsing request:', error);
      }
      
      process.stdout.write(JSON.stringify({
        error: `Failed to parse request: ${error.message}`
      }) + '\n');
    }
  });
  
  if (debug) {
    console.error('[DEBUG] Figma MCP Server started in stdio mode and waiting for requests');
  }
  
  // Keep the process running
  process.stdin.resume();
} else {
  // Start HTTP server
  console.log(`Starting Figma MCP Unified Server on port ${port}...`);
  console.log(`Debug mode: ${debug ? 'enabled' : 'disabled'}`);
  startServer(port);
} 