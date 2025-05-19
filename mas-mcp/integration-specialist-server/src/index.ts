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

type IntegrationType = 'rest' | 'graphql' | 'grpc' | 'websocket';
type ProtocolType = 'http' | 'mqtt' | 'amqp' | 'kafka';

interface DesignAPIArgs {
  name: string;
  type: IntegrationType;
  endpoints: {
    path: string;
    method: string;
    params?: Record<string, unknown>;
    response?: Record<string, unknown>;
  }[];
  security?: {
    type: string;
    config: Record<string, unknown>;
  };
}

interface ValidateIntegrationArgs {
  source: string;
  target: string;
  protocol: ProtocolType;
  requirements: string[];
  constraints?: Record<string, unknown>;
}

interface GenerateClientArgs {
  api: string;
  language: string;
  features: string[];
  options?: Record<string, unknown>;
}

interface MonitorIntegrationArgs {
  integration: string;
  metrics: string[];
  interval: number;
  alerts?: {
    threshold: number;
    action: string;
  }[];
}

const INTEGRATION_TYPES = ['rest', 'graphql', 'grpc', 'websocket'] as const;
const PROTOCOL_TYPES = ['http', 'mqtt', 'amqp', 'kafka'] as const;

function validateDesignAPIArgs(args: unknown): args is DesignAPIArgs {
  const a = args as Partial<DesignAPIArgs>;
  return typeof a.name === 'string' &&
    typeof a.type === 'string' &&
    INTEGRATION_TYPES.includes(a.type as IntegrationType) &&
    Array.isArray(a.endpoints) &&
    a.endpoints.every(e =>
      typeof e.path === 'string' &&
      typeof e.method === 'string' &&
      (e.params === undefined || typeof e.params === 'object') &&
      (e.response === undefined || typeof e.response === 'object')
    ) &&
    (a.security === undefined || (
      typeof a.security === 'object' &&
      typeof a.security.type === 'string' &&
      typeof a.security.config === 'object'
    ));
}

function validateValidateIntegrationArgs(args: unknown): args is ValidateIntegrationArgs {
  const a = args as Partial<ValidateIntegrationArgs>;
  return typeof a.source === 'string' &&
    typeof a.target === 'string' &&
    typeof a.protocol === 'string' &&
    PROTOCOL_TYPES.includes(a.protocol as ProtocolType) &&
    Array.isArray(a.requirements) &&
    a.requirements.every(r => typeof r === 'string') &&
    (a.constraints === undefined || typeof a.constraints === 'object');
}

function validateGenerateClientArgs(args: unknown): args is GenerateClientArgs {
  const a = args as Partial<GenerateClientArgs>;
  return typeof a.api === 'string' &&
    typeof a.language === 'string' &&
    Array.isArray(a.features) &&
    a.features.every(f => typeof f === 'string') &&
    (a.options === undefined || typeof a.options === 'object');
}

function validateMonitorIntegrationArgs(args: unknown): args is MonitorIntegrationArgs {
  const a = args as Partial<MonitorIntegrationArgs>;
  return typeof a.integration === 'string' &&
    Array.isArray(a.metrics) &&
    a.metrics.every(m => typeof m === 'string') &&
    typeof a.interval === 'number' &&
    (a.alerts === undefined || (
      Array.isArray(a.alerts) &&
      a.alerts.every(alert =>
        typeof alert.threshold === 'number' &&
        typeof alert.action === 'string'
      )
    ));
}

class IntegrationSpecialistServer {
  private server: Server;
  private apis: Map<string, object>;
  private integrations: Map<string, object>;
  private clients: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'integration-specialist-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apis = new Map();
    this.integrations = new Map();
    this.clients = new Map();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'design_api',
          description: 'Design API specification',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'API name' },
              type: {
                type: 'string',
                enum: ['rest', 'graphql', 'grpc', 'websocket'],
                description: 'API type'
              },
              endpoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    method: { type: 'string' },
                    params: { type: 'object' },
                    response: { type: 'object' }
                  },
                  required: ['path', 'method']
                },
                description: 'API endpoints'
              },
              security: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  config: { type: 'object' }
                },
                required: ['type', 'config']
              }
            },
            required: ['name', 'type', 'endpoints']
          }
        },
        {
          name: 'validate_integration',
          description: 'Validate system integration',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source system' },
              target: { type: 'string', description: 'Target system' },
              protocol: {
                type: 'string',
                enum: ['http', 'mqtt', 'amqp', 'kafka'],
                description: 'Integration protocol'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Integration requirements'
              },
              constraints: {
                type: 'object',
                description: 'Integration constraints'
              }
            },
            required: ['source', 'target', 'protocol', 'requirements']
          }
        },
        {
          name: 'generate_client',
          description: 'Generate API client',
          inputSchema: {
            type: 'object',
            properties: {
              api: { type: 'string', description: 'API specification' },
              language: { type: 'string', description: 'Target language' },
              features: {
                type: 'array',
                items: { type: 'string' },
                description: 'Client features'
              },
              options: {
                type: 'object',
                description: 'Generation options'
              }
            },
            required: ['api', 'language', 'features']
          }
        },
        {
          name: 'monitor_integration',
          description: 'Monitor integration health',
          inputSchema: {
            type: 'object',
            properties: {
              integration: { type: 'string', description: 'Integration ID' },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to monitor'
              },
              interval: {
                type: 'number',
                description: 'Monitoring interval'
              },
              alerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    threshold: { type: 'number' },
                    action: { type: 'string' }
                  },
                  required: ['threshold', 'action']
                },
                description: 'Alert configuration'
              }
            },
            required: ['integration', 'metrics', 'interval']
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
          case 'design_api': {
            if (!validateDesignAPIArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid design_api arguments');
            }
            
            const api = await this.designAPI(
              request.params.arguments.name,
              request.params.arguments.type,
              request.params.arguments.endpoints,
              request.params.arguments.security
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(api, null, 2)
                }
              ]
            };
          }

          case 'validate_integration': {
            if (!validateValidateIntegrationArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_integration arguments');
            }

            const validation = await this.validateIntegration(
              request.params.arguments.source,
              request.params.arguments.target,
              request.params.arguments.protocol,
              request.params.arguments.requirements,
              request.params.arguments.constraints
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

          case 'generate_client': {
            if (!validateGenerateClientArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_client arguments');
            }

            const client = await this.generateClient(
              request.params.arguments.api,
              request.params.arguments.language,
              request.params.arguments.features,
              request.params.arguments.options
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(client, null, 2)
                }
              ]
            };
          }

          case 'monitor_integration': {
            if (!validateMonitorIntegrationArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid monitor_integration arguments');
            }

            const monitoring = await this.monitorIntegration(
              request.params.arguments.integration,
              request.params.arguments.metrics,
              request.params.arguments.interval,
              request.params.arguments.alerts
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitoring, null, 2)
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
        console.error('[Integration Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async designAPI(
    name: string,
    type: IntegrationType,
    endpoints: {
      path: string;
      method: string;
      params?: Record<string, unknown>;
      response?: Record<string, unknown>;
    }[],
    security?: {
      type: string;
      config: Record<string, unknown>;
    }
  ): Promise<object> {
    const apiId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate API design
    const api = {
      id: apiId,
      name,
      type,
      version: '1.0.0',
      endpoints: endpoints.map(endpoint => ({
        ...endpoint,
        id: `endpoint-${Math.random().toString(36).substr(2, 9)}`,
        validation: {
          params: endpoint.params ? Object.keys(endpoint.params).length : 0,
          response: endpoint.response ? Object.keys(endpoint.response).length : 0
        }
      })),
      security: security || {
        type: 'none',
        config: {}
      },
      documentation: {
        overview: `API documentation for ${name}`,
        endpoints: endpoints.map(e => ({
          path: e.path,
          method: e.method,
          description: `Endpoint for ${e.path}`,
          examples: [
            {
              request: e.params || {},
              response: e.response || {}
            }
          ]
        }))
      },
      metadata: {
        designer: 'integration-specialist-mcp',
        timestamp: new Date().toISOString()
      }
    };

    this.apis.set(apiId, api);
    return api;
  }

  private async validateIntegration(
    source: string,
    target: string,
    protocol: ProtocolType,
    requirements: string[],
    constraints?: Record<string, unknown>
  ): Promise<object> {
    const integrationId = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate integration validation
    const validation = {
      id: integrationId,
      source,
      target,
      protocol,
      requirements: requirements.map(r => ({
        requirement: r,
        status: Math.random() > 0.2 ? 'passed' : 'failed',
        details: `Validation details for ${r}`
      })),
      constraints: constraints || {},
      compatibility: {
        score: Math.random(),
        issues: [
          {
            severity: 'high',
            description: 'Data format mismatch',
            mitigation: 'Implement data transformation layer'
          },
          {
            severity: 'medium',
            description: 'Different authentication mechanisms',
            mitigation: 'Use API gateway for auth translation'
          }
        ]
      },
      performance: {
        latency: Math.random() * 100,
        throughput: Math.random() * 1000,
        reliability: Math.random()
      },
      recommendations: [
        'Add retry mechanism',
        'Implement circuit breaker',
        'Monitor error rates'
      ],
      metadata: {
        validator: 'integration-specialist-mcp',
        timestamp: new Date().toISOString()
      }
    };

    this.integrations.set(integrationId, validation);
    return validation;
  }

  private async generateClient(
    api: string,
    language: string,
    features: string[],
    options?: Record<string, unknown>
  ): Promise<object> {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate client generation
    const client = {
      id: clientId,
      api,
      language,
      features: features.map(f => ({
        name: f,
        implementation: `${language} implementation for ${f}`,
        tests: [`Test case for ${f}`]
      })),
      options: options || {},
      files: [
        {
          name: 'client.ts',
          content: `// Generated ${language} client for ${api}\n// Features: ${features.join(', ')}`
        },
        {
          name: 'types.ts',
          content: '// Generated type definitions'
        },
        {
          name: 'README.md',
          content: `# API Client for ${api}\n\n## Features\n${features.map(f => `- ${f}`).join('\n')}`
        }
      ],
      documentation: {
        setup: 'Installation and setup instructions',
        usage: 'Usage examples and best practices',
        api: 'Generated API documentation'
      },
      metadata: {
        generator: 'integration-specialist-mcp',
        timestamp: new Date().toISOString()
      }
    };

    this.clients.set(clientId, client);
    return client;
  }

  private async monitorIntegration(
    integration: string,
    metrics: string[],
    interval: number,
    alerts?: {
      threshold: number;
      action: string;
    }[]
  ): Promise<object> {
    // Simulate integration monitoring
    return {
      integration,
      status: 'active',
      metrics: metrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: {
          current: Math.random() * 100,
          history: Array.from({ length: 10 }, () => Math.random() * 100),
          trend: 'stable'
        }
      }), {}),
      health: {
        score: Math.random(),
        issues: Math.random() > 0.8 ? [
          {
            type: 'performance',
            description: 'High latency detected',
            timestamp: new Date().toISOString()
          }
        ] : []
      },
      alerts: alerts?.map(alert => ({
        ...alert,
        status: Math.random() > alert.threshold ? 'triggered' : 'normal',
        lastCheck: new Date().toISOString()
      })) || [],
      recommendations: [
        'Optimize connection pooling',
        'Increase timeout threshold',
        'Add error logging'
      ],
      metadata: {
        monitor: 'integration-specialist-mcp',
        interval,
        timestamp: new Date().toISOString()
      }
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Integration Specialist MCP Server running on stdio');
  }
}

const server = new IntegrationSpecialistServer();
server.run().catch(console.error);