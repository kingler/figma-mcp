import axios from 'axios';

/**
 * Bridge to communicate with the Figma MCP server
 * This allows the shadcn-ui-mcp to leverage the existing Figma MCP 
 * without reimplementing Figma API integration
 */
export class FigmaMcpBridge {
  private figmaMcpUrl: string;
  private figmaToken: string;

  /**
   * Create a new Figma MCP bridge
   * @param figmaMcpUrl - URL of the Figma MCP server's HTTP endpoint
   * @param figmaToken - Figma personal access token
   */
  constructor(figmaMcpUrl: string, figmaToken: string) {
    this.figmaMcpUrl = figmaMcpUrl;
    this.figmaToken = figmaToken;
  }

  /**
   * Call a tool on the Figma MCP server
   * @param tool - Name of the tool to call
   * @param params - Parameters to pass to the tool
   * @returns The result of the tool call
   */
  async callTool(tool: string, params: any): Promise<any> {
    try {
      const response = await axios.post(this.figmaMcpUrl, {
        jsonrpc: '2.0',
        method: 'mcp.callTool',
        params: {
          tool,
          params: {
            ...params,
            // Pass the token automatically if not provided
            token: params.token || this.figmaToken
          }
        },
        id: Date.now().toString()
      });

      if (response.data.error) {
        throw new Error(`Figma MCP error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to call Figma MCP: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a Figma file
   * @param fileKey - Figma file key
   * @returns Figma file data
   */
  async getFile(fileKey: string): Promise<any> {
    return this.callTool('get-file', { fileKey });
  }

  /**
   * List Figma files accessible to the user
   * @returns List of Figma files
   */
  async listFiles(): Promise<any> {
    return this.callTool('list-files', {});
  }

  /**
   * Get specific nodes from a Figma file
   * @param fileKey - Figma file key
   * @param nodeIds - Array of node IDs to retrieve
   * @returns Node data
   */
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<any> {
    return this.callTool('get-file-nodes', { fileKey, nodeIds });
  }

  /**
   * Get components from a Figma file
   * @param fileKey - Figma file key
   * @returns Components data
   */
  async getFileComponents(fileKey: string): Promise<any> {
    return this.callTool('get-file-components', { fileKey });
  }

  /**
   * Get component instances
   * @param fileKey - Figma file key
   * @param componentKey - Component key
   * @returns Component instances data
   */
  async getComponentInstances(fileKey: string, componentKey: string): Promise<any> {
    return this.callTool('get-component-instances', { fileKey, componentKey });
  }

  /**
   * Analyze component structure
   * @param fileKey - Figma file key
   * @param componentId - Component ID
   * @returns Component structure analysis
   */
  async analyzeComponentStructure(fileKey: string, componentId: string): Promise<any> {
    return this.callTool('analyze-component-structure', { fileKey, componentId });
  }

  /**
   * Extract design tokens from a Figma file
   * @param fileKey - Figma file key
   * @returns Design tokens
   */
  async extractDesignTokens(fileKey: string): Promise<any> {
    return this.callTool('extract-design-tokens', { fileKey });
  }

  /**
   * Sync design tokens between Figma and code
   * @param fileKey - Figma file key
   * @param tokenFormat - Format of the design tokens
   * @param outputPath - Path to write the tokens to
   * @returns Sync result
   */
  async syncDesignTokens(fileKey: string, tokenFormat: string, outputPath: string): Promise<any> {
    return this.callTool('sync-design-tokens', { fileKey, tokenFormat, outputPath });
  }

  /**
   * Store a component for synchronization
   * @param fileKey - Figma file key
   * @param componentId - Component ID
   * @param componentName - Component name
   * @returns Storage result
   */
  async storeComponent(fileKey: string, componentId: string, componentName: string): Promise<any> {
    return this.callTool('store-component', { fileKey, componentId, componentName });
  }

  /**
   * Retrieve a stored component
   * @param componentName - Component name
   * @returns Component data
   */
  async retrieveComponent(componentName: string): Promise<any> {
    return this.callTool('retrieve-component', { componentName });
  }
}

/**
 * Create a configured Figma MCP bridge instance
 * @param figmaMcpUrl - URL of the Figma MCP server's HTTP endpoint
 * @param figmaToken - Figma personal access token
 * @returns Configured bridge instance
 */
export function createFigmaMcpBridge(figmaMcpUrl: string, figmaToken: string): FigmaMcpBridge {
  return new FigmaMcpBridge(figmaMcpUrl, figmaToken);
} 