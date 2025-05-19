#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AssessmentData {
  responses: {
    bigFive: Record<string, number>;
    hollandCode: Record<string, number>;
    values: Record<string, number>;
  };
  userData: {
    name: string;
    age: number;
    nationality: string;
  };
}

class PersonalityAssessmentServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'personality-assessment-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'process_assessment',
          description: 'Process personality assessment data and generate report',
          inputSchema: {
            type: 'object',
            properties: {
              assessmentData: {
                type: 'object',
                properties: {
                  responses: {
                    type: 'object',
                    properties: {
                      bigFive: {
                        type: 'object',
                        additionalProperties: { type: 'number' }
                      },
                      hollandCode: {
                        type: 'object',
                        additionalProperties: { type: 'number' }
                      },
                      values: {
                        type: 'object',
                        additionalProperties: { type: 'number' }
                      }
                    },
                    required: ['bigFive', 'hollandCode', 'values']
                  },
                  userData: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      age: { type: 'number' },
                      nationality: { type: 'string' }
                    },
                    required: ['name', 'age', 'nationality']
                  }
                },
                required: ['responses', 'userData']
              },
              templatePath: { type: 'string' }
            },
            required: ['assessmentData', 'templatePath']
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'process_assessment') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const { assessmentData, templatePath } = request.params.arguments;

      try {
        // Validate assessment data
        this.validateAssessmentData(assessmentData);

        // Process the data through the code chain
        const processedData = await this.processWithCodeChain(assessmentData);

        // Generate the report using the template
        const report = await this.generateReport(processedData, templatePath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2)
            }
          ]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Processing error: ${error.message}`
        );
      }
    });
  }

  private validateAssessmentData(data: AssessmentData) {
    // Implement validation logic
    if (!data.responses || !data.userData) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid assessment data structure'
      );
    }
  }

  private async processWithCodeChain(data: AssessmentData) {
    // Implement code chain processing logic
    const processedData = {
      ...data,
      analysis: {
        bigFive: this.analyzeBigFive(data.responses.bigFive),
        hollandCode: this.analyzeHollandCode(data.responses.hollandCode),
        values: this.analyzeValues(data.responses.values)
      }
    };

    return processedData;
  }

  private analyzeBigFive(responses: Record<string, number>) {
    // Implement Big Five analysis logic
    return {
      scores: responses,
      insights: this.generateInsights('bigFive', responses)
    };
  }

  private analyzeHollandCode(responses: Record<string, number>) {
    // Implement Holland Code analysis logic
    return {
      scores: responses,
      insights: this.generateInsights('hollandCode', responses)
    };
  }

  private analyzeValues(responses: Record<string, number>) {
    // Implement Values analysis logic
    return {
      scores: responses,
      insights: this.generateInsights('values', responses)
    };
  }

  private generateInsights(type: string, scores: Record<string, number>) {
    // Implement insights generation logic
    return {
      strengths: [],
      areas_for_growth: [],
      recommendations: []
    };
  }

  private async generateReport(data: any, templatePath: string) {
    // Implement report generation logic using the template
    try {
      const template = await fs.promises.readFile(templatePath, 'utf-8');
      // Process template with data
      return {
        success: true,
        report: {
          content: "Generated report content would go here",
          metadata: {
            generated_at: new Date().toISOString(),
            template_version: "1.0.0"
          }
        }
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Report generation error: ${error.message}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Personality Assessment MCP server running on stdio');
  }
}

const server = new PersonalityAssessmentServer();
server.run().catch(console.error);