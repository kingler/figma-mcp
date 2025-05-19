#!/usr/bin/env node
import { spawn } from 'child_process';

// A raw client that communicates with the original server over stdio
console.log('Testing original server with raw client...');

// Spawn the server process
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Buffer to store incoming data
let buffer = '';

// Set up event handlers
server.stdout.on('data', (data) => {
  console.log(`Raw server response (${data.length} bytes): ${data.toString()}`);
  
  // Append the chunk to the buffer
  buffer += data.toString();
  
  // Process any complete messages in the buffer
  processBuffer();
});

function processBuffer() {
  // Find the end of the headers
  const headerEnd = buffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return; // No complete header yet
  }
  
  // Parse the Content-Length header
  const headerText = buffer.substring(0, headerEnd);
  const match = /Content-Length: (\d+)/.exec(headerText);
  if (!match) {
    console.log('Invalid message format: missing Content-Length header');
    buffer = buffer.substring(headerEnd + 4); // Skip this message
    return;
  }
  
  const contentLength = parseInt(match[1], 10);
  if (isNaN(contentLength)) {
    console.log('Invalid Content-Length header');
    buffer = buffer.substring(headerEnd + 4); // Skip this message
    return;
  }
  
  // Check if we have the full message
  const messageStart = headerEnd + 4; // 4 = '\r\n\r\n'.length
  if (buffer.length < messageStart + contentLength) {
    return; // Not enough data yet
  }
  
  // Extract the message
  const messageText = buffer.substring(messageStart, messageStart + contentLength);
  
  // Remove the processed message from the buffer
  buffer = buffer.substring(messageStart + contentLength);
  
  // Process the message
  try {
    const message = JSON.parse(messageText);
    console.log(`Parsed server response: ${JSON.stringify(message, null, 2)}`);
    
    if (message.error) {
      console.log(`Error: ${message.error.message} (${message.error.code})`);
    } else if (message.result) {
      console.log(`Result: ${JSON.stringify(message.result, null, 2)}`);
      
      // If this was the initialize response, send a tools/list request
      if (message.id === 1) {
        sendToolsListRequest();
      }
      // If this was the tools/list response, send an analyze_code request
      else if (message.id === 2) {
        sendAnalyzeCodeRequest();
      }
      // If this was the analyze_code response, close the server
      else if (message.id === 3) {
        closeServer();
      }
    }
  } catch (error) {
    console.log(`Error parsing response: ${error}`);
  }
  
  // Process any remaining messages in the buffer
  processBuffer();
}

server.on('error', (error) => {
  console.log(`Server error: ${error}`);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(0);
});

// Send an initialize request
function sendInitializeRequest() {
  const message = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: {
        name: 'raw-client',
        version: '1.0.0'
      }
    }
  };
  
  sendMessage(message);
}

// Send a tools/list request
function sendToolsListRequest() {
  const message = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  sendMessage(message);
}

// Send an analyze_code request
function sendAnalyzeCodeRequest() {
  const message = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'analyze_code',
      arguments: {
        files: ['src/index.ts'],
        metrics: ['complexity', 'maintainability']
      }
    }
  };
  
  sendMessage(message);
}

// Send a message to the server
function sendMessage(message) {
  const json = JSON.stringify(message);
  console.log(`Sending message: ${JSON.stringify(message, null, 2)}`);
  
  const headers = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n`;
  console.log(`Sending headers: ${headers.replace(/\r\n/g, '\\r\\n')}`);
  
  server.stdin.write(headers);
  server.stdin.write(json);
}

// Close the server
function closeServer() {
  console.log('Closing server...');
  server.stdin.end();
}

// Start the test
sendInitializeRequest();
