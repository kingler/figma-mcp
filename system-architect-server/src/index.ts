#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request
} from '@modelcontextprotocol/sdk/types.js';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type ArchitectureStyle = 'microservices' | 'monolithic' | 'serverless' | 'event-driven';
type AnalysisType = 'scalability' | 'maintainability' | 'reliability' | 'security';

interface DesignSystemArgs {
  requirements: string[];
  constraints: Record<string, unknown>;
  style: ArchitectureStyle;
  scale?: {
    users: number;
    transactions: number;
  };
}

interface AnalyzeArchitectureArgs {
  design: string;
  type: AnalysisType;
  metrics?: string[];
  threshold?: number;
}

interface OptimizeComponentArgs {
  component: string;
  aspects: string[];
  constraints?: Record<string, unknown>;
  target?: {
    metric: string;
    value: number;
  };
}

interface ValidateDesignArgs {
  design: string;
  patterns: string[];
  requirements: string[];
  criteria?: Record<string, number>;
}

const ARCHITECTURE_STYLES = ['microservices', 'monolithic', 'serverless', 'event-driven'] as const;
const ANALYSIS_TYPES = ['scalability', 'maintainability', 'reliability', 'security'] as const;

function validateDesignSystemArgs(args: unknown): args is DesignSystemArgs {
  const a = args as Partial<DesignSystemArgs>;
  return Array.isArray(a.requirements) &&
    a.requirements.every(r => typeof r === 'string') &&
    typeof a.constraints === 'object' &&
    typeof a.style === 'string' &&
    ARCHITECTURE_STYLES.includes(a.style as ArchitectureStyle) &&
    (a.scale === undefined || (
      typeof a.scale === 'object' &&
      typeof a.scale.users === 'number' &&
      typeof a.scale.transactions === 'number'
    ));
}

function validateAnalyzeArchitectureArgs(args: unknown): args is AnalyzeArchitectureArgs {
  const a = args as Partial<AnalyzeArchitectureArgs>;
  return typeof a.design === 'string' &&
    typeof a.type === 'string' &&
    ANALYSIS_TYPES.includes(a.type as AnalysisType) &&
    (a.metrics === undefined || (Array.isArray(a.metrics) && a.metrics.every(m => typeof m === 'string'))) &&
    (a.threshold === undefined || typeof a.threshold === 'number');
}

function validateOptimizeComponentArgs(args: unknown): args is OptimizeComponentArgs {
  const a = args as Partial<OptimizeComponentArgs>;
  return typeof a.component === 'string' &&
    Array.isArray(a.aspects) &&
    a.aspects.every(aspect => typeof aspect === 'string') &&
    (a.constraints === undefined || typeof a.constraints === 'object') &&
    (a.target === undefined || (
      typeof a.target === 'object' &&
      typeof a.target.metric === 'string' &&
      typeof a.target.value === 'number'
    ));
}

function validateValidateDesignArgs(args: unknown): args is ValidateDesignArgs {
  const a = args as Partial<ValidateDesignArgs>;
  return typeof a.design === 'string' &&
    Array.isArray(a.patterns) &&
    a.patterns.every(p => typeof p === 'string') &&
    Array.isArray(a.requirements) &&
    a.requirements.every(r => typeof r === 'string') &&
    (a.criteria === undefined || (
      typeof a.criteria === 'object' &&
      Object.values(a.criteria).every(v => typeof v === 'number')
    ));
}

class SystemArchitectServer {
  private server: Server;
  private designs: Map<string, object>;
  private analyses: Map<string, object>;
  private optimizations: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'system-architect-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.designs = new Map();
    this.analyses = new Map();
    this.optimizations = new Map();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'design_system',
          description: 'Design a software system architecture',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'System requirements'
              },
              constraints: {
                type: 'object',
                description: 'Design constraints'
              },
              style: {
                type: 'string',
                enum: ['microservices', 'monolithic', 'serverless', 'event-driven'],
                description: 'Architecture style'
              },
              scale: {
                type: 'object',
                properties: {
                  users: { type: 'number' },
                  transactions: { type: 'number' }
                },
                description: 'Scale requirements'
              }
            },
            required: ['requirements', 'constraints', 'style']
          }
        },
        {
          name: 'analyze_architecture',
          description: 'Analyze system architecture',
          inputSchema: {
            type: 'object',
            properties: {
              design: { type: 'string', description: 'Architecture design' },
              type: {
                type: 'string',
                enum: ['scalability', 'maintainability', 'reliability', 'security'],
                description: 'Analysis type'
              },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to analyze'
              },
              threshold: {
                type: 'number',
                description: 'Analysis threshold'
              }
            },
            required: ['design', 'type']
          }
        },
        {
          name: 'optimize_component',
          description: 'Optimize system component',
          inputSchema: {
            type: 'object',
            properties: {
              component: { type: 'string', description: 'Component to optimize' },
              aspects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Aspects to optimize'
              },
              constraints: {
                type: 'object',
                description: 'Optimization constraints'
              },
              target: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  value: { type: 'number' }
                },
                description: 'Optimization target'
              }
            },
            required: ['component', 'aspects']
          }
        },
        {
          name: 'validate_design',
          description: 'Validate architecture design',
          inputSchema: {
            type: 'object',
            properties: {
              design: { type: 'string', description: 'Architecture design' },
              patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Design patterns'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'System requirements'
              },
              criteria: {
                type: 'object',
                description: 'Validation criteria'
              }
            },
            required: ['design', 'patterns', 'requirements']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          case 'design_system': {
            if (!validateDesignSystemArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid design_system arguments');
            }
            
            const design = await this.designSystem(
              request.params.arguments.requirements,
              request.params.arguments.constraints,
              request.params.arguments.style,
              request.params.arguments.scale
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(design, null, 2)
                }
              ]
            };
          }

          case 'analyze_architecture': {
            if (!validateAnalyzeArchitectureArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid analyze_architecture arguments');
            }

            const analysis = await this.analyzeArchitecture(
              request.params.arguments.design,
              request.params.arguments.type,
              request.params.arguments.metrics,
              request.params.arguments.threshold
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(analysis, null, 2)
                }
              ]
            };
          }

          case 'optimize_component': {
            if (!validateOptimizeComponentArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid optimize_component arguments');
            }

            const optimization = await this.optimizeComponent(
              request.params.arguments.component,
              request.params.arguments.aspects,
              request.params.arguments.constraints,
              request.params.arguments.target
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(optimization, null, 2)
                }
              ]
            };
          }

          case 'validate_design': {
            if (!validateValidateDesignArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_design arguments');
            }

            const validation = await this.validateDesign(
              request.params.arguments.design,
              request.params.arguments.patterns,
              request.params.arguments.requirements,
              request.params.arguments.criteria
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(validation, null, 2)
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
        console.error('[Architecture Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async designSystem(
    requirements: string[],
    constraints: Record<string, unknown>,
    style: ArchitectureStyle,
    scale?: { users: number; transactions: number }
  ): Promise<object> {
    const designId = `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate system design
    const design = {
      id: designId,
      style,
      requirements,
      constraints,
      scale: scale || { users: 1000, transactions: 100 },
      components: [
        {
          name: 'frontend',
          type: 'ui',
          technology: 'react',
          dependencies: ['api-gateway']
        },
        {
          name: 'api-gateway',
          type: 'gateway',
          technology: 'nginx',
          dependencies: ['auth-service', 'core-service']
        },
        {
          name: 'auth-service',
          type: 'service',
          technology: 'node.js',
          dependencies: ['user-db']
        },
        {
          name: 'core-service',
          type: 'service',
          technology: 'java',
          dependencies: ['main-db', 'cache']
        }
      ],
      dataStores: [
        {
          name: 'user-db',
          type: 'sql',
          technology: 'postgresql'
        },
        {
          name: 'main-db',
          type: 'nosql',
          technology: 'mongodb'
        },
        {
          name: 'cache',
          type: 'cache',
          technology: 'redis'
        }
      ],
      patterns: [
        'api-gateway',
        'circuit-breaker',
        'cqrs',
        'event-sourcing'
      ],
      metadata: {
        designer: 'system-architect-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.designs.set(designId, design);
    return design;
  }

  private async analyzeArchitecture(
    design: string,
    type: AnalysisType,
    metrics?: string[],
    threshold?: number
  ): Promise<object> {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate architecture analysis
    const analysis = {
      id: analysisId,
      design,
      type,
      metrics: metrics || ['performance', 'complexity', 'coupling'],
      threshold: threshold || 0.8,
      results: {
        score: Math.random(),
        metrics: {
          performance: Math.random(),
          complexity: Math.random(),
          coupling: Math.random()
        },
        issues: [
          {
            severity: 'high',
            component: 'api-gateway',
            description: 'High coupling detected'
          },
          {
            severity: 'medium',
            component: 'core-service',
            description: 'Complex business logic'
          }
        ]
      },
      recommendations: [
        'Implement service discovery',
        'Add caching layer',
        'Refactor core service'
      ],
      metadata: {
        analyzer: 'system-architect-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.analyses.set(analysisId, analysis);
    return analysis;
  }

  private async optimizeComponent(
    component: string,
    aspects: string[],
    constraints?: Record<string, unknown>,
    target?: { metric: string; value: number }
  ): Promise<object> {
    const optimizationId = `optimization-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate component optimization
    const optimization = {
      id: optimizationId,
      component,
      aspects,
      constraints: constraints || {},
      target: target || { metric: 'performance', value: 0.9 },
      changes: [
        {
          type: 'configuration',
          description: 'Optimize connection pool',
          impact: 'high'
        },
        {
          type: 'architecture',
          description: 'Add caching layer',
          impact: 'medium'
        },
        {
          type: 'code',
          description: 'Implement lazy loading',
          impact: 'medium'
        }
      ],
      metrics: {
        before: {
          performance: Math.random() * 0.5 + 0.3,
          reliability: Math.random() * 0.5 + 0.3
        },
        after: {
          performance: Math.random() * 0.3 + 0.7,
          reliability: Math.random() * 0.2 + 0.8
        }
      },
      metadata: {
        optimizer: 'system-architect-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.optimizations.set(optimizationId, optimization);
    return optimization;
  }

  private async validateDesign(
    design: string,
    patterns: string[],
    requirements: string[],
    criteria?: Record<string, number>
  ): Promise<object> {
    // Simulate design validation
    return {
      design,
      patterns,
      requirements,
      criteria: criteria || {
        performance: 0.8,
        scalability: 0.7,
        maintainability: 0.9
      },
      validation: {
        patternCompliance: Math.random(),
        requirementsCoverage: Math.random(),
        overallScore: Math.random()
      },
      issues: [
        {
          type: 'pattern',
          pattern: 'circuit-breaker',
          description: 'Incomplete implementation'
        },
        {
          type: 'requirement',
          requirement: 'high-availability',
          description: 'Single point of failure detected'
        }
      ],
      recommendations: [
        'Add fallback mechanisms',
        'Implement redundancy',
        'Document failure scenarios'
      ],
      metadata: {
        validator: 'system-architect-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('System Architect MCP Server running on stdio');
  }
}

const server = new SystemArchitectServer();
server.run().catch(console.error);