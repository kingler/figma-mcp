#!/usr/bin/env node

// A very basic server that communicates over stdio using the JSON-RPC protocol
console.error('Basic server starting...');

// Set up stdin/stdout handlers
process.stdin.on('data', (chunk) => {
  console.error(`Raw input received: ${chunk.toString()}`);
  
  try {
    // Try to parse the message as JSON
    const message = JSON.parse(chunk.toString());
    console.error(`Parsed message: ${JSON.stringify(message)}`);
    
    // Handle the message
    if (message.method === 'echo') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          message: message.params.message || 'No message provided'
        }
      };
      
      console.error(`Sending response: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
    } else {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        }
      };
      
      console.error(`Sending error response: ${JSON.stringify(response)}`);
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    console.error(`Error processing message: ${error}`);
    
    // Send an error response
    const response = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    
    console.error(`Sending parse error response: ${JSON.stringify(response)}`);
    console.log(JSON.stringify(response));
  }
});

process.stdin.on('error', (error) => {
  console.error(`Stdin error: ${error}`);
});

process.stdin.on('close', () => {
  console.error('Stdin closed');
  process.exit(0);
});

console.error('Basic server ready');
