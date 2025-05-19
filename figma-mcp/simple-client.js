/**
 * Simple MCP client that connects to a running Figma MCP server
 */

const fs = require('fs');
const net = require('net');

// Function to send a JSON-RPC request and log the response
function sendRequest(client, request) {
  console.log(`Sending request: ${JSON.stringify(request)}`);
  client.write(JSON.stringify(request) + '\n');
}

// Create a client connection to the specified socket
const client = net.createConnection('/tmp/figma-mcp.sock', () => {
  console.log('Connected to Figma MCP server');
  
  // First, request metadata
  sendRequest(client, { type: 'metadata' });
  
  // After a second, request tool discovery
  setTimeout(() => {
    sendRequest(client, { type: 'discovery' });
  }, 1000);
  
  // After two seconds, try using the test tool
  setTimeout(() => {
    sendRequest(client, { 
      function: 'figma-mcp.test',
      args: {} 
    });
  }, 2000);
});

// Handle server responses
client.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    try {
      const response = JSON.parse(line);
      console.log('Received response:');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error(`Error parsing response: ${error.message}`);
      console.error(`Raw response: ${line}`);
    }
  });
});

// Handle connection errors
client.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('Error: Socket file not found. Is the Figma MCP server running?');
    
    // Try using stdio instead
    console.log('Trying to connect using process spawning instead...');
    useProcessSpawning();
  } else {
    console.error(`Connection error: ${err.message}`);
  }
});

// Handle connection close
client.on('close', () => {
  console.log('Connection closed');
});

// Alternative method using process spawning
function useProcessSpawning() {
  const { spawn } = require('child_process');
  const path = require('path');
  
  console.log('Starting Figma MCP server via process spawning');
  
  const cliPath = path.join(__dirname, 'bin', 'cli.js');
  const child = spawn('node', [
    cliPath,
    '--stdio',
    '--debug',
    '--figma-api-key', 'test-key'
  ], {
    env: {
      ...process.env,
      FIGMA_ACCESS_TOKEN: 'test-key',
      NODE_ENV: 'development',
      DEBUG: '1'
    }
  });
  
  let buffer = '';
  
  child.stdout.on('data', (data) => {
    const chunk = data.toString();
    buffer += chunk;
    
    // Process complete lines
    const lines = buffer.split('\n');
    
    // Process all complete lines except the last one (which might be incomplete)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const response = JSON.parse(line);
        console.log('Received response:');
        console.log(JSON.stringify(response, null, 2));
        
        // If we get metadata, send discovery request
        if (response.type === 'metadata') {
          console.log('Sending discovery request');
          child.stdin.write(JSON.stringify({ type: 'discovery' }) + '\n');
        }
        
        // If we get discovery response, test a tool
        if (response.type === 'discovery') {
          console.log('Testing a tool');
          child.stdin.write(JSON.stringify({
            function: 'figma-mcp.test',
            args: {}
          }) + '\n');
        }
      } catch (error) {
        console.error(`Error parsing response: ${error.message}`);
        console.error(`Raw response: ${line}`);
      }
    }
    
    // Keep the last line (which might be incomplete)
    buffer = lines[lines.length - 1];
  });
  
  child.stderr.on('data', (data) => {
    console.log(`[Server Debug] ${data.toString().trim()}`);
  });
  
  child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
  });
  
  // Clean up on exit
  process.on('exit', () => {
    child.kill();
  });
}

// If socket connection fails, this will fall back to process spawning 