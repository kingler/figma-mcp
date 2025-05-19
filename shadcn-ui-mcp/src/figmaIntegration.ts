import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Define Figma API interfaces
interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks?: string[];
}

interface FigmaComponentSet {
  key: string;
  name: string;
  description: string;
  componentIds: string[];
}

interface FigmaPublishResponse {
  error: boolean;
  status: number;
  meta: {
    component?: FigmaComponent;
    componentSet?: FigmaComponentSet;
  };
}

/**
 * Figma API client class for library component management
 * Handles authentication, component retrieval, and publishing operations
 */
export class FigmaLibraryManager {
  private baseUrl: string = 'https://api.figma.com/v1';
  private headers: { [key: string]: string };

  /**
   * Create a new Figma Library Manager
   * @param token Figma personal access token
   */
  constructor(private token: string) {
    this.headers = {
      'X-Figma-Token': token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get information about a component in a file
   * @param fileKey Figma file key
   * @param componentId Component node ID
   * @returns Component data
   */
  async getComponent(fileKey: string, componentId: string): Promise<FigmaComponent> {
    try {
      const url = `${this.baseUrl}/files/${fileKey}/nodes?ids=${componentId}`;
      const response = await axios.get(url, { headers: this.headers });
      
      if (response.data.error) {
        throw new Error(`Figma API error: ${response.data.error}`);
      }

      const node = response.data.nodes[componentId]?.document;
      
      if (!node) {
        throw new Error(`Component not found: ${componentId}`);
      }

      return {
        key: componentId,
        name: node.name,
        description: node.description || '',
        componentSetId: node.componentSetId
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch component: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update a component in the Figma library
   * @param fileKey Figma file key
   * @param componentId Component ID to update
   * @param data Update data
   * @returns Response from Figma API
   */
  async updateComponent(fileKey: string, componentId: string, data: any): Promise<FigmaPublishResponse> {
    try {
      const url = `${this.baseUrl}/components/${fileKey}/${componentId}`;
      const response = await axios.put(url, data, { headers: this.headers });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update component: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all components in a file
   * @param fileKey Figma file key
   * @returns List of components
   */
  async getFileComponents(fileKey: string): Promise<FigmaComponent[]> {
    try {
      const url = `${this.baseUrl}/files/${fileKey}/components`;
      const response = await axios.get(url, { headers: this.headers });
      
      if (response.data.error) {
        throw new Error(`Figma API error: ${response.data.error}`);
      }

      return response.data.meta.components;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch file components: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Extract metadata from a shadcn/ui component for publishing to Figma
 * @param projectRoot Path to the project root
 * @param componentName Name of the component to extract metadata from
 * @returns Component metadata
 */
export async function getShadcnComponentMetadata(projectRoot: string, componentName: string) {
  try {
    // Try to find the component file
    const componentPath = path.join(projectRoot, 'components', 'ui', `${componentName}.tsx`);
    
    // Check if the file exists
    await fs.access(componentPath);
    
    // Read the component file
    const componentCode = await fs.readFile(componentPath, 'utf-8');
    
    // Extract metadata from the component code
    const metadata = {
      name: componentName,
      description: extractDescription(componentCode),
      variants: extractVariants(componentCode),
      props: extractProps(componentCode),
      dependencies: extractDependencies(componentCode),
      examples: await extractExamples(projectRoot, componentName)
    };
    
    return metadata;
  } catch (error) {
    throw new Error(`Failed to extract component metadata: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract component description from code
 * @param code Component source code
 * @returns Description string
 */
function extractDescription(code: string): string {
  // Try to extract JSDoc comment
  const jsdocMatch = code.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
  if (jsdocMatch) {
    return jsdocMatch[1]
      .replace(/\s*\*\s*/g, ' ')
      .replace(/@\w+\s+[^\n]*/g, '') // Remove JSDoc tags
      .trim();
  }
  
  // Try to extract simple comment
  const commentMatch = code.match(/\/\/\s*(.+)/);
  if (commentMatch) {
    return commentMatch[1].trim();
  }
  
  return 'No description available';
}

/**
 * Extract variants from component code
 * @param code Component source code
 * @returns Array of variant names
 */
function extractVariants(code: string): string[] {
  const variants: string[] = [];
  
  // Look for variant patterns in the code
  const variantMatch = code.match(/variants\s*:\s*{\s*([\s\S]*?)\s*}/);
  if (variantMatch) {
    const variantBlock = variantMatch[1];
    const variantLines = variantBlock.split('\n');
    
    for (const line of variantLines) {
      const nameMatch = line.match(/\s*(\w+)\s*:/);
      if (nameMatch) {
        variants.push(nameMatch[1]);
      }
    }
  }
  
  return variants;
}

/**
 * Extract props from component code
 * @param code Component source code
 * @returns Array of prop definitions
 */
function extractProps(code: string): Array<{ name: string, type: string, required: boolean, description: string }> {
  const props: Array<{ name: string, type: string, required: boolean, description: string }> = [];
  
  // Look for interface or type definitions
  const interfaceMatch = code.match(/interface\s+(\w+Props)\s*{\s*([\s\S]*?)\s*}/);
  if (interfaceMatch) {
    const propsBlock = interfaceMatch[2];
    const propLines = propsBlock.split('\n');
    
    for (const line of propLines) {
      // Parse prop definitions like: name?: type; // description
      const propMatch = line.match(/\s*(\w+)(\??):\s*([^;]+);(?:\s*\/\/\s*(.+))?/);
      if (propMatch) {
        props.push({
          name: propMatch[1],
          type: propMatch[3].trim(),
          required: propMatch[2] !== '?',
          description: propMatch[4]?.trim() || 'No description'
        });
      }
    }
  }
  
  return props;
}

/**
 * Extract dependencies from component code
 * @param code Component source code
 * @returns Array of dependency imports
 */
function extractDependencies(code: string): string[] {
  const dependencies: string[] = [];
  
  // Extract import statements
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const imports = match[1].split(',').map(i => i.trim());
    const source = match[2];
    
    if (!source.startsWith('.')) {
      // External dependency
      dependencies.push(source);
    } else {
      // Internal dependency, might be another component
      if (source.includes('/ui/')) {
        const component = source.split('/').pop();
        if (component) {
          dependencies.push(component);
        }
      }
    }
  }
  
  return [...new Set(dependencies)]; // Remove duplicates
}

/**
 * Extract examples from component code
 * @param projectRoot Project root path
 * @param componentName Component name
 * @returns Array of code examples
 */
async function extractExamples(projectRoot: string, componentName: string): Promise<string[]> {
  try {
    // Try to find examples in a examples directory
    const examplesPath = path.join(projectRoot, 'components', 'examples', componentName);
    
    try {
      // Check if directory exists
      await fs.access(examplesPath);
      
      // Read all example files
      const files = await fs.readdir(examplesPath);
      
      // Read content of each example file
      const examples = await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(path.join(examplesPath, file), 'utf-8');
          return content;
        })
      );
      
      return examples;
    } catch {
      // No examples directory found, try to find examples in the component file itself
      const componentPath = path.join(projectRoot, 'components', 'ui', `${componentName}.tsx`);
      const componentCode = await fs.readFile(componentPath, 'utf-8');
      
      // Extract code between usage example comments
      const exampleMatch = componentCode.match(/\/\/ Example usage([\s\S]*?)\/\/ End example/);
      if (exampleMatch) {
        return [exampleMatch[1].trim()];
      }
      
      return ['No examples found'];
    }
  } catch {
    return ['No examples found'];
  }
}

/**
 * Publish a shadcn/ui component to Figma as a library component
 * @param options Publication options
 * @returns Result of the publication
 */
export async function publishShadcnComponentToFigma(options: {
  projectRoot: string,
  componentName: string,
  figmaToken: string,
  figmaFileKey: string,
  figmaComponentId?: string
}) {
  const { projectRoot, componentName, figmaToken, figmaFileKey, figmaComponentId } = options;
  
  try {
    // Extract component metadata
    const metadata = await getShadcnComponentMetadata(projectRoot, componentName);
    
    // Create a Figma API client
    const figmaClient = new FigmaLibraryManager(figmaToken);
    
    if (figmaComponentId) {
      // Update existing component
      return await figmaClient.updateComponent(figmaFileKey, figmaComponentId, {
        name: metadata.name,
        description: metadata.description
      });
    } else {
      // Create new component (not possible via REST API directly)
      throw new Error("Creating new Figma components requires using the Figma Plugin API, not possible via REST API");
    }
  } catch (error) {
    throw new Error(`Failed to publish component to Figma: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Schema for Figma library component management
 */
export const figmaLibrarySchema = {
  publishToFigmaLibrary: {
    projectRoot: z.string().describe("Absolute path to the root of the target project."),
    componentName: z.string().describe("Name of the component to publish to Figma."),
    figmaToken: z.string().describe("Figma personal access token with library permissions."),
    figmaFileKey: z.string().describe("Figma file key where the library component exists."),
    figmaComponentId: z.string().optional().describe("Existing Figma component ID (if updating).")
  }
}; 