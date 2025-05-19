#!/usr/bin/env node

// Import required dependencies
require('dotenv').config();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const figmaTools = require('../src/tools');
const path = require('path');
const fs = require('fs');

// Read environment variables
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
const dataDir = process.env.NEDB_DATA_DIR || path.join(__dirname, '..', 'data');

// Validate required environment variables
if (!figmaToken) {
  console.error('FIGMA_ACCESS_TOKEN is required.');
  process.exit(1);
}

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create an MCP server
const server = new McpServer({ 
  name: "figma-mcp", 
  version: "1.0.0",
  description: "Figma MCP Server for accessing Figma design data"
});

// Load Figma tools
const toolsMap = figmaTools.createTools();

// Track registered tools to avoid duplicates
const registeredTools = new Set();

// Add a test tool that just returns a success message (add it first to override the default one)
server.tool(
  "test",
  {},
  async () => ({
    content: [
      { 
        type: "text", 
        text: "The Figma MCP server is working properly!"
      }
    ]
  })
);
registeredTools.add("test");
console.error(`Registered tool: test`);

// Register each Figma tool with the MCP server
toolsMap.forEach((tool, name) => {
  // Skip already registered tools
  if (registeredTools.has(name)) {
    console.error(`Skipping duplicate tool: ${name}`);
    return;
  }
  
  // Register only tools that have handlers
  if (tool && tool.handler && typeof tool.handler === 'function') {
    // Create a wrapper that injects the figmaToken
    server.tool(
      name,
      {}, // We don't use zod schema here to avoid validation issues
      async (args) => {
        try {
          // Call the underlying tool with the figmaToken
          const result = await tool.handler({ ...args, figmaToken });
          
          // Return a properly formatted response
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result)
              }
            ]
          };
        } catch (error) {
          console.error(`Error executing tool ${name}:`, error);
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );
    
    // Track that we've registered this tool
    registeredTools.add(name);
    console.error(`Registered tool: ${name}`);
  }
});

// Create and connect the transport
const transport = new StdioServerTransport();

// Start the server
(async () => {
  try {
    console.error('Starting Figma MCP server with official SDK...');
    await server.connect(transport);
    console.error('Figma MCP server running with official SDK');
  } catch (error) {
    console.error('Error starting Figma MCP server:', error);
    process.exit(1);
  }
})();