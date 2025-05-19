import fs from 'fs/promises';
import path from 'path';
import { FigmaMcpBridge, createFigmaMcpBridge } from './figmaMcpBridge.js';

interface FigmaMcpConfig {
  mcpUrl: string;
  accessToken: string;
  isConfigured: boolean;
}

/**
 * Default configuration for Figma MCP connection
 */
const DEFAULT_CONFIG: FigmaMcpConfig = {
  mcpUrl: 'http://localhost:3010',
  accessToken: '',
  isConfigured: false
};

/**
 * Cache for the Figma MCP bridge instance
 */
let figmaMcpBridgeInstance: FigmaMcpBridge | null = null;

/**
 * Load Figma MCP configuration from the user's MCP configuration file
 * @returns Configuration object for connecting to Figma MCP
 */
export async function loadFigmaMcpConfig(): Promise<FigmaMcpConfig> {
  try {
    // Path to the user's .cursor/mcp.json file
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      console.warn('Could not determine home directory for MCP config loading');
      return DEFAULT_CONFIG;
    }

    const mcpConfigPath = path.join(homeDir, '.cursor', 'mcp.json');
    
    // Check if the file exists
    try {
      await fs.access(mcpConfigPath);
    } catch (error) {
      console.warn(`MCP config file not found at ${mcpConfigPath}`);
      return DEFAULT_CONFIG;
    }
    
    // Read and parse the file
    const configContent = await fs.readFile(mcpConfigPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Check if figma MCP server is configured
    if (!config.mcpServers?.figma) {
      console.warn('Figma MCP server not configured in MCP config');
      return DEFAULT_CONFIG;
    }
    
    // Extract Figma access token from config
    const figmaConfig = config.mcpServers.figma;
    const accessToken = figmaConfig.env?.FIGMA_ACCESS_TOKEN || '';
    
    if (!accessToken) {
      console.warn('Figma access token not found in MCP config');
      return DEFAULT_CONFIG;
    }
    
    return {
      mcpUrl: 'http://localhost:3010', // Assuming Figma MCP runs on this port, adjust as needed
      accessToken,
      isConfigured: true
    };
  } catch (error) {
    console.error('Error loading Figma MCP config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get a configured Figma MCP bridge instance
 * Creates a new instance if one doesn't exist, or returns the cached instance
 * @param forceRefresh - Whether to force creation of a new instance
 * @returns Promise resolving to a configured FigmaMcpBridge
 */
export async function getFigmaMcpBridge(forceRefresh = false): Promise<FigmaMcpBridge | null> {
  if (!figmaMcpBridgeInstance || forceRefresh) {
    const config = await loadFigmaMcpConfig();
    
    if (!config.isConfigured) {
      console.warn('Figma MCP not properly configured');
      return null;
    }
    
    figmaMcpBridgeInstance = createFigmaMcpBridge(config.mcpUrl, config.accessToken);
  }
  
  return figmaMcpBridgeInstance;
}

/**
 * Check if Figma MCP integration is available
 * @returns Promise resolving to true if Figma MCP is configured and available
 */
export async function isFigmaMcpAvailable(): Promise<boolean> {
  const config = await loadFigmaMcpConfig();
  return config.isConfigured;
} 