require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { McpServer } = require('./src/mcp-server');
const { NedbMcpServer } = require('./src/mcp-server-nedb');
const logger = require('./src/utils/logger');

// Import tools module
const { createTools } = require('./src/tools');

// Import required APIs
const figmaAPI = require('./src/figma-api');

/**
 * Create and configure the unified Figma MCP server
 * @param {Object} options - Server options
 * @returns {Object} Server instance
 */
function createServer(options = {}) {
  // Create server
  const server = new McpServer({
    name: options.name || 'figma-mcp-unified',
    description: options.description || 'Comprehensive Figma MCP server with consolidated tools',
    version: options.version || '1.0.0'
  });
  
  // Register all tools
  const tools = createTools();
  tools.forEach((tool, name) => {
    server.registerTool({
      name,
      description: tool.description,
      handler: tool.handler
    });
  });
  
  // Register resources
  server.registerResource({
    name: 'current-user',
    description: 'Information about the current Figma user',
    handler: async () => {
      return await figmaAPI.getMe();
    }
  });
  
  server.registerResource({
    name: 'file-structure',
    description: 'Figma file structure and hierarchy',
    handler: async (context) => {
      const fileKey = context.state.fileKey;
      
      if (!fileKey) {
        throw new Error('fileKey is required in state');
      }
      
      return await figmaAPI.getFile(fileKey);
    }
  });
  
  return server;
}

/**
 * Start the server with HTTP
 * @param {number} port - Port to listen on
 * @returns {Object} Express app and server
 */
function startServer(port = process.env.PORT || 3000) {
  // Check for Figma token
  if (!process.env.FIGMA_ACCESS_TOKEN) {
    logger.error('FIGMA_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }
  
  // Create Express app
  const app = express();
  
  // Add middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Create MCP server
  const server = createServer();
  
  // Add MCP routes
  app.use('/mcp', server.middleware());
  
  // Add SSE endpoint
  app.get('/sse', server.createSseHandler());
  
  // Add health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Add stats endpoint
  app.get('/stats', (req, res) => {
    const tools = createTools();
    const fileCount = Array.from(tools.values()).filter(t => t.description.includes('file')).length;
    const componentCount = Array.from(tools.values()).filter(t => t.description.includes('component')).length;
    const variableCount = Array.from(tools.values()).filter(t => t.description.includes('variable')).length;
    
    res.status(200).json({
      tools: {
        file: fileCount,
        component: componentCount,
        variable: variableCount,
        total: tools.size
      },
      resources: {
        count: 2
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });
  
  // Start listening
  const httpServer = app.listen(port, () => {
    logger.info(`Figma MCP server listening on port ${port}`);
  });
  
  return { app, server: httpServer };
}

// Start server if run directly
if (require.main === module) {
  startServer();
}


/**
 * Create and configure a NeDB-enabled Figma MCP server
 * @param {Object} options - Server options
 * @returns {Object} NeDB MCP Server instance
 */
function createNedbServer(options = {}) {
  // Set up NeDB options
  const dataDir = options.dataDir || process.env.NEDB_DATA_DIR;
  const inMemory = options.inMemory || process.env.NEDB_IN_MEMORY === 'true';
  
  // Create NeDB MCP server
  const server = new NedbMcpServer({
    dataDir,
    inMemory,
    name: options.name || 'figma-nedb-mcp',
    description: options.description || 'Figma MCP Server with NeDB integration',
    version: options.version || '1.0.0'
  });
  
  // Register all tools
  const tools = createTools();
  tools.forEach((tool, name) => {
    server.registerTool({
      name,
      description: tool.description,
      handler: tool.handler
    });
  });
  
  // Register resources
  server.registerResource({
    name: 'current-user',
    description: 'Information about the current Figma user',
    handler: async () => {
      return await figmaAPI.getMe();
    }
  });
  
  server.registerResource({
    name: 'file-structure',
    description: 'Figma file structure and hierarchy',
    handler: async (context) => {
      const fileKey = context.state.fileKey;
      
      if (!fileKey) {
        throw new Error('fileKey is required in state');
      }
      
      return await figmaAPI.getFile(fileKey);
    }
  });
  
  return server;
}

/**
 * Start the NeDB-enabled MCP server
 * @param {number} port - Port to listen on
 * @returns {Object} Express app and server
 */
function startNedbServer(port = process.env.PORT || 3000) {
  // Check for required environment variables
  if (!process.env.FIGMA_ACCESS_TOKEN) {
    logger.error('FIGMA_ACCESS_TOKEN environment variable is required');
    process.exit(1);
  }
  
  // Create Express app
  const app = express();
  
  // Add middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Create NeDB MCP server
  const server = createNedbServer();
  
  // Add MCP routes
  app.use('/mcp', server.middleware());
  
  // Add SSE endpoint
  app.get('/sse', server.createSseHandler());
  
  // Add health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      nedb: server.stats.nedb.initialized ? 'initialized' : 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Start listening
  const httpServer = app.listen(port, () => {
    logger.info(`Figma NeDB MCP server listening on port ${port}`);
  });
  
  return { app, server: httpServer };
}

module.exports = {
  createServer,
  startServer,
  createNedbServer,
  startNedbServer
}; 