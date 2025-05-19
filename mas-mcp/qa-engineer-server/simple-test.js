#!/usr/bin/env node
import { spawn } from 'child_process';

// Start the server process
const serverProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Wait for server to start
setTimeout(() => {
  console.log('Sending request to QA Engineer MCP Server...');
  
  // Create a simple request to list tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/list',
    params: {}
  };
  
  // Send the request
  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Handle server output
  let output = '';
  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Received data:', data.toString());
    
    // Try to parse the response
    try {
      const response = JSON.parse(output);
      console.log('Parsed response:', JSON.stringify(response, null, 2));
      
      // Exit after receiving the response
      setTimeout(() => {
        serverProcess.kill();
        process.exit(0);
      }, 1000);
    } catch (error) {
      // Not a complete JSON response yet
    }
  });
}, 1000);

// Handle process termination
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});
