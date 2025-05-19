#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ReadBuffer } from '@modelcontextprotocol/sdk/shared/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

class SimpleServer {
  constructor() {
    console.error('[Simple Server] Initializing server...');
    this.server = new Server(
      {
        name: 'simple-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
    console.error('[Simple Server] Server initialized');
  }

  setupToolHandlers() {
    console.error('[Simple Server] Setting up tool handlers...');
    // Register the tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    }));

    console.error('[Simple Server] Tools registered');

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[Simple Server] Tool call received: ${request.params.name}`);
      console.error(`[Simple Server] Request params: ${JSON.stringify(request.params)}`);
      
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      if (request.params.name === 'echo') {
        const message = request.params.arguments.message || 'No message provided';
        console.error(`[Simple Server] Echoing message: ${message}`);
        const response = {
          content: [{ type: 'text', text: `Echo: ${message}` }]
        };
        console.error(`[Simple Server] Sending response: ${JSON.stringify(response)}`);
        return response;
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
    });
  }

  async run() {
    console.error('[Simple Server] Starting server...');
    
    // Create a custom transport to debug raw messages
    const customTransport = {
      onmessage: null,
      onerror: null,
      onclose: null,
      
      _readBuffer: new ReadBuffer(),
      
      async start() {
        console.error('[Simple Server] Starting custom transport...');
        
        // Set up stdin/stdout handlers
        process.stdin.on('data', (chunk) => {
          console.error(`[Simple Server] Raw input received: ${chunk.toString()}`);
          try {
            this._readBuffer.append(chunk);
            this.processReadBuffer();
          } catch (error) {
            console.error('[Simple Server] Error processing input:', error);
            if (this.onerror) this.onerror(error);
          }
        });
        
        process.stdin.on('error', (error) => {
          console.error('[Simple Server] Stdin error:', error);
          if (this.onerror) this.onerror(error);
        });
        
        process.stdin.on('close', () => {
          console.error('[Simple Server] Stdin closed');
          if (this.onclose) this.onclose();
        });
        
        console.error('[Simple Server] Custom transport started');
      },
      
      processReadBuffer() {
        while (true) {
          try {
            const rawMessage = this._readBuffer.readRawMessage();
            if (rawMessage === null) break;
            
            console.error(`[Simple Server] Raw message: ${rawMessage}`);
            
            // Try to parse the message as JSON
            try {
              const jsonMessage = JSON.parse(rawMessage);
              console.error(`[Simple Server] Parsed message: ${JSON.stringify(jsonMessage)}`);
              
              if (this.onmessage) this.onmessage(jsonMessage);
            } catch (error) {
              console.error('[Simple Server] Error parsing message:', error);
              if (this.onerror) this.onerror(error);
            }
          } catch (error) {
            console.error('[Simple Server] Error reading message:', error);
            if (this.onerror) this.onerror(error);
            break;
          }
        }
      },
      
      async send(message) {
        const json = JSON.stringify(message);
        console.error(`[Simple Server] Sending message: ${json}`);
        process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
      },
      
      async close() {
        console.error('[Simple Server] Closing transport');
      }
    };
    
    // Add ReadBuffer.readRawMessage method
    ReadBuffer.prototype.readRawMessage = function() {
      if (this._buffer.length === 0) {
        return null;
      }
      
      // Find the end of the headers
      const headerEnd = this._buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return null;
      }
      
      // Parse the Content-Length header
      const headerText = this._buffer.substring(0, headerEnd);
      const match = /Content-Length: (\d+)/.exec(headerText);
      if (!match) {
        throw new Error('Invalid message format: missing Content-Length header');
      }
      
      const contentLength = parseInt(match[1], 10);
      if (isNaN(contentLength)) {
        throw new Error('Invalid Content-Length header');
      }
      
      // Check if we have the full message
      const messageStart = headerEnd + 4; // 4 = '\r\n\r\n'.length
      if (this._buffer.length < messageStart + contentLength) {
        return null;
      }
      
      // Extract the message
      const message = this._buffer.substring(messageStart, messageStart + contentLength);
      
      // Remove the processed message from the buffer
      this._buffer = this._buffer.substring(messageStart + contentLength);
      
      return message;
    };
    
    // Add error handler
    this.server.onerror = (error) => {
      console.error('[Simple Server] Server error:', error);
    };
    
    // Use the standard transport for now
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Simple MCP Server running on stdio');
  }
}

const server = new SimpleServer();
server.run().catch(console.error);
