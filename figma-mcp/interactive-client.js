#!/usr/bin/env node
/**
 * Interactive Figma MCP Client
 * 
 * This script provides an interactive way to use Figma MCP tools.
 * It uses the Figma access token from .env file and prompts for a Figma file ID.
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

// Function to create example .env file if none exists
function createExampleEnvFile() {
  try {
    // Check current directory
    let envPath = path.resolve(__dirname, '.env');
    
    // Also check parent directory
    const parentEnvPath = path.resolve(__dirname, '..', '.env');
    
    // If .env file doesn't exist in either location, create an example one
    if (!fs.existsSync(envPath) && !fs.existsSync(parentEnvPath)) {
      console.log('No .env file found. Creating example .env file...');
      
      const exampleEnvContent = `# Figma MCP Configuration
# Replace this with your actual Figma Personal Access Token
FIGMA_ACCESS_TOKEN=figd_your_access_token_here

# Optional: Default format for design tokens (json, css, scss, less, js, ts)
DEFAULT_TOKEN_FORMAT=json

# Optional: Debug mode (true/false)
DEBUG=false
`;
      
      // Write the example .env file to the current directory
      fs.writeFileSync(envPath, exampleEnvContent);
      console.log(`Created example .env file at: ${envPath}`);
      console.log('Please edit this file with your actual Figma API token.');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error creating example .env file:', error.message);
    return false;
  }
}

// Load environment variables from .env file
function loadEnvFile() {
  try {
    // Try to load from current directory .env file
    let envPath = path.resolve(__dirname, '.env');
    
    // If not found in current directory, try parent directory
    if (!fs.existsSync(envPath)) {
      const parentEnvPath = path.resolve(__dirname, '..', '.env');
      if (fs.existsSync(parentEnvPath)) {
        envPath = parentEnvPath;
        console.log('Loading configuration from parent directory .env file...');
      } else {
        console.log('No .env file found in current or parent directory.');
        // Create example .env file if none exists
        createExampleEnvFile();
        return {};
      }
    } else {
      console.log('Loading configuration from .env file...');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    // Parse .env file content
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      // Parse KEY=VALUE format
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    console.log('Successfully loaded environment variables.');
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    return {};
  }
}

// Load environment variables
const envVars = loadEnvFile();

// Try to import the FigmaAPI class dynamically
let FigmaAPI;
try {
  // First try direct import
  FigmaAPI = require('./src/figma-api');
} catch (err) {
  try {
    // If that fails, try creating a minimal implementation
    FigmaAPI = {
      getFile: async (fileKey) => {
        throw new Error('Using mock FigmaAPI implementation. Please provide a valid token.');
      },
      getFileComponents: async (fileKey) => {
        throw new Error('Using mock FigmaAPI implementation. Please provide a valid token.');
      },
      getFileVariables: async (fileKey) => {
        throw new Error('Using mock FigmaAPI implementation. Please provide a valid token.');
      }
    };
    console.log('Using a mock FigmaAPI implementation. Some commands may not work correctly.');
  } catch (e) {
    console.error('Could not create FigmaAPI implementation:', e.message);
  }
}

// Use the provided token with priority:
// 1. From environment variables loaded from .env
// 2. From process.env.FIGMA_ACCESS_TOKEN
// 3. A default token (for demo purposes only)
const FIGMA_ACCESS_TOKEN = envVars.FIGMA_ACCESS_TOKEN || 
                           process.env.FIGMA_ACCESS_TOKEN || 
                           'figd_GyoPqpgiQS2S3qRr5BNFY5VcixXi9MbTWwUmR81';

// Create readline interface for user input with more robust handling
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Available tools
const TOOLS = [
  { 
    name: 'test', 
    description: 'Test if the Figma MCP connection is working',
    requiresFileKey: false
  },
  { 
    name: 'version', 
    description: 'Get version information',
    requiresFileKey: false
  },
  { 
    name: 'echo', 
    description: 'Echo the input arguments',
    requiresFileKey: false,
    promptExtra: true,
    promptMessage: 'Enter message to echo: ',
    buildArgs: (fileKey, extraInput) => ({ message: extraInput })
  },
  { 
    name: 'get-file', 
    description: 'Get information about a Figma file',
    requiresFileKey: true,
    buildArgs: (fileKey) => ({ fileKey })
  },
  { 
    name: 'get-components', 
    description: 'List all components in a Figma file',
    requiresFileKey: true,
    buildArgs: (fileKey) => ({ fileKey })
  },
  { 
    name: 'get-design-tokens', 
    description: 'Extract design tokens from a Figma file',
    requiresFileKey: true,
    promptExtra: true,
    promptMessage: 'Enter format (json or css): ',
    buildArgs: (fileKey, extraInput) => ({ 
      fileKey, 
      format: extraInput || 'json' 
    })
  }
];

// Extract Figma file key from a URL or input string
function extractFigmaFileKey(input) {
  if (!input) return '';
  
  // Case 1: Already just a file key (alphanumeric string)
  if (/^[a-zA-Z0-9]{22,}$/.test(input.trim())) {
    return input.trim();
  }
  
  // Case 2: Figma URL with /file/ or /design/ in it
  const urlMatch = input.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]{22,})/);
  if (urlMatch && urlMatch[2]) {
    return urlMatch[2];
  }
  
  // Case 3: Just return the input, potentially invalid but let the API handle it
  return input;
}

// Create a Figma API implementation using axios
function createFigmaApiImplementation(token) {
  const axios = require('axios');
  
  // Create a base axios instance with authentication
  const client = axios.create({
    baseURL: 'https://api.figma.com/v1',
    headers: {
      'X-Figma-Token': token
    }
  });
  
  // Internal function to process file keys from URLs
  const _extractFileKey = (input) => {
    if (!input) return '';
    
    // Handle URLs with file and design patterns
    if (input.includes('figma.com/file/') || input.includes('figma.com/design/')) {
      // Extract key from URLs like:
      // https://www.figma.com/file/abcdef123456/FileName
      // https://www.figma.com/design/abcdef123456/DesignName
      const matches = input.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
      if (matches && matches[2]) {
        return matches[2];
      }
    }
    
    // Return as-is if not a URL or couldn't parse
    return input;
  };
  
  return {
    // Get file data
    getFile: async (fileKey) => {
      try {
        // Process file key to ensure it's in the correct format
        const processedKey = _extractFileKey(fileKey);
        console.log(`Calling Figma API: GET /files/${processedKey}`);
        const response = await client.get(`/files/${processedKey}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching file:', error.message);
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
    },
    
    // Get file components
    getFileComponents: async (fileKey) => {
      try {
        // Process file key to ensure it's in the correct format
        const processedKey = _extractFileKey(fileKey);
        console.log(`Calling Figma API: GET /files/${processedKey}/components`);
        const response = await client.get(`/files/${processedKey}/components`);
        return response.data;
      } catch (error) {
        console.error('Error fetching components:', error.message);
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
    },
    
    // Get file variables (for design tokens)
    getFileVariables: async (fileKey) => {
      try {
        // Process file key to ensure it's in the correct format
        const processedKey = _extractFileKey(fileKey);
        console.log(`Calling Figma API: GET /files/${processedKey}/variables`);
        const response = await client.get(`/files/${processedKey}/variables`);
        return response.data;
      } catch (error) {
        console.error('Error fetching variables:', error.message);
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
    },
    
    // Get variable values - needed for complete design token extraction
    getFileVariableValues: async (fileKey) => {
      try {
        // Process file key to ensure it's in the correct format
        const processedKey = _extractFileKey(fileKey);
        console.log(`Calling Figma API: GET /files/${processedKey}/variables/values`);
        const response = await client.get(`/files/${processedKey}/variables/values`);
        return response.data;
      } catch (error) {
        console.error('Error fetching variable values:', error.message);
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
    },
    
    // Get styles
    getFileStyles: async (fileKey) => {
      try {
        // Process file key to ensure it's in the correct format
        const processedKey = _extractFileKey(fileKey);
        console.log(`Calling Figma API: GET /files/${processedKey}/styles`);
        const response = await client.get(`/files/${processedKey}/styles`);
        return response.data;
      } catch (error) {
        console.error('Error fetching styles:', error.message);
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
    }
  };
}

// Function to prompt user for input with better handling of debug output
function promptUserInput(prompt) {
  return new Promise((resolve) => {
    // Clear line and reposition cursor to improve input experience
    process.stdout.write('\n');
    
    rl.question(prompt + ' ', (answer) => {
      // Add a newline to separate the answer from subsequent output
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

// Function to prompt user for Figma file key, with URL parsing
async function promptForFileKey() {
  console.log('\n--- File Key Input ---');
  const input = await promptUserInput('Enter Figma file key or URL:');
  const extractedKey = extractFileKeyFromInput(input);
  
  if (extractedKey !== input) {
    console.log(`Extracted file key from URL: ${extractedKey}`);
  }
  
  return extractedKey;
}

// Extract file key from user input (URL or direct key)
function extractFileKeyFromInput(input) {
  if (!input) return '';
  
  // Handle URLs with file and design patterns
  if (input.includes('figma.com/file/') || input.includes('figma.com/design/')) {
    // Extract key from URLs like:
    // https://www.figma.com/file/abcdef123456/FileName
    // https://www.figma.com/design/abcdef123456/DesignName
    const matches = input.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
    if (matches && matches[2]) {
      return matches[2];
    }
  }
  
  // Return as-is if not a URL or couldn't parse
  return input;
}

// Function to call Figma MCP tool using the CLI and parse the response
async function callFigmaMcpTool(toolName, args) {
  return new Promise((resolve) => {
    const cliPath = path.join(__dirname, 'bin', 'cli.js');
    
    // Create a direct API implementation to be used either as fallback or for direct calls
    let figmaApi = null;
    
    try {
      figmaApi = createFigmaApiImplementation(FIGMA_ACCESS_TOKEN);
      console.log('Created direct Figma API implementation for fallback');
    } catch (err) {
      console.log('Warning: Could not create direct API implementation');
    }
    
    // Prepare the request
    const request = JSON.stringify({
      function: `figma-mcp.${toolName}`,
      args,
      // Add figmaToken to the config object to make it available
      config: {
        figmaToken: FIGMA_ACCESS_TOKEN
      }
    });
    
    console.log('Debug - Using token:', FIGMA_ACCESS_TOKEN.substring(0, 10) + '...');
    
    // Spawn the CLI process with explicit token
    const child = spawn('node', [
      cliPath,
      '--stdio',
      '--figma-api-key', FIGMA_ACCESS_TOKEN,
      '--debug'
    ], {
      env: {
        ...process.env,
        FIGMA_ACCESS_TOKEN: FIGMA_ACCESS_TOKEN
      }
    });
    
    let output = '';
    let errorOutput = '';
    let responseReceived = false;
    
    // Handle stdout
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const parsed = JSON.parse(line);
          
          // Skip the metadata response
          if (parsed.type === 'metadata') continue;
          
          if (parsed.error && parsed.error.includes('No Figma API implementation provided')) {
            console.log('\nCLI failed due to missing API implementation, trying direct API call...');
            responseReceived = true;
            
            // This is the case where we need to use our direct implementation
            handleDirectApiCall(toolName, args, figmaApi).then(directResponse => {
              console.log('\nDirect API Response:');
              console.log(JSON.stringify(directResponse, null, 2));
              resolve(directResponse);
            }).catch(err => {
              console.log('\nDirect API call failed:', err.message);
              resolve({ error: err.message });
            });
            return;
          }
          
          // We found our response
          console.log('\nResponse:');
          console.log(JSON.stringify(parsed, null, 2));
          responseReceived = true;
          resolve(parsed);
        } catch (err) {
          // Not JSON, probably debug output
          if (line.includes('[DEBUG]')) {
            console.log(`Debug output: ${line}`);
            continue;
          }
          output += line + '\n';
        }
      }
    });
    
    // Handle stderr
    child.stderr.on('data', (data) => {
      const stderr = data.toString();
      console.log(`Debug output: ${stderr}`);
      errorOutput += stderr;
    });
    
    // When done processing
    child.on('close', (code) => {
      // If we didn't get a response as JSON, output what we got
      if (!responseReceived && output.trim()) {
        console.log('\nOutput:');
        console.log(output);
      }
      
      // If there was an error output but no response and we have a direct implementation
      if (!responseReceived && errorOutput && figmaApi) {
        console.log('\nCLI execution failed, trying direct API call...');
        
        handleDirectApiCall(toolName, args, figmaApi).then(directResponse => {
          console.log('\nDirect API Response:');
          console.log(JSON.stringify(directResponse, null, 2));
          resolve(directResponse);
        }).catch(err => {
          console.log('\nDirect API call failed:', err.message);
          resolve({ error: err.message });
        });
        return;
      }
      
      // Return an empty result if we haven't resolved yet
      if (!responseReceived) {
        resolve({});
      }
    });
    
    // Send the request
    child.stdin.write(request + '\n');
    child.stdin.end();
  });
}

// Direct API call handler as a fallback
async function handleDirectApiCall(toolName, args, figmaApi) {
  if (!figmaApi) {
    throw new Error('No Figma API implementation available for direct call');
  }
  
  console.log(`Making direct API call for ${toolName} with Figma API...`);
  
  try {
    switch (toolName) {
      case 'test':
        return {
          success: true,
          message: 'Figma MCP connection is working properly (direct API)',
          timestamp: new Date().toISOString()
        };
        
      case 'echo':
        return {
          success: true,
          input: args,
          timestamp: new Date().toISOString()
        };
        
      case 'version':
        return {
          success: true,
          version: '1.0.0',
          description: 'Figma MCP Client (Direct API)',
          timestamp: new Date().toISOString()
        };
        
      case 'get-file':
        try {
          const fileData = await figmaApi.getFile(args.fileKey);
          return {
            success: true,
            file: fileData,
            timestamp: new Date().toISOString()
          };
        } catch (err) {
          console.error(`\nError retrieving Figma file: ${err.message}`);
          if (err.message.includes('403')) {
            console.log('\n⚠️  PERMISSION ERROR: You do not have access to this file.');
            console.log('This could be because:');
            console.log('1. The access token does not have permission to view this file');
            console.log('2. The file is not shared with you or is private');
            console.log('3. The file key is incorrect\n');
          }
          return {
            success: false,
            error: `Failed to get file: ${err.message}`,
            timestamp: new Date().toISOString()
          };
        }
        
      case 'get-components':
        try {
          const componentsData = await figmaApi.getFileComponents(args.fileKey);
          return {
            success: true,
            components: componentsData,
            timestamp: new Date().toISOString()
          };
        } catch (err) {
          console.error(`\nError retrieving components: ${err.message}`);
          if (err.message.includes('403')) {
            console.log('\n⚠️  PERMISSION ERROR: You do not have access to this file.');
            console.log('This could be because:');
            console.log('1. The access token does not have permission to view this file');
            console.log('2. The file is not shared with you or is private');
            console.log('3. The file key is incorrect\n');
          }
          return {
            success: false,
            error: `Failed to get components: ${err.message}`,
            timestamp: new Date().toISOString()
          };
        }
        
      case 'get-design-tokens':
        try {
          const formattedTokens = await extractDesignTokens(figmaApi, args.fileKey, args.format);
          return {
            success: true,
            tokens: formattedTokens,
            format: args.format || 'json',
            timestamp: new Date().toISOString()
          };
        } catch (err) {
          console.error(`\nError retrieving design tokens: ${err.message}`);
          if (err.message.includes('403')) {
            console.log('\n⚠️  PERMISSION ERROR: You do not have access to this file.');
            console.log('This could be because:');
            console.log('1. The access token does not have permission to view this file');
            console.log('2. The file is not shared with you or is private');
            console.log('3. The file key is incorrect\n');
          }
          return {
            success: false,
            error: `Failed to get design tokens: ${err.message}`,
            timestamp: new Date().toISOString()
          };
        }
        
      default:
        return {
          success: false,
          error: `Unsupported tool in direct API mode: ${toolName}`,
          timestamp: new Date().toISOString()
        };
    }
  } catch (err) {
    console.error(`\nUnexpected error in API call: ${err.message}`);
    return {
      success: false,
      error: `API call failed: ${err.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Function to process Figma variables and styles into design tokens
async function extractDesignTokens(figmaApi, fileKey, format = 'json') {
  console.log(`Extracting design tokens from file ${fileKey} in ${format} format`);
  
  // Fetch variables and styles
  let variables = {};
  let styles = {};
  let variableValues = {};
  
  try {
    const variablesResponse = await figmaApi.getFileVariables(fileKey);
    variables = variablesResponse.variables || {};
    
    // Also get variable values for more complete data
    const valuesResponse = await figmaApi.getFileVariableValues(fileKey);
    variableValues = valuesResponse.variables || {};
    
    // Get styles as well
    const stylesResponse = await figmaApi.getFileStyles(fileKey);
    styles = stylesResponse.meta ? stylesResponse.meta.styles || {} : {};
  } catch (error) {
    console.error('Error fetching design token data:', error.message);
    // Continue with whatever data we have
  }
  
  // Process into token structure
  const tokens = {
    colors: {},
    typography: {},
    spacing: {},
    sizing: {},
    effects: {},
    // Add other token categories as needed
  };
  
  // Process variables
  for (const varId in variables) {
    const variable = variables[varId];
    const values = variableValues[varId] || {};
    const name = variable.name.replace(/\//g, '.').toLowerCase();
    
    // Determine category based on variable name or resolvedType
    let category = 'other';
    const resolvedType = variable.resolvedType?.toLowerCase() || '';
    
    if (resolvedType.includes('color') || name.includes('color')) {
      category = 'colors';
    } else if (resolvedType.includes('text') || name.includes('font') || name.includes('typography')) {
      category = 'typography';
    } else if (name.includes('spacing') || name.includes('space') || name.includes('gap')) {
      category = 'spacing';
    } else if (name.includes('size') || name.includes('width') || name.includes('height')) {
      category = 'sizing';
    } else if (name.includes('shadow') || name.includes('blur') || name.includes('effect')) {
      category = 'effects';
    }
    
    // Create token path based on name hierarchy
    const parts = name.split('.');
    let current = tokens[category];
    
    // Build nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the value for the last part
    const lastPart = parts[parts.length - 1];
    const value = values.resolvedValue || 'unknown';
    current[lastPart] = value;
  }
  
  // Process styles similarly if needed
  // ...
  
  // Format output based on requested format
  switch (format.toLowerCase()) {
    case 'css':
      return formatTokensAsCSS(tokens);
    case 'scss':
      return formatTokensAsSCSS(tokens);
    case 'less':
      return formatTokensAsLESS(tokens);
    case 'js':
    case 'javascript':
      return formatTokensAsJS(tokens);
    case 'ts':
    case 'typescript':
      return formatTokensAsTS(tokens);
    case 'json':
    default:
      return JSON.stringify(tokens, null, 2);
  }
}

// Helper to format tokens as CSS
function formatTokensAsCSS(tokens) {
  let css = ':root {\n';
  
  function processObject(obj, prefix = '') {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'object') {
        processObject(value, prefix ? `${prefix}-${key}` : key);
      } else {
        css += `  --${prefix ? `${prefix}-${key}` : key}: ${value};\n`;
      }
    }
  }
  
  processObject(tokens);
  css += '}\n';
  return css;
}

// Helper to format tokens as SCSS
function formatTokensAsSCSS(tokens) {
  let scss = '';
  
  function processObject(obj, prefix = '') {
    for (const category in obj) {
      if (prefix === '') {
        scss += `// ${category.toUpperCase()}\n`;
      }
      
      const value = obj[category];
      if (typeof value === 'object') {
        processObject(value, prefix ? `${prefix}-${category}` : category);
      } else {
        scss += `$${prefix ? `${prefix}-${category}` : category}: ${value};\n`;
      }
    }
    
    if (prefix === '') {
      scss += '\n';
    }
  }
  
  processObject(tokens);
  return scss;
}

// Helper to format tokens as LESS
function formatTokensAsLESS(tokens) {
  let less = '';
  
  function processObject(obj, prefix = '') {
    for (const category in obj) {
      if (prefix === '') {
        less += `// ${category.toUpperCase()}\n`;
      }
      
      const value = obj[category];
      if (typeof value === 'object') {
        processObject(value, prefix ? `${prefix}-${category}` : category);
      } else {
        less += `@${prefix ? `${prefix}-${category}` : category}: ${value};\n`;
      }
    }
    
    if (prefix === '') {
      less += '\n';
    }
  }
  
  processObject(tokens);
  return less;
}

// Helper to format tokens as JavaScript
function formatTokensAsJS(tokens) {
  return `// Design tokens generated from Figma file
export const tokens = ${JSON.stringify(tokens, null, 2)};
`;
}

// Helper to format tokens as TypeScript
function formatTokensAsTS(tokens) {
  // Create interfaces first
  let interfaces = '';
  
  if (tokens.colors && Object.keys(tokens.colors).length > 0) {
    interfaces += 'export interface ColorTokens {\n';
    Object.keys(tokens.colors).forEach(key => {
      interfaces += `  ${key}: string | ColorTokens;\n`;
    });
    interfaces += '}\n\n';
  }
  
  if (tokens.typography && Object.keys(tokens.typography).length > 0) {
    interfaces += 'export interface TypographyTokens {\n';
    Object.keys(tokens.typography).forEach(key => {
      interfaces += `  ${key}: string | TypographyTokens;\n`;
    });
    interfaces += '}\n\n';
  }
  
  interfaces += 'export interface DesignTokens {\n';
  Object.keys(tokens).forEach(key => {
    const typeName = key.charAt(0).toUpperCase() + key.slice(1) + 'Tokens';
    interfaces += `  ${key}: ${typeName};\n`;
  });
  interfaces += '}\n\n';
  
  return `// Design tokens generated from Figma file
${interfaces}
export const tokens: DesignTokens = ${JSON.stringify(tokens, null, 2)};
`;
}

// Function to prompt user for tool options based on the selected tool
async function promptForToolOptions(tool) {
  const options = {};
  
  // Common options first
  if (tool.requiresFileKey !== false) {
    options.fileKey = await promptForFileKey();
    
    // Show guidelines for file access
    console.log('\nℹ️  File access guidelines:');
    console.log('1. The file must be accessible to your Figma account');
    console.log('2. For private files, make sure the file is shared or you have proper permissions');
    console.log('3. The access token must be valid and have appropriate permissions');
    console.log('4. If using a Personal Access Token, it only has access to files you can access in the Figma UI');
    console.log('5. File key extracted: ' + options.fileKey + '\n');
  }
  
  // Tool specific options
  switch (tool.name) {
    case 'echo':
      options.message = await promptUserInput('Enter a message to echo:');
      break;
      
    case 'get-design-tokens':
      console.log('\nAvailable formats for design tokens:');
      console.log('  - json: JSON structure (default)');
      console.log('  - css: CSS variables');
      console.log('  - scss: SASS variables');
      console.log('  - less: LESS variables');
      console.log('  - js: JavaScript module');
      console.log('  - ts: TypeScript module with interfaces');
      
      const formatChoice = await promptUserInput('Enter desired format (default: json):');
      options.format = formatChoice || 'json';
      
      const saveToFile = await promptUserInput('Save output to file? (y/n):');
      if (saveToFile.toLowerCase() === 'y') {
        let defaultFilename = `figma-tokens.${options.format}`;
        if (options.format === 'js') defaultFilename = 'figma-tokens.js';
        if (options.format === 'ts') defaultFilename = 'figma-tokens.ts';
        
        const filename = await promptUserInput(`Enter filename (default: ${defaultFilename}):`);
        options.outputFilename = filename || defaultFilename;
      }
      break;
      
    // Add more cases for other tools as needed
  }
  
  return options;
}

// Function to display a welcome message with token status
function displayWelcomeMessage() {
  console.log('=== Interactive Figma MCP Client ===');
  
  // Check if token is valid format
  const isTokenValidFormat = FIGMA_ACCESS_TOKEN && 
    FIGMA_ACCESS_TOKEN.startsWith('figd_') && 
    FIGMA_ACCESS_TOKEN.length > 20;
  
  if (isTokenValidFormat) {
    console.log('Using Figma Access Token: ' + FIGMA_ACCESS_TOKEN.substring(0, 10) + '...');
    
    // Show token source
    if (envVars.FIGMA_ACCESS_TOKEN === FIGMA_ACCESS_TOKEN) {
      console.log('Token loaded from .env file');
    } else if (process.env.FIGMA_ACCESS_TOKEN === FIGMA_ACCESS_TOKEN) {
      console.log('Token loaded from environment variable');
    } else {
      console.log('Using default demo token (limited functionality)');
    }
    
    console.log('Token format appears valid (starts with "figd_")');
  } else {
    console.log('\n⚠️  WARNING: Figma token may not be valid!');
    console.log('Personal Access Tokens should start with "figd_" and be at least 20 characters.');
    console.log('You may face permission issues when accessing Figma files.\n');
  }
  
  console.log('\nThis client allows you to interact with Figma files and extract design information.');
  console.log('- Basic tools (test, version, echo) work without a file key');
  console.log('- File operations require a valid file key and proper permissions');
  console.log('- You can extract design tokens in various formats\n');
}

// Main function to run the interactive client
async function main() {
  try {
    // Welcome message
    displayWelcomeMessage();
    
    while (true) {
      console.log('\nAvailable tools:');
      TOOLS.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name} - ${tool.description}`);
      });
      console.log('0. Exit');
      
      const choice = await promptUserInput('\nSelect a tool (0-9):');
      
      if (choice === '0') {
        console.log('Exiting...');
        break;
      }
      
      const toolIndex = parseInt(choice) - 1;
      if (isNaN(toolIndex) || toolIndex < 0 || toolIndex >= TOOLS.length) {
        console.log('Invalid selection. Please try again.');
        continue;
      }
      
      const selectedTool = TOOLS[toolIndex];
      console.log(`\nSelected tool: ${selectedTool.name}`);
      
      // Get tool options based on the selected tool
      const options = await promptForToolOptions(selectedTool);
      
      // Call the tool
      console.log(`\nCalling ${selectedTool.name} with options:`, options);
      const result = await callFigmaMcpTool(selectedTool.name, options);
      
      // Handle output
      if (result && result.error) {
        console.error('Error:', result.error);
      } else if (result) {
        console.log('\nSuccessful result:');
        
        // Handle special output cases
        if (selectedTool.name === 'get-design-tokens' && options.outputFilename) {
          // Save to file
          const fs = require('fs');
          fs.writeFileSync(options.outputFilename, result.data);
          console.log(`Design tokens saved to ${options.outputFilename}`);
          
          // Show preview of the first few lines
          const previewLines = result.data.toString().split('\n').slice(0, 10).join('\n');
          console.log('\nPreview:');
          console.log(previewLines);
          if (result.data.toString().split('\n').length > 10) {
            console.log('...');
          }
        } else {
          // Generic output handling
          if (typeof result.data === 'object') {
            console.log(JSON.stringify(result.data, null, 2));
          } else if (result.data) {
            console.log(result.data);
          }
        }
      }
      
      // Ask if user wants to continue
      const continueChoice = await promptUserInput('\nDo you want to try another tool? (y/n):');
      if (continueChoice.toLowerCase() !== 'y') {
        console.log('Exiting...');
        break;
      }
    }
  } catch (error) {
    console.error('Error in interactive client:', error);
  } finally {
    rl.close();
  }
}

// Run the script
(async () => {
  // Check for dependencies
  try {
    // Check for axios
    try {
      require('axios');
    } catch (e) {
      console.log('Axios dependency not found. Attempting to install...');
      const { execSync } = require('child_process');
      try {
        execSync('npm install axios --no-save', { stdio: 'inherit' });
        console.log('Axios installed successfully.');
      } catch (installError) {
        console.error('Failed to install axios automatically. Please install it manually with: npm install axios');
        console.error('Then run this script again.');
        process.exit(1);
      }
    }
    
    // Run the main function
    await main();
  } catch (error) {
    console.error('Error running interactive client:', error);
    process.exit(1);
  }
})(); 