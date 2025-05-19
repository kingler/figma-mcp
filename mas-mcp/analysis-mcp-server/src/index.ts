#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CodeAnalyzer } from './analyzers/CodeAnalyzer.js';
import { DBAnalyzer } from './analyzers/DBAnalyzer.js';
import { ImpactAnalyzer } from './analyzers/ImpactAnalyzer.js';
import { DBConfig } from './types/database.js';

class AnalysisServer {
  private server: Server;
  private codeAnalyzer: CodeAnalyzer;
  private dbAnalyzer: DBAnalyzer | null = null;
  private impactAnalyzer: ImpactAnalyzer;

  constructor() {
    this.server = new Server(
      {
        name: 'analysis-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            analyze_codebase: {
              description: 'Analyzes database-related code in a codebase',
              inputSchema: {
                type: 'object',
                properties: {
                  path: {
                    type: 'string',
                    description: 'Root path of the codebase to analyze',
                  },
                },
                required: ['path'],
              },
            },
            analyze_database: {
              description: 'Analyzes the current state of a database',
              inputSchema: {
                type: 'object',
                properties: {
                  host: { type: 'string' },
                  port: { type: 'number' },
                  database: { type: 'string' },
                  user: { type: 'string' },
                  password: { type: 'string' },
                  ssl: { type: 'boolean', default: false },
                },
                required: ['host', 'port', 'database', 'user', 'password'],
              },
            },
            analyze_impact: {
              description: 'Analyzes the potential impact of database changes',
              inputSchema: {
                type: 'object',
                properties: {
                  codebase_path: { type: 'string' },
                  database_config: {
                    type: 'object',
                    properties: {
                      host: { type: 'string' },
                      port: { type: 'number' },
                      database: { type: 'string' },
                      user: { type: 'string' },
                      password: { type: 'string' },
                      ssl: { type: 'boolean', default: false },
                    },
                    required: ['host', 'port', 'database', 'user', 'password'],
                  },
                  changes: {
                    type: 'object',
                    properties: {
                      tables: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            schema: { type: 'string' },
                            operation: {
                              type: 'string',
                              enum: ['CREATE', 'ALTER', 'DROP'],
                            },
                          },
                          required: ['name', 'operation'],
                        },
                      },
                      columns: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            table: { type: 'string' },
                            schema: { type: 'string' },
                            name: { type: 'string' },
                            operation: {
                              type: 'string',
                              enum: ['ADD', 'ALTER', 'DROP'],
                            },
                          },
                          required: ['table', 'name', 'operation'],
                        },
                      },
                      constraints: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            table: { type: 'string' },
                            schema: { type: 'string' },
                            name: { type: 'string' },
                            operation: {
                              type: 'string',
                              enum: ['ADD', 'DROP'],
                            },
                          },
                          required: ['table', 'name', 'operation'],
                        },
                      },
                      indexes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            table: { type: 'string' },
                            schema: { type: 'string' },
                            name: { type: 'string' },
                            operation: {
                              type: 'string',
                              enum: ['CREATE', 'DROP'],
                            },
                          },
                          required: ['table', 'name', 'operation'],
                        },
                      },
                    },
                  },
                },
                required: ['codebase_path', 'database_config', 'changes'],
              },
            },
          },
        },
      }
    );

    this.codeAnalyzer = new CodeAnalyzer();
    this.impactAnalyzer = new ImpactAnalyzer();

    this.setupRequestHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'analyze_codebase':
            return this.handleAnalyzeCodebase(request.params.arguments);
          case 'analyze_database':
            return this.handleAnalyzeDatabase(request.params.arguments);
          case 'analyze_impact':
            return this.handleAnalyzeImpact(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async handleAnalyzeCodebase(args: any) {
    const analysis = await this.codeAnalyzer.analyzeCodebase(args.path);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeDatabase(args: any) {
    const config: DBConfig = {
      host: args.host,
      port: args.port,
      database: args.database,
      user: args.user,
      password: args.password,
      ssl: args.ssl,
    };

    this.dbAnalyzer = new DBAnalyzer(config);
    const analysis = await this.dbAnalyzer.analyzeDatabaseState();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeImpact(args: any) {
    // First analyze the codebase
    const codeAnalysis = await this.codeAnalyzer.analyzeCodebase(
      args.codebase_path
    );

    // Then analyze the database
    this.dbAnalyzer = new DBAnalyzer(args.database_config);
    const dbAnalysis = await this.dbAnalyzer.analyzeDatabaseState();

    // Finally analyze the impact
    const impactAnalysis = await this.impactAnalyzer.analyzeImpact(
      codeAnalysis,
      dbAnalysis,
      args.changes
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(impactAnalysis, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Analysis MCP server running on stdio');
  }
}

const server = new AnalysisServer();
server.run().catch(console.error);
