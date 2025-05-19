#!/usr/bin/env node
import { spawn } from 'child_process';

// A very basic client that communicates with the basic server over stdio
console.log('Basic client starting...');

// Spawn the server process
const server = spawn('node', ['basic-server.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Set up event handlers
server.stdout.on('data', (data) => {
  console.log(`Server response: ${data.toString()}`);
  
  try {
    // Try to parse the response as JSON
    const response = JSON.parse(data.toString());
    console.log(`Parsed response: ${JSON.stringify(response)}`);
    
    if (response.error) {
      console.log(`Error: ${response.error.message} (${response.error.code})`);
    } else if (response.result) {
      console.log(`Result: ${JSON.stringify(response.result)}`);
    }
  } catch (error) {
    console.log(`Error parsing response: ${error}`);
  }
  
  // Close the server after receiving a response
  console.log('Closing server...');
  server.stdin.end();
});

server.on('error', (error) => {
  console.log(`Server error: ${error}`);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(0);
});

// Send a message to the server
const message = {
  jsonrpc: '2.0',
  id: 1,
  method: 'echo',
  params: {
    message: 'Hello, world!'
  }
};

console.log(`Sending message: ${JSON.stringify(message)}`);
server.stdin.write(JSON.stringify(message));
