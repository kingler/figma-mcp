#!/usr/bin/env node
import { spawn } from 'child_process';

// Start the server process
const serverProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Wait for server to start
setTimeout(() => {
  console.log('Sending request to QA Engineer MCP Server...');
  
  // Create a request to call the generate_test_plan tool
  const callToolRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/call',
    params: {
      name: 'generate_test_plan',
      arguments: {
        scope: 'User Authentication Module',
        type: 'unit',
        language: 'python',
        requirements: [
          'REQ-001: Users must be able to log in',
          'REQ-002: Passwords must be encrypted'
        ],
        coverage: 90
      }
    }
  };
  
  // Send the request
  serverProcess.stdin.write(JSON.stringify(callToolRequest) + '\n');
  
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
