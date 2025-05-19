#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

// A simplified version of the Code Quality Analyst server with fixes for the timeout issue
console.error('[Fixed Server] Starting...');

class FixedServer {
  constructor() {
    this.server = new Server(
      {
        name: 'fixed-code-quality-analyst-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
    console.error('[Fixed Server] Initialized');
  }

  setupToolHandlers() {
    console.error('[Fixed Server] Setting up tool handlers...');
    
    // Register the tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('[Fixed Server] Handling tools/list request');
      return {
        tools: [
          {
            name: 'analyze_code',
            description: 'Analyze code quality metrics',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to analyze'
                },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['complexity', 'maintainability', 'reliability', 'security']
                  },
                  description: 'Metrics to analyze'
                }
              },
              required: ['files', 'metrics']
            }
          },
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
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[Fixed Server] Handling tool call: ${request.params.name}`);
      console.error(`[Fixed Server] Request params: ${JSON.stringify(request.params)}`);
      
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          case 'analyze_code': {
            console.error('[Fixed Server] Analyzing code...');
            const analysis = {
              id: `analysis-${Date.now()}`,
              files: request.params.arguments.files,
              metrics: {
                complexity: {
                  score: 85,
                  issues: []
                },
                maintainability: {
                  score: 90,
                  issues: []
                }
              },
              summary: {
                score: 87.5,
                issues: 0,
                coverage: 95
              },
              recommendations: [
                'No issues found'
              ]
            };
            
            console.error('[Fixed Server] Analysis completed');
            return {
              content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
            };
          }
          
          case 'echo': {
            console.error('[Fixed Server] Echoing message...');
            const message = request.params.arguments.message || 'No message provided';
            console.error(`[Fixed Server] Message: ${message}`);
            
            return {
              content: [{ type: 'text', text: `Echo: ${message}` }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Fixed Server] Error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
    
    console.error('[Fixed Server] Tool handlers set up');
  }

  async run() {
    console.error('[Fixed Server] Starting server...');
    
    // Add error handler
    this.server.onerror = (error) => {
      console.error('[Fixed Server] Server error:', error);
    };
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('[Fixed Server] Running on stdio');
  }
}

const server = new FixedServer();
server.run().catch(console.error);
