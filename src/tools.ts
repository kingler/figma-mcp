/**
 * Tools for the MCP server
 */

import { ToolConfig, ToolHandler } from './types';

/**
 * Registry of all available tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolConfig>();
  
  /**
   * Register a new tool
   * @param tool - The tool configuration to register
   */
  registerTool(tool: ToolConfig): void {
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Get a tool by name
   * @param name - The name of the tool to retrieve
   * @returns The tool configuration or undefined if not found
   */
  getTool(name: string): ToolConfig | undefined {
    return this.tools.get(name);
  }
  
  /**
   * List all registered tools
   * @returns Array of tool configurations
   */
  listTools(): ToolConfig[] {
    return Array.from(this.tools.values());
  }
}

/**
 * Create a basic tool
 * @param name - The tool name
 * @param description - The tool description
 * @param parameters - The tool parameters
 * @param handler - The function that implements the tool
 * @returns A tool configuration
 */
export function createTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  handler: ToolHandler
): ToolConfig {
  return {
    name,
    description,
    parameters,
    handler
  };
} 