#!/usr/bin/env node

// A basic server that communicates over stdio using the MCP protocol format
console.error('MCP Basic server starting...');

// Buffer to store incoming data
let buffer = '';

// Set up stdin/stdout handlers
process.stdin.on('data', (chunk) => {
  console.error(`Raw input received (${chunk.length} bytes): ${chunk.toString()}`);
  
  // Append the chunk to the buffer
  buffer += chunk.toString();
  
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
    console.error('Invalid message format: missing Content-Length header');
    buffer = buffer.substring(headerEnd + 4); // Skip this message
    return;
  }
  
  const contentLength = parseInt(match[1], 10);
  if (isNaN(contentLength)) {
    console.error('Invalid Content-Length header');
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
    console.error(`Parsing message: ${messageText}`);
    const message = JSON.parse(messageText);
    console.error(`Parsed message: ${JSON.stringify(message, null, 2)}`);
    
    // Handle the message
    if (message.method === 'tools/call' && message.params && message.params.name === 'echo') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Echo: ${message.params.arguments?.message || 'No message provided'}`
            }
          ]
        }
      };
      
      sendResponse(response);
    } else if (message.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Simple echo tool for testing',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'Message to echo back'
                  }
                },
                required: ['message']
              }
            }
          ]
        }
      };
      
      sendResponse(response);
    } else if (message.method === 'initialize') {
      console.error('Handling initialize request');
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: message.params.protocolVersion || '0.1.0',
          serverInfo: {
            name: 'mcp-basic-server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      };
      
      sendResponse(response);
    } else {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        }
      };
      
      sendResponse(response);
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
    
    sendResponse(response);
  }
  
  // Process any remaining messages in the buffer
  processBuffer();
}

function sendResponse(response) {
  try {
    const json = JSON.stringify(response);
    console.error(`Sending response: ${JSON.stringify(response, null, 2)}`);
    
    // Format the message according to the JSON-RPC over stdio protocol
    const headers = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n`;
    console.error(`Sending headers: ${headers.replace(/\r\n/g, '\\r\\n')}`);
    
    // Write the complete message at once
    const message = headers + json;
    console.error(`Complete message (${message.length} bytes): ${message.substring(0, 100)}...`);
    
    // Write the message to stdout
    const result = process.stdout.write(message);
    console.error(`Write result: ${result}`);
    
    // Try to flush stdout
    if (typeof process.stdout.flush === 'function') {
      process.stdout.flush();
    }
  } catch (error) {
    console.error(`Error sending response: ${error}`);
  }
}

process.stdin.on('error', (error) => {
  console.error(`Stdin error: ${error}`);
});

process.stdin.on('close', () => {
  console.error('Stdin closed');
  process.exit(0);
});

console.error('MCP Basic server ready');
