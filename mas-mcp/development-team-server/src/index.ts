#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface CodeReviewArgs {
  code: string;
  context?: string;
}

interface TechnicalDebtArgs {
  description: string;
  priority: number;
  impact: string;
  effort: string;
}

interface TeamMetricsArgs {
  timeframe: 'day' | 'week' | 'month';
  metrics: string[];
}

function validateCodeReviewArgs(args: unknown): args is CodeReviewArgs {
  const a = args as Partial<CodeReviewArgs>;
  return typeof a.code === 'string' &&
    (a.context === undefined || typeof a.context === 'string');
}

function validateTechnicalDebtArgs(args: unknown): args is TechnicalDebtArgs {
  const a = args as Partial<TechnicalDebtArgs>;
  return typeof a.description === 'string' &&
    typeof a.priority === 'number' &&
    typeof a.impact === 'string' &&
    typeof a.effort === 'string';
}

function validateTeamMetricsArgs(args: unknown): args is TeamMetricsArgs {
  const a = args as Partial<TeamMetricsArgs>;
  return (a.timeframe === 'day' || a.timeframe === 'week' || a.timeframe === 'month') &&
    Array.isArray(a.metrics) &&
    a.metrics.every(m => typeof m === 'string');
}

class DevelopmentTeamServer {
  private server: Server;
  private technicalDebtItems: TechnicalDebtArgs[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'development-team-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'code_review',
          description: 'Perform code review and provide feedback',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Code to review' },
              context: { type: 'string', description: 'Additional context' }
            },
            required: ['code']
          }
        },
        {
          name: 'track_technical_debt',
          description: 'Track technical debt items',
          inputSchema: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Description of the technical debt' },
              priority: { type: 'number', description: 'Priority level (1-5)' },
              impact: { type: 'string', description: 'Business impact' },
              effort: { type: 'string', description: 'Estimated effort to resolve' }
            },
            required: ['description', 'priority', 'impact', 'effort']
          }
        },
        {
          name: 'team_metrics',
          description: 'Get development team metrics',
          inputSchema: {
            type: 'object',
            properties: {
              timeframe: { 
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Time period for metrics'
              },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to retrieve'
              }
            },
            required: ['timeframe', 'metrics']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          case 'code_review': {
            if (!validateCodeReviewArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid code_review arguments');
            }
            
            // Perform code review analysis
            const feedback = this.analyzeCode(
              request.params.arguments.code,
              request.params.arguments.context
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(feedback, null, 2)
                }
              ]
            };
          }

          case 'track_technical_debt': {
            if (!validateTechnicalDebtArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid track_technical_debt arguments');
            }

            // Add technical debt item to tracking
            this.technicalDebtItems.push(request.params.arguments);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Technical debt item tracked successfully',
                    totalItems: this.technicalDebtItems.length
                  }, null, 2)
                }
              ]
            };
          }

          case 'team_metrics': {
            if (!validateTeamMetricsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid team_metrics arguments');
            }

            // Calculate team metrics
            const metrics = this.calculateMetrics(
              request.params.arguments.timeframe,
              request.params.arguments.metrics
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(metrics, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Tool Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private analyzeCode(code: string, context?: string): object {
    // Implement code analysis logic here
    return {
      quality: {
        maintainability: 'good',
        complexity: 'medium',
        documentation: 'needs improvement'
      },
      suggestions: [
        'Consider adding more inline documentation',
        'Break down complex functions into smaller ones',
        'Add error handling for edge cases'
      ],
      context: context || 'No additional context provided'
    };
  }

  private calculateMetrics(timeframe: string, metrics: string[]): object {
    // Implement metrics calculation logic here
    return {
      timeframe,
      metrics: metrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: Math.random() * 100 // Placeholder random values
      }), {}),
      timestamp: new Date().toISOString()
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Development Team MCP Server running on stdio');
  }
}

const server = new DevelopmentTeamServer();
server.run().catch(console.error);