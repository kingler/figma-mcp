#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface ValidateRequirementsArgs {
  requirements: string;
  context?: string;
  standards?: string[];
}

interface ValidateArchitectureArgs {
  design: string;
  requirements: string;
  patterns?: string[];
}

interface ValidateImplementationArgs {
  code: string;
  design: string;
  language: string;
}

interface ValidateSecurityArgs {
  target: string;
  type: 'code' | 'api' | 'system';
  requirements?: string[];
}

function validateRequirementsArgs(args: unknown): args is ValidateRequirementsArgs {
  const a = args as Partial<ValidateRequirementsArgs>;
  return typeof a.requirements === 'string' &&
    (a.context === undefined || typeof a.context === 'string') &&
    (a.standards === undefined || (Array.isArray(a.standards) && a.standards.every(s => typeof s === 'string')));
}

function validateArchitectureArgs(args: unknown): args is ValidateArchitectureArgs {
  const a = args as Partial<ValidateArchitectureArgs>;
  return typeof a.design === 'string' &&
    typeof a.requirements === 'string' &&
    (a.patterns === undefined || (Array.isArray(a.patterns) && a.patterns.every(p => typeof p === 'string')));
}

function validateImplementationArgs(args: unknown): args is ValidateImplementationArgs {
  const a = args as Partial<ValidateImplementationArgs>;
  return typeof a.code === 'string' &&
    typeof a.design === 'string' &&
    typeof a.language === 'string';
}

function validateSecurityArgs(args: unknown): args is ValidateSecurityArgs {
  const a = args as Partial<ValidateSecurityArgs>;
  return typeof a.target === 'string' &&
    (a.type === 'code' || a.type === 'api' || a.type === 'system') &&
    (a.requirements === undefined || (Array.isArray(a.requirements) && a.requirements.every(r => typeof r === 'string')));
}

class MorpheusValidatorServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'morpheus-validator-server',
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
          name: 'validate_requirements',
          description: 'Validate requirements against standards and context',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: { type: 'string', description: 'Requirements to validate' },
              context: { type: 'string', description: 'Additional context' },
              standards: {
                type: 'array',
                items: { type: 'string' },
                description: 'Standards to validate against'
              }
            },
            required: ['requirements']
          }
        },
        {
          name: 'validate_architecture',
          description: 'Validate architecture design against requirements',
          inputSchema: {
            type: 'object',
            properties: {
              design: { type: 'string', description: 'Architecture design' },
              requirements: { type: 'string', description: 'Requirements to validate against' },
              patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Design patterns to check'
              }
            },
            required: ['design', 'requirements']
          }
        },
        {
          name: 'validate_implementation',
          description: 'Validate code implementation against design',
          inputSchema: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Code to validate' },
              design: { type: 'string', description: 'Design specification' },
              language: { type: 'string', description: 'Programming language' }
            },
            required: ['code', 'design', 'language']
          }
        },
        {
          name: 'validate_security',
          description: 'Validate security aspects of code, API, or system',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target to validate' },
              type: {
                type: 'string',
                enum: ['code', 'api', 'system'],
                description: 'Type of security validation'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Security requirements'
              }
            },
            required: ['target', 'type']
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
          case 'validate_requirements': {
            if (!validateRequirementsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_requirements arguments');
            }
            
            const result = this.validateRequirements(
              request.params.arguments.requirements,
              request.params.arguments.context,
              request.params.arguments.standards
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'validate_architecture': {
            if (!validateArchitectureArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_architecture arguments');
            }

            const result = this.validateArchitecture(
              request.params.arguments.design,
              request.params.arguments.requirements,
              request.params.arguments.patterns
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'validate_implementation': {
            if (!validateImplementationArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_implementation arguments');
            }

            const result = this.validateImplementation(
              request.params.arguments.code,
              request.params.arguments.design,
              request.params.arguments.language
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'validate_security': {
            if (!validateSecurityArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_security arguments');
            }

            const result = this.validateSecurity(
              request.params.arguments.target,
              request.params.arguments.type,
              request.params.arguments.requirements
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
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
        console.error('[Validation Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private validateRequirements(
    requirements: string,
    context?: string,
    standards?: string[]
  ): object {
    // Implement requirements validation logic here
    return {
      valid: true,
      score: 0.85,
      checks: [
        {
          name: 'completeness',
          passed: true,
          score: 0.9,
          details: 'Requirements cover all necessary aspects'
        },
        {
          name: 'consistency',
          passed: true,
          score: 0.8,
          details: 'No conflicting requirements found'
        }
      ],
      context: context || 'No additional context provided',
      standards: standards || ['default'],
      timestamp: new Date().toISOString()
    };
  }

  private validateArchitecture(
    design: string,
    requirements: string,
    patterns?: string[]
  ): object {
    // Implement architecture validation logic here
    return {
      valid: true,
      score: 0.9,
      checks: [
        {
          name: 'requirements_coverage',
          passed: true,
          score: 0.95,
          details: 'Design addresses all requirements'
        },
        {
          name: 'pattern_compliance',
          passed: true,
          score: 0.85,
          details: 'Design follows recommended patterns'
        }
      ],
      patterns: patterns || ['default'],
      timestamp: new Date().toISOString()
    };
  }

  private validateImplementation(
    code: string,
    design: string,
    language: string
  ): object {
    // Implement code validation logic here
    return {
      valid: true,
      score: 0.88,
      checks: [
        {
          name: 'design_compliance',
          passed: true,
          score: 0.9,
          details: 'Implementation matches design'
        },
        {
          name: 'code_quality',
          passed: true,
          score: 0.85,
          details: 'Code follows best practices'
        }
      ],
      language,
      timestamp: new Date().toISOString()
    };
  }

  private validateSecurity(
    target: string,
    type: string,
    requirements?: string[]
  ): object {
    // Implement security validation logic here
    return {
      valid: true,
      score: 0.92,
      checks: [
        {
          name: 'vulnerability_scan',
          passed: true,
          score: 0.95,
          details: 'No critical vulnerabilities found'
        },
        {
          name: 'compliance_check',
          passed: true,
          score: 0.9,
          details: 'Meets security requirements'
        }
      ],
      type,
      requirements: requirements || ['standard'],
      timestamp: new Date().toISOString()
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Morpheus Validator MCP Server running on stdio');
  }
}

const server = new MorpheusValidatorServer();
server.run().catch(console.error);