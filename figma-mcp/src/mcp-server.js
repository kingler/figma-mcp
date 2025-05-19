const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');

/**
 * MCP Server implementation that handles requests following the Model Context Protocol
 */
class McpServer {
  constructor(options = {}) {
    this.name = options.name || 'figma-mcp-unified';
    this.description = options.description || 'Figma MCP Server';
    this.version = options.version || '1.0.0';
    
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    
    this.pendingResponses = new Map();
    this.events = new EventEmitter();
    
    // Set up timeouts
    this.requestTimeout = options.requestTimeout || 60000; // 1 minute
    
    // Stats tracking
    this.stats = {
      requests: 0,
      toolCalls: 0,
      resourceRequests: 0,
      promptRequests: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Register a tool with the server
   * @param {Object} tool - Tool definition
   */
  registerTool(tool) {
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }
    
    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new Error(`Tool ${tool.name} must have a handler function`);
    }
    
    logger.info(`Registering tool: ${tool.name}`);
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || {},
      examples: tool.examples || [],
      handler: tool.handler
    });
  }

  /**
   * Register multiple tools with the server
   * @param {Array} tools - Array of tool definitions
   */
  registerTools(tools) {
    if (!Array.isArray(tools)) {
      throw new Error('Tools must be an array');
    }
    
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Register a resource with the server
   * @param {Object} resource - Resource definition
   */
  registerResource(resource) {
    if (!resource.name) {
      throw new Error('Resource must have a name');
    }
    
    if (!resource.handler || typeof resource.handler !== 'function') {
      throw new Error(`Resource ${resource.name} must have a handler function`);
    }
    
    logger.info(`Registering resource: ${resource.name}`);
    this.resources.set(resource.name, {
      name: resource.name,
      description: resource.description || '',
      handler: resource.handler
    });
  }

  /**
   * Register multiple resources with the server
   * @param {Array} resources - Array of resource definitions
   */
  registerResources(resources) {
    if (!Array.isArray(resources)) {
      throw new Error('Resources must be an array');
    }
    
    for (const resource of resources) {
      this.registerResource(resource);
    }
  }

  /**
   * Register a prompt with the server
   * @param {Object} prompt - Prompt definition
   */
  registerPrompt(prompt) {
    if (!prompt.name) {
      throw new Error('Prompt must have a name');
    }
    
    if (!prompt.handler || typeof prompt.handler !== 'function') {
      throw new Error(`Prompt ${prompt.name} must have a handler function`);
    }
    
    logger.info(`Registering prompt: ${prompt.name}`);
    this.prompts.set(prompt.name, {
      name: prompt.name,
      description: prompt.description || '',
      parameters: prompt.parameters || {},
      handler: prompt.handler
    });
  }

  /**
   * Register multiple prompts with the server
   * @param {Array} prompts - Array of prompt definitions
   */
  registerPrompts(prompts) {
    if (!Array.isArray(prompts)) {
      throw new Error('Prompts must be an array');
    }
    
    for (const prompt of prompts) {
      this.registerPrompt(prompt);
    }
  }

  /**
   * Handle a tool call request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleToolCall(req, res) {
    const { name, arguments: args } = req.body;
    const requestId = uuidv4();
    this.stats.requests++;
    this.stats.toolCalls++;
    
    logger.info(`Tool call [${requestId}]: ${name}`);
    
    try {
      const tool = this.tools.get(name);
      
      if (!tool) {
        logger.error(`Tool not found: ${name}`);
        this.stats.errors++;
        return res.status(404).json({
          error: `Tool not found: ${name}`
        });
      }
      
      // Validate parameters if a schema is defined
      if (tool.parameters && tool.parameters.parse && typeof args === 'object') {
        try {
          tool.parameters.parse(args);
        } catch (validationError) {
          logger.error(`Parameter validation error for ${name}: ${validationError.message}`);
          this.stats.errors++;
          return res.status(400).json({
            error: `Parameter validation error: ${validationError.message}`
          });
        }
      }
      
      // Execute the tool handler
      const result = await tool.handler(args);
      
      logger.info(`Tool call completed [${requestId}]: ${name}`);
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Tool call error [${requestId}]: ${error.message}`);
      this.stats.errors++;
      return res.status(500).json({
        error: `Error executing tool ${name}: ${error.message}`
      });
    }
  }

  /**
   * Handle a resource request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handleResourceRequest(req, res) {
    const { name } = req.params;
    const requestId = uuidv4();
    this.stats.requests++;
    this.stats.resourceRequests++;
    
    logger.info(`Resource request [${requestId}]: ${name}`);
    
    try {
      const resource = this.resources.get(name);
      
      if (!resource) {
        logger.error(`Resource not found: ${name}`);
        this.stats.errors++;
        return res.status(404).json({
          error: `Resource not found: ${name}`
        });
      }
      
      // Extract context from request
      const context = {
        state: req.body || {},
        params: req.query || {}
      };
      
      // Execute the resource handler
      const result = await resource.handler(context);
      
      logger.info(`Resource request completed [${requestId}]: ${name}`);
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Resource request error [${requestId}]: ${error.message}`);
      this.stats.errors++;
      return res.status(500).json({
        error: `Error retrieving resource ${name}: ${error.message}`
      });
    }
  }

  /**
   * Handle a prompt request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async handlePromptRequest(req, res) {
    const { name } = req.params;
    const requestId = uuidv4();
    this.stats.requests++;
    this.stats.promptRequests++;
    
    logger.info(`Prompt request [${requestId}]: ${name}`);
    
    try {
      const prompt = this.prompts.get(name);
      
      if (!prompt) {
        logger.error(`Prompt not found: ${name}`);
        this.stats.errors++;
        return res.status(404).json({
          error: `Prompt not found: ${name}`
        });
      }
      
      // Extract arguments from request
      const args = req.body || {};
      
      // Validate parameters if a schema is defined
      if (prompt.parameters && prompt.parameters.parse) {
        try {
          prompt.parameters.parse(args);
        } catch (validationError) {
          logger.error(`Parameter validation error for prompt ${name}: ${validationError.message}`);
          this.stats.errors++;
          return res.status(400).json({
            error: `Parameter validation error: ${validationError.message}`
          });
        }
      }
      
      // Execute the prompt handler
      const result = await prompt.handler(args);
      
      logger.info(`Prompt request completed [${requestId}]: ${name}`);
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Prompt request error [${requestId}]: ${error.message}`);
      this.stats.errors++;
      return res.status(500).json({
        error: `Error executing prompt ${name}: ${error.message}`
      });
    }
  }

  /**
   * Handle server metadata request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  handleMetadata(req, res) {
    const metadata = {
      name: this.name,
      description: this.description,
      version: this.version,
      tools: Array.from(this.tools.keys()).map(name => {
        const tool = this.tools.get(name);
        return {
          name: tool.name,
          description: tool.description
        };
      }),
      resources: Array.from(this.resources.keys()).map(name => {
        const resource = this.resources.get(name);
        return {
          name: resource.name,
          description: resource.description
        };
      }),
      prompts: Array.from(this.prompts.keys()).map(name => {
        const prompt = this.prompts.get(name);
        return {
          name: prompt.name,
          description: prompt.description
        };
      })
    };
    
    return res.status(200).json(metadata);
  }

  /**
   * Handle server stats request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  handleStats(req, res) {
    const uptime = Date.now() - this.stats.startTime;
    
    const stats = {
      ...this.stats,
      uptime,
      tools: this.tools.size,
      resources: this.resources.size,
      prompts: this.prompts.size
    };
    
    return res.status(200).json(stats);
  }

  /**
   * Create Express middleware for the MCP server
   * @returns {Function} Express middleware
   */
  middleware() {
    const router = express.Router();
    
    // Add middleware
    router.use(cors());
    router.use(bodyParser.json());
    
    // Add routes
    router.get('/', (req, res) => this.handleMetadata(req, res));
    router.get('/stats', (req, res) => this.handleStats(req, res));
    
    // Tool routes
    router.post('/tools', (req, res) => this.handleToolCall(req, res));
    
    // Resource routes
    router.post('/resources/:name', (req, res) => this.handleResourceRequest(req, res));
    router.get('/resources/:name', (req, res) => this.handleResourceRequest(req, res));
    
    // Prompt routes
    router.post('/prompts/:name', (req, res) => this.handlePromptRequest(req, res));
    
    // Error handler
    router.use((err, req, res, next) => {
      logger.error(`Server error: ${err.message}`);
      this.stats.errors++;
      res.status(500).json({
        error: `Server error: ${err.message}`
      });
    });
    
    return router;
  }

  /**
   * Start the MCP server as a standalone Express server
   * @param {number} port - Port to listen on
   */
  listen(port) {
    const app = express();
    app.use('/', this.middleware());
    
    return app.listen(port, () => {
      logger.info(`MCP server "${this.name}" listening on port ${port}`);
    });
  }

  /**
   * Create a server-sent events (SSE) endpoint handler
   * @returns {Function} Express route handler for SSE
   */
  createSseHandler() {
    return (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      const clientId = uuidv4();
      logger.info(`SSE client connected: ${clientId}`);
      
      // Setup event listeners
      const toolListener = (data) => {
        res.write(`event: tool\ndata: ${JSON.stringify(data)}\n\n`);
      };
      
      const resourceListener = (data) => {
        res.write(`event: resource\ndata: ${JSON.stringify(data)}\n\n`);
      };
      
      const promptListener = (data) => {
        res.write(`event: prompt\ndata: ${JSON.stringify(data)}\n\n`);
      };
      
      this.events.on('tool', toolListener);
      this.events.on('resource', resourceListener);
      this.events.on('prompt', promptListener);
      
      // Send initial ping
      res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);
      
      // Handle client disconnect
      req.on('close', () => {
        logger.info(`SSE client disconnected: ${clientId}`);
        this.events.off('tool', toolListener);
        this.events.off('resource', resourceListener);
        this.events.off('prompt', promptListener);
      });
    };
  }
}

module.exports = { McpServer }; 