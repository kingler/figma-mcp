/**
 * Test tools for figma-mcp server debugging
 */

// Simple test tool that just returns a success message
const testTool = {
  name: 'test',
  description: 'Test tool to verify the MCP server is working',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  examples: [
    {
      name: 'Basic test',
      arguments: {}
    }
  ],
  handler: async () => {
    return {
      success: true,
      message: 'Figma MCP server is working!',
      timestamp: new Date().toISOString()
    };
  }
};

// Echo tool that returns the input arguments
const echoTool = {
  name: 'echo',
  description: 'Echo the input arguments',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Message to echo back'
      }
    },
    required: ['message']
  },
  examples: [
    {
      name: 'Echo a message',
      arguments: {
        message: 'Hello, world!'
      }
    }
  ],
  handler: async (args) => {
    return {
      success: true,
      input: args,
      timestamp: new Date().toISOString()
    };
  }
};

// Version tool that returns version information
const versionTool = {
  name: 'version',
  description: 'Get version information',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  examples: [
    {
      name: 'Get version info',
      arguments: {}
    }
  ],
  handler: async () => {
    return {
      success: true,
      version: '1.0.0',
      apiVersion: '2.0',
      serverType: 'figma-mcp',
      timestamp: new Date().toISOString()
    };
  }
};

// Create a map of tools
function createTestTools() {
  const tools = new Map();
  tools.set('test', testTool);
  tools.set('echo', echoTool);
  tools.set('version', versionTool);
  return tools;
}

module.exports = {
  createTestTools,
  testTools: [testTool, echoTool, versionTool]
}; 