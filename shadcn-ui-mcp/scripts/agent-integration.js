#!/usr/bin/env node

/**
 * Shadcn-UI MCP Agent Integration Script
 * 
 * This script provides integration between the shadcn-ui-mcp server and the
 * multi-agent system (MAS) architecture with UI Developer, UX Designer, and UI Designer agents.
 * 
 * The script establishes communication channels and synchronization between:
 * - UI Developer Agent (this server - shadcn-ui-mcp)
 * - UX Designer Agent Server (/Users/kinglerbercy/MCP/mas-mcp/ux-designer-server)
 * - UI Designer Agent Server (/Users/kinglerbercy/MCP/mas-mcp/ui-designer-server)
 * - UI Generator (/Users/kinglerbercy/MCP/mas-mcp/ui-generator)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Agent server paths and ports
const AGENT_CONFIG = {
  "ui-developer": {
    name: "UI Developer Agent",
    path: path.resolve(__dirname, '..'),
    port: 3000,
    endpoint: "http://localhost:3000"
  },
  "ux-designer": {
    name: "UX Designer Agent",
    path: "/Users/kinglerbercy/MCP/mas-mcp/ux-designer-server",
    port: 3001,
    endpoint: "http://localhost:3001"
  },
  "ui-designer": {
    name: "UI Designer Agent",
    path: "/Users/kinglerbercy/MCP/mas-mcp/ui-designer-server",
    port: 3002,
    endpoint: "http://localhost:3002"
  },
  "ui-generator": {
    name: "UI Generator",
    path: "/Users/kinglerbercy/MCP/mas-mcp/ui-generator",
    port: 3003,
    endpoint: "http://localhost:3003"
  }
};

// Command line arguments
const args = process.argv.slice(2);
const command = args[0];

/**
 * Check if all agent servers are running
 * @returns {Promise<Object>} Status of each agent
 */
async function checkAgentStatus() {
  const statuses = {};
  
  for (const [key, agent] of Object.entries(AGENT_CONFIG)) {
    try {
      const response = await fetch(`${agent.endpoint}/status`, {
        method: 'GET',
        timeout: 3000
      });
      
      if (response.ok) {
        const data = await response.json();
        statuses[key] = {
          running: true,
          version: data.version || 'unknown',
          status: data.status || 'active'
        };
      } else {
        statuses[key] = { running: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      statuses[key] = { running: false, error: error.message };
    }
  }
  
  return statuses;
}

/**
 * Synchronize Figma design tokens across agent systems
 * @param {string} figmaFileKey - Figma file key to extract tokens from
 * @param {string} projectRoot - Target project root directory
 * @returns {Promise<Object>} Synchronization results
 */
async function syncDesignTokens(figmaFileKey, projectRoot) {
  if (!figmaFileKey) {
    console.error('Error: Figma file key is required');
    process.exit(1);
  }
  
  if (!projectRoot) {
    projectRoot = process.cwd();
  }
  
  try {
    // 1. Request UI Designer Agent to extract design tokens from Figma
    console.log('Requesting design token extraction from UI Designer Agent...');
    const extractResponse = await fetch(`${AGENT_CONFIG['ui-designer'].endpoint}/extract-design-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ figmaFileKey })
    });
    
    if (!extractResponse.ok) {
      throw new Error(`Failed to extract design tokens: HTTP ${extractResponse.status}`);
    }
    
    const designTokens = await extractResponse.json();
    
    // 2. Apply design tokens to shadcn/ui theme
    console.log('Applying design tokens to shadcn/ui theme...');
    const applyResponse = await fetch(`${AGENT_CONFIG['ui-developer'].endpoint}/mcp/shadcn-ui-mcp/apply_design_tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectRoot,
        designTokens: designTokens.tokens
      })
    });
    
    if (!applyResponse.ok) {
      throw new Error(`Failed to apply design tokens: HTTP ${applyResponse.status}`);
    }
    
    const applyResult = await applyResponse.json();
    
    // 3. Notify UX Designer Agent about the applied tokens
    console.log('Notifying UX Designer Agent...');
    await fetch(`${AGENT_CONFIG['ux-designer'].endpoint}/design-token-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectRoot,
        designTokens: designTokens.tokens,
        appliedChanges: applyResult
      })
    });
    
    return {
      success: true,
      tokens: designTokens.tokens,
      appliedChanges: applyResult
    };
  } catch (error) {
    console.error('Error syncing design tokens:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate components based on Figma designs using atomic design principles
 * @param {string} figmaFileKey - Figma file key to extract components from
 * @param {string} projectRoot - Target project root directory
 * @param {string} nodeId - Optional Figma node ID to limit scope 
 * @returns {Promise<Object>} Generation results
 */
async function generateAtomicComponents(figmaFileKey, projectRoot, nodeId = null) {
  if (!figmaFileKey) {
    console.error('Error: Figma file key is required');
    process.exit(1);
  }
  
  if (!projectRoot) {
    projectRoot = process.cwd();
  }
  
  try {
    // 1. Get component specifications from UI Designer
    console.log('Requesting component specifications from UI Designer Agent...');
    const specsResponse = await fetch(`${AGENT_CONFIG['ui-designer'].endpoint}/component-specifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        figmaFileKey,
        nodeId
      })
    });
    
    if (!specsResponse.ok) {
      throw new Error(`Failed to get component specifications: HTTP ${specsResponse.status}`);
    }
    
    const componentSpecs = await specsResponse.json();
    
    // 2. Generate atomic components structure
    console.log('Generating atomic design component structure...');
    
    // Organize components by atomic category
    const atomicComponents = {
      atoms: [],
      molecules: [],
      organisms: [],
      templates: []
    };
    
    // Map components to their atomic categories
    for (const component of componentSpecs.components) {
      const category = component.atomicCategory || determineAtomicCategory(component);
      if (atomicComponents[category]) {
        atomicComponents[category].push(component);
      }
    }
    
    // 3. Generate components using the UI Generator
    console.log('Generating components with UI Generator...');
    const generateResponse = await fetch(`${AGENT_CONFIG['ui-generator'].endpoint}/generate-components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectRoot,
        components: atomicComponents
      })
    });
    
    if (!generateResponse.ok) {
      throw new Error(`Failed to generate components: HTTP ${generateResponse.status}`);
    }
    
    const generationResult = await generateResponse.json();
    
    // 4. Import components into project using shadcn-ui-mcp
    console.log('Installing required shadcn/ui components...');
    
    // Get unique list of required shadcn components
    const requiredComponents = [...new Set(
      componentSpecs.components
        .flatMap(c => c.requiredShadcnComponents || [])
    )];
    
    // Install each required shadcn component
    for (const component of requiredComponents) {
      const addResponse = await fetch(`${AGENT_CONFIG['ui-developer'].endpoint}/mcp/shadcn-ui-mcp/add_component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentName: component,
          projectRoot
        })
      });
      
      if (!addResponse.ok) {
        console.warn(`Warning: Failed to add component ${component}: HTTP ${addResponse.status}`);
      }
    }
    
    return {
      success: true,
      generatedComponents: generationResult.components,
      atomicStructure: atomicComponents
    };
  } catch (error) {
    console.error('Error generating atomic components:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Determine which atomic design category a component belongs to
 * @param {Object} component - Component specification
 * @returns {string} Atomic category (atoms, molecules, organisms, templates)
 */
function determineAtomicCategory(component) {
  // Simple heuristic based on component properties
  const { complexity, children, variants, interactions } = component;
  
  if (complexity <= 2 && children.length === 0) {
    return 'atoms';
  } else if (complexity <= 4 && children.length <= 3) {
    return 'molecules';
  } else if (complexity <= 7 || (children.length > 3 && children.length <= 10)) {
    return 'organisms';
  } else {
    return 'templates';
  }
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Shadcn-UI MCP Agent Integration Script

Usage:
  node scripts/agent-integration.js <command> [options]

Commands:
  status                        Check status of all agent servers
  sync-tokens <figmaFileKey>    Sync design tokens from Figma to shadcn/ui
  generate <figmaFileKey>       Generate atomic components from Figma design
  help                          Show this help message

Options:
  --project-root <path>         Target project root directory
  --node-id <nodeId>            Specific Figma node ID (for generate command)

Examples:
  node scripts/agent-integration.js status
  node scripts/agent-integration.js sync-tokens Abc123XyZ --project-root /path/to/project
  node scripts/agent-integration.js generate Abc123XyZ --node-id 123:456
  `);
}

// Main execution
async function main() {
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      options[key] = args[i+1];
      i++;
    } else if (!options.figmaFileKey && !command.includes('status') && !command.includes('help')) {
      options.figmaFileKey = args[i];
    }
  }
  
  switch (command) {
    case 'status':
      console.log('Checking agent status...');
      const status = await checkAgentStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'sync-tokens':
      console.log('Synchronizing design tokens...');
      const syncResult = await syncDesignTokens(options.figmaFileKey, options['project-root']);
      console.log(JSON.stringify(syncResult, null, 2));
      break;
      
    case 'generate':
      console.log('Generating atomic components...');
      const generateResult = await generateAtomicComponents(
        options.figmaFileKey, 
        options['project-root'],
        options['node-id']
      );
      console.log(JSON.stringify(generateResult, null, 2));
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Make the script executable
try {
  execSync(`chmod +x ${__filename}`);
} catch (error) {
  // Ignore chmod errors on Windows
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 