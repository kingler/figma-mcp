/**
 * Configuration utilities for n8n MCP server
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { printError } from './colors.js';

/**
 * Get the path to the n8n MCP server build
 */
export function getN8nServerPath(): string {
  const currentDir = process.cwd();
  const serverPath = path.join(currentDir, 'build', 'index.js');
  
  if (!fs.existsSync(serverPath)) {
    printError(`n8n MCP server not found at ${serverPath}`);
    process.exit(1);
  }
  
  return serverPath;
}

/**
 * Get the n8n configuration from Claude Desktop config
 */
export function getN8nConfig(): { host: string; apiKey: string } {
  const homeDir = os.homedir();
  const configPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  
  if (!fs.existsSync(configPath)) {
    printError(`Claude Desktop configuration file not found at ${configPath}`);
    process.exit(1);
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    if (!config.mcpServers || !config.mcpServers.n8n) {
      printError('n8n MCP server not found in Claude Desktop configuration');
      process.exit(1);
    }
    
    const n8nConfig = config.mcpServers.n8n;
    
    if (!n8nConfig.env || !n8nConfig.env.N8N_HOST || !n8nConfig.env.N8N_API_KEY) {
      printError('n8n MCP server environment variables not configured');
      process.exit(1);
    }
    
    return {
      host: n8nConfig.env.N8N_HOST,
      apiKey: n8nConfig.env.N8N_API_KEY
    };
  } catch (error) {
    printError(`Error getting n8n configuration: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Check if n8n-mcp-server is properly configured in Claude Desktop
 */
export function checkClaudeConfig(): false | { host: string; apiKey: string } {
  const homeDir = os.homedir();
  const configPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  
  if (!fs.existsSync(configPath)) {
    printError(`Claude Desktop configuration file not found at ${configPath}`);
    return false;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    if (!config.mcpServers) {
      printError('No MCP servers configured in Claude Desktop');
      return false;
    }
    
    if (!config.mcpServers.n8n) {
      printError('n8n-mcp-server not found in Claude Desktop configuration');
      return false;
    }
    
    const n8nConfig = config.mcpServers.n8n;
    
    // Check if the server is enabled
    if (n8nConfig.disabled) {
      printError('n8n-mcp-server is disabled in Claude Desktop configuration');
      return false;
    }
    
    // Check if the command and args are properly configured
    if (!n8nConfig.command || !n8nConfig.args) {
      printError('n8n-mcp-server command or args not configured');
      return false;
    }
    
    // Check if the environment variables are properly configured
    if (!n8nConfig.env) {
      printError('n8n-mcp-server environment variables not configured');
      return false;
    }
    
    const env = n8nConfig.env;
    if (!env.N8N_HOST || !env.N8N_API_KEY) {
      printError('n8n-mcp-server N8N_HOST or N8N_API_KEY not configured');
      return false;
    }
    
    return {
      host: env.N8N_HOST,
      apiKey: env.N8N_API_KEY
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      printError(`Failed to parse Claude Desktop configuration file: ${configPath}`);
    } else {
      printError(`Error checking Claude Desktop configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}
