/**
 * MCP Server implementation for stdio communication
 */
class McpServer {
  /**
   * Create a new MCP server
   * @param {Object} options - Server options
   */
  constructor(options = {}) {
    this.name = options.name || 'mcp-server';
    this.description = options.description || 'MCP Server';
    this.version = options.version || '1.0.0';
    this.tools = new Map();
    this.resources = new Map();
  }

  /**
   * Register a tool with the server
   * @param {Object} tool - Tool to register
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools with the server
   * @param {Map|Object} tools - Tools to register
   */
  registerTools(tools) {
    if (tools instanceof Map) {
      // If tools is a Map, add each tool directly
      tools.forEach((tool, name) => {
        this.registerTool(tool);
      });
    } else if (typeof tools === 'object') {
      // If tools is an object, register each entry as a tool
      Object.entries(tools).forEach(([name, tool]) => {
        this.registerTool({
          name,
          ...tool
        });
      });
    }
  }

  /**
   * Register a resource with the server
   * @param {Object} resource - Resource to register
   */
  registerResource(resource) {
    this.resources.set(resource.name, resource);
  }

  /**
   * Start the MCP server in stdio mode
   */
  start() {
    // Set up stdio handlers
    process.stdin.setEncoding('utf8');
    
    // Handle incoming data
    process.stdin.on('data', async (data) => {
      try {
        // Parse the incoming JSON request
        const request = JSON.parse(data);
        
        // Handle different types of requests based on MCP protocol
        if (request.function) {
          // This is a function call - standard MCP protocol
          await this.handleFunctionCall(request);
        } else if (request.jsonrpc === '2.0' && request.method) {
          // This is a JSON-RPC style request (newer MCP protocol)
          await this.handleJsonRpcRequest(request);
        } else if (request.type === 'metadata') {
          // This is a metadata request
          this.handleMetadataRequest(request);
        } else if (request.type === 'discovery') {
          // This is a tool discovery request
          this.handleDiscoveryRequest(request);
        } else {
          // Invalid or unsupported request format
          this.sendErrorResponse({
            error: 'Invalid request format',
            details: 'Request must follow the MCP protocol'
          });
        }
      } catch (error) {
        this.sendErrorResponse({
          error: `Failed to parse request: ${error.message}`
        });
      }
    });
    
    // Handle process exit
    process.on('SIGINT', () => {
      process.exit(0);
    });
    
    // Send initial metadata to notify the client about supported features
    this.sendInitialMetadata();
  }

  /**
   * Send initial metadata response on startup
   */
  sendInitialMetadata() {
    const metadata = {
      type: 'metadata',
      server: this.name,
      description: this.description,
      version: this.version,
      protocol: {
        version: '2.0',
        supportsDiscovery: true,
        supportsStreaming: false
      },
      toolCount: this.tools.size
    };
    
    process.stdout.write(JSON.stringify(metadata) + '\n');
  }

  /**
   * Handle a metadata request
   * @param {Object} request - The metadata request
   */
  handleMetadataRequest(request) {
    const metadata = {
      type: 'metadata',
      server: this.name,
      description: this.description,
      version: this.version,
      protocol: {
        version: '2.0',
        supportsDiscovery: true,
        supportsStreaming: false
      },
      toolCount: this.tools.size
    };
    
    this.sendSuccessResponse(metadata);
  }

  /**
   * Handle a discovery request to list available tools
   * @param {Object} request - The discovery request
   */
  handleDiscoveryRequest(request) {
    // Convert Map of tools to an array of tool definitions
    const toolDefinitions = Array.from(this.tools.entries()).map(([name, tool]) => {
      return {
        name: `figma-mcp.${name}`,
        description: tool.description || `Figma tool: ${name}`,
        parameters: tool.parameters || {},
        examples: tool.examples || []
      };
    });
    
    const response = {
      type: 'discovery',
      tools: toolDefinitions
    };
    
    this.sendSuccessResponse(response);
  }

  /**
   * Handle a standard MCP function call
   * @param {Object} request - The function call request
   */
  async handleFunctionCall(request) {
    const { function: functionName, args = {} } = request;
    
    // Extract the actual tool name from the full function name (e.g., "figma-mcp.get-file" -> "get-file")
    const toolName = functionName.includes('.') ? functionName.split('.')[1] : functionName;
    
    // Find the tool
    const tool = this.tools.get(toolName);
    if (!tool) {
      this.sendErrorResponse({
        error: `Tool not found: ${toolName}`
      });
      return;
    }
    
    try {
      // Execute the tool handler
      const result = await tool.handler(args);
      this.sendSuccessResponse(result);
    } catch (error) {
      this.sendErrorResponse({
        error: `Error executing tool ${toolName}: ${error.message}`
      });
    }
  }

  /**
   * Handle a JSON-RPC style MCP request
   * @param {Object} request - The JSON-RPC request
   */
  async handleJsonRpcRequest(request) {
    const { method, params = {}, id } = request;
    
    // Extract the actual tool name from the full method name
    const toolName = method.includes('.') ? method.split('.')[1] : method;
    
    // Find the tool
    const tool = this.tools.get(toolName);
    if (!tool) {
      this.sendJsonRpcErrorResponse({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${toolName}`
        },
        id
      });
      return;
    }
    
    try {
      // Execute the tool handler
      const result = await tool.handler(params);
      this.sendJsonRpcSuccessResponse({
        jsonrpc: '2.0',
        result,
        id
      });
    } catch (error) {
      this.sendJsonRpcErrorResponse({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `Error executing method ${toolName}: ${error.message}`
        },
        id
      });
    }
  }

  /**
   * Send a standard success response
   * @param {Object} result - The result object
   */
  sendSuccessResponse(result) {
    process.stdout.write(JSON.stringify(result) + '\n');
  }

  /**
   * Send a standard error response
   * @param {Object} error - The error object
   */
  sendErrorResponse(error) {
    process.stdout.write(JSON.stringify(error) + '\n');
  }

  /**
   * Send a JSON-RPC style success response
   * @param {Object} response - The JSON-RPC response
   */
  sendJsonRpcSuccessResponse(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  /**
   * Send a JSON-RPC style error response
   * @param {Object} response - The JSON-RPC error response
   */
  sendJsonRpcErrorResponse(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

module.exports = McpServer; 