/**
 * Minimal tools for Figma MCP
 * These tools provide basic functionality for interacting with Figma files
 */

function createMinimalTools() {
  const tools = new Map();

  // Simple test tool to verify connection
  tools.set('test', {
    name: 'test',
    description: 'Test if the Figma MCP connection is working',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async (params) => {
      return {
        success: true,
        message: 'Figma MCP connection is working properly',
        timestamp: new Date().toISOString()
      };
    }
  });

  // Get Figma file information
  tools.set('get-file', {
    name: 'get-file',
    description: 'Get information about a Figma file',
    parameters: {
      type: 'object',
      properties: {
        fileKey: {
          type: 'string',
          description: 'The Figma file key'
        }
      },
      required: ['fileKey']
    },
    handler: async (params, context = {}) => {
      try {
        const { fileKey } = params;
        
        // Validate parameters
        if (!fileKey) {
          return {
            success: false,
            error: 'Missing required parameter: fileKey'
          };
        }
        
        // Get figmaAPI from context or create a default implementation for production
        const figmaAPI = context.figmaAPI || {
          getFile: async (fileKey) => {
            // This would be a real API call in production
            throw new Error('No Figma API implementation provided');
          }
        };
        
        // Fetch file data
        const fileData = await figmaAPI.getFile(fileKey);
        
        return {
          success: true,
          file: fileData
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to get Figma file: ${error.message}`
        };
      }
    }
  });

  // List components in a Figma file
  tools.set('get-components', {
    name: 'get-components',
    description: 'List all components in a Figma file',
    parameters: {
      type: 'object',
      properties: {
        fileKey: {
          type: 'string',
          description: 'The Figma file key'
        }
      },
      required: ['fileKey']
    },
    handler: async (params, context = {}) => {
      try {
        const { fileKey } = params;
        
        // Validate parameters
        if (!fileKey) {
          return {
            success: false,
            error: 'Missing required parameter: fileKey'
          };
        }
        
        // Get figmaAPI from context or create a default implementation for production
        const figmaAPI = context.figmaAPI || {
          getFileComponents: async (fileKey) => {
            // This would be a real API call in production
            throw new Error('No Figma API implementation provided');
          }
        };
        
        // Fetch components
        const response = await figmaAPI.getFileComponents(fileKey);
        
        return {
          success: true,
          components: response.components || []
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to get components: ${error.message}`
        };
      }
    }
  });

  // Extract design tokens from a Figma file
  tools.set('get-design-tokens', {
    name: 'get-design-tokens',
    description: 'Extract design tokens from a Figma file',
    parameters: {
      type: 'object',
      properties: {
        fileKey: {
          type: 'string',
          description: 'The Figma file key'
        },
        format: {
          type: 'string',
          description: 'The output format (json or css)',
          enum: ['json', 'css']
        }
      },
      required: ['fileKey']
    },
    handler: async (params, context = {}) => {
      try {
        const { fileKey, format = 'json' } = params;
        
        // Validate parameters
        if (!fileKey) {
          return {
            success: false,
            error: 'Missing required parameter: fileKey'
          };
        }
        
        // Validate format
        if (format !== 'json' && format !== 'css') {
          return {
            success: false,
            error: `Unsupported format: ${format}. Supported formats are 'json' and 'css'`
          };
        }
        
        // Get figmaAPI from context or create a default implementation for production
        const figmaAPI = context.figmaAPI || {
          getFileVariables: async (fileKey) => {
            // This would be a real API call in production
            throw new Error('No Figma API implementation provided');
          }
        };
        
        // Fetch variables/tokens
        const response = await figmaAPI.getFileVariables(fileKey);
        
        if (format === 'css') {
          // Convert to CSS variables
          const cssTokens = convertTokensToCSS(response.variables);
          return {
            success: true,
            format: 'css',
            tokens: cssTokens
          };
        } else {
          // Return as JSON
          return {
            success: true,
            format: 'json',
            tokens: response.variables
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get design tokens: ${error.message}`
        };
      }
    }
  });

  return tools;
}

// Helper function to convert tokens to CSS variables
function convertTokensToCSS(tokens) {
  if (!tokens) return ':root {}';
  
  let css = ':root {\n';
  
  // Process colors
  if (tokens.colors) {
    Object.entries(tokens.colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });
  }
  
  // Process typography
  if (tokens.typography) {
    Object.entries(tokens.typography).forEach(([name, values]) => {
      Object.entries(values).forEach(([prop, value]) => {
        css += `  --typography-${name}-${prop}: ${value};\n`;
      });
    });
  }
  
  // Process spacing
  if (tokens.spacing) {
    Object.entries(tokens.spacing).forEach(([name, value]) => {
      css += `  --spacing-${name}: ${value};\n`;
    });
  }
  
  css += '}';
  return css;
}

module.exports = {
  createMinimalTools
}; 