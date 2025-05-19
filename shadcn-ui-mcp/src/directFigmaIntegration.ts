/**
 * Direct integration with Figma API through shared code from figma-mcp
 * This is more efficient than the HTTP bridge approach as it avoids the overhead of HTTP requests
 */

// Import the actual Figma API client module
// We need to use require since it's a CommonJS module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FigmaAPI = require('/Users/kinglerbercy/MCP/figma-mcp/src/figma-api.js');

/**
 * Create a Figma API client instance
 * @param token - Figma API token
 * @returns Figma API client
 */
export function createFigmaApiClient(token: string) {
  // The Figma API instance already exists as a singleton with its token set from process.env
  // This function allows us to use a different token if needed
  // We trick the module by temporarily setting the env variable
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  process.env.FIGMA_ACCESS_TOKEN = token;
  
  // Create a new instance (will use the token we just set)
  const figmaApi = new FigmaAPI.constructor();
  
  // Restore the original token
  process.env.FIGMA_ACCESS_TOKEN = originalToken;
  
  return figmaApi;
}

/**
 * Wrapper for Figma API client functions with improved TypeScript types
 */
export class FigmaApiWrapper {
  private figmaApi: any;
  
  /**
   * Create a wrapper for the Figma API client
   * @param token - Figma API token
   */
  constructor(token: string) {
    this.figmaApi = createFigmaApiClient(token);
  }
  
  /**
   * Get file data by key
   * @param fileKey - Figma file key
   * @param opts - Options
   * @returns File data
   */
  async getFile(fileKey: string, opts: any = {}) {
    return this.figmaApi.getFile(fileKey, opts);
  }
  
  /**
   * Get file nodes by IDs
   * @param fileKey - Figma file key
   * @param ids - Node IDs
   * @returns Nodes data
   */
  async getFileNodes(fileKey: string, ids: string[]) {
    return this.figmaApi.getFileNodes(fileKey, ids);
  }
  
  /**
   * Get file components
   * @param fileKey - Figma file key
   * @returns Components data
   */
  async getFileComponents(fileKey: string) {
    return this.figmaApi.getFileComponents(fileKey);
  }
  
  /**
   * Get component instance data
   * @param componentKey - Component key
   * @returns Component data
   */
  async getComponent(componentKey: string) {
    return this.figmaApi.getComponent(componentKey);
  }
  
  /**
   * Get file variables and variable collections
   * @param fileKey - Figma file key
   * @returns Variables data
   */
  async getFileVariables(fileKey: string) {
    return this.figmaApi.getFileVariables(fileKey);
  }
  
  /**
   * Extract design tokens from file variables
   * 
   * Note: This is a custom function that processes the raw variable data
   * into a format more suitable for design tokens
   * 
   * @param fileKey - Figma file key
   * @returns Processed design tokens
   */
  async extractDesignTokens(fileKey: string) {
    // Get raw variables data
    const variablesData = await this.figmaApi.getFileVariables(fileKey);
    
    // Process into design tokens format
    // This is a simplified example - real implementation would do more processing
    const designTokens = {
      collections: variablesData.meta.variableCollections,
      variables: variablesData.meta.variables,
      processedAt: new Date().toISOString(),
      // Transform variables into categorized tokens
      tokens: processVariablesToTokens(variablesData)
    };
    
    return designTokens;
  }
}

/**
 * Process variables data into design tokens format
 * @param variablesData - Raw variables data from Figma API
 * @returns Processed design tokens
 */
function processVariablesToTokens(variablesData: any) {
  const tokens: Record<string, any> = {
    colors: {},
    spacing: {},
    typography: {},
    other: {}
  };
  
  // Simple categorization based on collection name and variable type
  // In a real implementation, this would be more sophisticated
  if (variablesData?.meta?.variables) {
    Object.entries(variablesData.meta.variables).forEach(([id, variable]: [string, any]) => {
      const collectionId = variable.variableCollectionId;
      const collection = variablesData.meta.variableCollections[collectionId];
      
      if (collection) {
        const category = determineTokenCategory(variable, collection);
        const name = variable.name.toLowerCase().replace(/\s+/g, '.');
        
        // Get the value from the default mode
        const defaultMode = Object.keys(collection.modes)[0];
        const value = variable.valuesByMode[defaultMode];
        
        // Add to appropriate category
        if (category === 'color' && typeof value === 'object' && value.r !== undefined) {
          tokens.colors[name] = rgbaToHex(value);
        } else if (category === 'spacing' && typeof value === 'number') {
          tokens.spacing[name] = `${value}px`;
        } else if (category === 'typography' && typeof value === 'object') {
          tokens.typography[name] = value;
        } else {
          tokens.other[name] = value;
        }
      }
    });
  }
  
  return tokens;
}

/**
 * Determine token category based on variable and collection
 * @param variable - Variable data
 * @param collection - Collection data
 * @returns Token category
 */
function determineTokenCategory(variable: any, collection: any): string {
  // Check collection name for clues
  const collectionName = collection.name.toLowerCase();
  
  if (collectionName.includes('color')) {
    return 'color';
  } else if (collectionName.includes('spacing') || collectionName.includes('size')) {
    return 'spacing';
  } else if (collectionName.includes('typography') || collectionName.includes('font')) {
    return 'typography';
  }
  
  // Check resolvedType
  switch (variable.resolvedType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'spacing';
    case 'STRING':
      return 'typography';
    default:
      return 'other';
  }
}

/**
 * Convert RGBA object to hex string
 * @param rgba - RGBA object
 * @returns Hex color string
 */
function rgbaToHex(rgba: { r: number, g: number, b: number, a?: number }): string {
  const { r, g, b, a = 1 } = rgba;
  
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a) : ''}`;
} 