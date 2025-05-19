/**
 * Simple MCP client to test Figma MCP tools
 * 
 * This script demonstrates how to call Figma MCP tools directly
 * without using any external libraries.
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Pretty print JSON with colors
function prettyPrint(obj, color = colors.reset) {
  console.log(`${color}${JSON.stringify(obj, null, 2)}${colors.reset}`);
}

// Run MCP client
async function runMcpClient() {
  console.log(`${colors.magenta}=== Figma MCP Test Client ===${colors.reset}\n`);
  
  // Spawn the CLI process with stdio mode
  const cliPath = path.join(__dirname, 'bin', 'cli.js');
  const figmaApiKey = process.env.FIGMA_ACCESS_TOKEN || 'test-key';
  
  console.log(`${colors.cyan}Starting Figma MCP Server: node ${cliPath} --stdio --debug --figma-api-key ${figmaApiKey}${colors.reset}`);
  
  const child = spawn('node', [
    cliPath,
    '--stdio',
    '--debug',
    '--figma-api-key', figmaApiKey
  ], {
    env: {
      ...process.env,
      FIGMA_ACCESS_TOKEN: figmaApiKey,
      NODE_ENV: 'development',
      DEBUG: '1'
    }
  });

  // Create a promise that resolves when the metadata is received
  const metadataPromise = new Promise((resolve, reject) => {
    let dataBuffer = '';
    
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      dataBuffer += chunk;
      
      // Process complete lines
      const lines = dataBuffer.split('\n');
      
      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const response = JSON.parse(line);
          
          if (response.type === 'metadata') {
            console.log(`${colors.green}Received metadata:${colors.reset}`);
            prettyPrint(response, colors.green);
            resolve(response);
            break;
          }
        } catch (err) {
          console.error(`${colors.red}Error parsing response: ${err.message}${colors.reset}`);
          console.error(`${colors.red}Raw response: ${line}${colors.reset}`);
        }
      }
      
      // Keep the last (potentially incomplete) line
      dataBuffer = lines[lines.length - 1];
    });
    
    // Handle errors
    child.stderr.on('data', (data) => {
      console.log(`${colors.yellow}[Server Debug] ${data.toString().trim()}${colors.reset}`);
    });
    
    // Set a timeout for metadata reception
    setTimeout(() => {
      reject(new Error('Timeout waiting for metadata'));
    }, 5000);
  });

  try {
    // Wait for metadata to be received
    await metadataPromise;
    
    // Function to send a request and wait for a response
    const sendRequest = (request) => {
      return new Promise((resolve, reject) => {
        console.log(`${colors.blue}Sending request:${colors.reset}`);
        prettyPrint(request, colors.blue);
        
        child.stdin.write(JSON.stringify(request) + '\n');
        
        const responseTimeout = setTimeout(() => {
          reject(new Error('Timeout waiting for response'));
        }, 5000);
        
        const responseHandler = (data) => {
          const chunk = data.toString();
          
          try {
            const lines = chunk.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              try {
                const response = JSON.parse(line);
                console.log(`${colors.green}Received response:${colors.reset}`);
                prettyPrint(response, colors.green);
                
                clearTimeout(responseTimeout);
                child.stdout.removeListener('data', responseHandler);
                resolve(response);
                return;
              } catch (err) {
                // Ignore incomplete JSON
              }
            }
          } catch (err) {
            // Continue listening
          }
        };
        
        child.stdout.on('data', responseHandler);
      });
    };
    
    // Step 1: Send discovery request
    console.log(`\n${colors.magenta}Step 1: Discovering available tools${colors.reset}`);
    const discoveryResponse = await sendRequest({ type: 'discovery' });
    
    // Step 2: Test the test tool
    console.log(`\n${colors.magenta}Step 2: Testing connection with test tool${colors.reset}`);
    await sendRequest({ 
      function: 'figma-mcp.test',
      args: {}
    });
    
    // Step 3: Test get-file tool
    console.log(`\n${colors.magenta}Step 3: Getting file information${colors.reset}`);
    await sendRequest({
      function: 'figma-mcp.get-file',
      args: { fileKey: 'example123' }
    });
    
    // Step 4: Test get-components tool
    console.log(`\n${colors.magenta}Step 4: Getting file components${colors.reset}`);
    await sendRequest({
      function: 'figma-mcp.get-components',
      args: { fileKey: 'example123' }
    });
    
    // Step 5: Test get-design-tokens tool
    console.log(`\n${colors.magenta}Step 5: Getting design tokens (JSON format)${colors.reset}`);
    await sendRequest({
      function: 'figma-mcp.get-design-tokens',
      args: { 
        fileKey: 'example123',
        format: 'json' 
      }
    });
    
    // Step 6: Test get-design-tokens tool with CSS format
    console.log(`\n${colors.magenta}Step 6: Getting design tokens (CSS format)${colors.reset}`);
    await sendRequest({
      function: 'figma-mcp.get-design-tokens',
      args: { 
        fileKey: 'example123',
        format: 'css' 
      }
    });
    
    console.log(`\n${colors.magenta}Test client completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    // Clean up
    console.log(`\n${colors.blue}Shutting down server...${colors.reset}`);
    child.kill();
  }
}

// Run the test client
runMcpClient().catch(error => {
  console.error(`Error running test client: ${error.message}`);
  process.exit(1);
}); 