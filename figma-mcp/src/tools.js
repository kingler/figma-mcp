let fileTools = [];
let componentTools = [];
let variableTools = [];

// Try loading the tool modules, but don't fail if they're missing
try {
  fileTools = require('./tools/file-tools');
} catch (error) {
  console.error(`Error loading file tools: ${error.message}`);
  fileTools = [];
}

try {
  componentTools = require('./tools/component-tools');
} catch (error) {
  console.error(`Error loading component tools: ${error.message}`);
  componentTools = [];
}

try {
  variableTools = require('./tools/variable-tools');
} catch (error) {
  console.error(`Error loading variable tools: ${error.message}`);
  variableTools = [];
}

/**
 * Simple test tool that just returns a success message
 */
const testTool = {
  name: 'test',
  description: 'Test tool to verify the MCP server is working',
  handler: async () => {
    return {
      success: true,
      message: 'Figma MCP server is working!',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Creates and returns all the Figma tools
 * @returns {Map} A map of tool names to tool objects
 */
function createTools() {
  const tools = new Map();
  
  // Add the test tool
  tools.set('test', testTool);
  
  // Function to safely add tools to the map
  const safelyAddTools = (toolList, prefix) => {
    if (Array.isArray(toolList)) {
      toolList.forEach(tool => {
        if (tool && tool.name) {
          tools.set(tool.name, tool);
        }
      });
    }
  };
  
  // Register tools safely
  safelyAddTools(fileTools);
  safelyAddTools(componentTools);
  safelyAddTools(variableTools);
  
  return tools;
}

module.exports = {
  createTools
}; 