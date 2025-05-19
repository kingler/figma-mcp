/**
 * Test helpers for Figma MCP tools
 * Contains mock implementations of Figma API calls
 */

// Mock Figma API client
class MockFigmaAPI {
  constructor(mockResponses = {}) {
    this.mockResponses = {
      // Default mock responses
      fileInfo: {
        document: { id: 'doc-123', name: 'Document' },
        name: 'Test File',
        lastModified: new Date().toISOString(),
        thumbnailUrl: 'https://example.com/thumbnail.png',
        version: '123456',
        components: {},
        styles: {},
        schemaVersion: 0
      },
      components: [
        { id: 'comp-1', name: 'Button', description: 'Primary button' },
        { id: 'comp-2', name: 'Card', description: 'Card component' }
      ],
      variables: {
        colors: {
          primary: '#0066FF',
          secondary: '#00A3FF',
          success: '#00C853'
        },
        typography: {
          headingL: { fontFamily: 'Inter', fontSize: '24px', fontWeight: 700 },
          body: { fontFamily: 'Inter', fontSize: '16px', fontWeight: 400 }
        },
        spacing: {
          xs: '4px',
          sm: '8px',
          md: '16px',
          lg: '24px',
          xl: '32px'
        }
      },
      // Override with custom mock responses if provided
      ...mockResponses
    };
  }

  // Mock API methods
  async getFile(fileKey) {
    if (!fileKey) {
      throw new Error('File key is required');
    }
    
    // Return a copy of fileInfo with the provided key
    return {
      ...this.mockResponses.fileInfo,
      key: fileKey
    };
  }

  async getFileComponents(fileKey) {
    if (!fileKey) {
      throw new Error('File key is required');
    }
    
    return {
      components: this.mockResponses.components
    };
  }

  async getFileVariables(fileKey) {
    if (!fileKey) {
      throw new Error('File key is required');
    }
    
    return {
      variables: this.mockResponses.variables
    };
  }

  // Helper to simulate API errors
  static createErrorResponse(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }
}

// Helper function to create mock handlers with the mock API injected
function createMockToolHandlers(tools, customMockResponses = {}) {
  const mockAPI = new MockFigmaAPI(customMockResponses);
  
  // Create a new Map with the same tools but with mock API injected into handlers
  const mockedTools = new Map();
  
  for (const [name, tool] of tools.entries()) {
    // Create a wrapper that injects the mock API
    const wrappedHandler = async (params) => {
      // Call the original handler, but with context containing the mock API
      return await tool.handler(params, { figmaAPI: mockAPI });
    };
    
    // Create a new tool object with the wrapped handler
    mockedTools.set(name, {
      ...tool,
      handler: wrappedHandler
    });
  }
  
  return mockedTools;
}

module.exports = {
  MockFigmaAPI,
  createMockToolHandlers
}; 