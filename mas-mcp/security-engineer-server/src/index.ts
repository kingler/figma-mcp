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
import axios from 'axios';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type SecurityScanType = 'static' | 'dynamic' | 'dependency' | 'container';
type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface SecurityScanArgs {
  target: string;
  type: SecurityScanType;
  options?: {
    depth?: number;
    timeout?: number;
    excludes?: string[];
  };
}

interface ThreatModelArgs {
  system: {
    components: string[];
    dataFlows: {
      source: string;
      target: string;
      data: string;
    }[];
    trustBoundaries: string[];
  };
  context?: string;
}

interface SecurityValidationArgs {
  requirements: string[];
  implementation: string;
  environment?: string;
}

interface ContinuousMonitoringArgs {
  assets: string[];
  alertThresholds: {
    metric: string;
    threshold: number;
    severity: ThreatSeverity;
  }[];
  interval: number;
}

const SECURITY_SCAN_TYPES = ['static', 'dynamic', 'dependency', 'container'] as const;
const THREAT_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

// Event system for autonomous workflow integration
interface SecurityEvent {
  type: string;
  severity: ThreatSeverity;
  details: Record<string, unknown>;
  timestamp: string;
}

class SecurityEventBus {
  private static instance: SecurityEventBus;
  private subscribers: Map<string, ((event: SecurityEvent) => void)[]>;

  private constructor() {
    this.subscribers = new Map();
  }

  static getInstance(): SecurityEventBus {
    if (!SecurityEventBus.instance) {
      SecurityEventBus.instance = new SecurityEventBus();
    }
    return SecurityEventBus.instance;
  }

  subscribe(eventType: string, callback: (event: SecurityEvent) => void): void {
    const subscribers = this.subscribers.get(eventType) || [];
    subscribers.push(callback);
    this.subscribers.set(eventType, subscribers);
  }

  publish(event: SecurityEvent): void {
    const subscribers = this.subscribers.get(event.type) || [];
    subscribers.forEach(callback => callback(event));
  }
}

class SecurityEngineerServer {
  private server: Server;
  private eventBus: SecurityEventBus;
  private scanResults: Map<string, object>;
  private threatModels: Map<string, object>;
  private validations: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'security-engineer-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.eventBus = SecurityEventBus.getInstance();
    this.scanResults = new Map();
    this.threatModels = new Map();
    this.validations = new Map();
    this.setupEventHandlers();
    this.setupToolHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for architecture changes from system-architect-server
    this.eventBus.subscribe('architecture.updated', async (event) => {
      const threatModel = await this.generateThreatModel({
        system: event.details as ThreatModelArgs['system'],
        context: 'architecture-update'
      });
      this.notifyArchitectureTeam(threatModel);
    });

    // Listen for new deployments from devops-engineer-server
    this.eventBus.subscribe('deployment.new', async (event) => {
      const scanResults = await this.performSecurityScan({
        target: event.details.deploymentUrl as string,
        type: 'dynamic'
      });
      this.notifyDevOpsTeam(scanResults);
    });

    // Listen for code changes from development-team-server
    this.eventBus.subscribe('code.committed', async (event) => {
      const scanResults = await this.performSecurityScan({
        target: event.details.codebase as string,
        type: 'static'
      });
      this.notifyDevelopmentTeam(scanResults);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'security_scan',
          description: 'Perform security scan on target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Scan target' },
              type: {
                type: 'string',
                enum: ['static', 'dynamic', 'dependency', 'container'],
                description: 'Scan type'
              },
              options: {
                type: 'object',
                properties: {
                  depth: { type: 'number' },
                  timeout: { type: 'number' },
                  excludes: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            required: ['target', 'type']
          }
        },
        {
          name: 'threat_model',
          description: 'Generate threat model for system',
          inputSchema: {
            type: 'object',
            properties: {
              system: {
                type: 'object',
                properties: {
                  components: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  dataFlows: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        source: { type: 'string' },
                        target: { type: 'string' },
                        data: { type: 'string' }
                      }
                    }
                  },
                  trustBoundaries: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              },
              context: { type: 'string' }
            },
            required: ['system']
          }
        },
        {
          name: 'validate_security',
          description: 'Validate security requirements implementation',
          inputSchema: {
            type: 'object',
            properties: {
              requirements: {
                type: 'array',
                items: { type: 'string' }
              },
              implementation: { type: 'string' },
              environment: { type: 'string' }
            },
            required: ['requirements', 'implementation']
          }
        },
        {
          name: 'monitor_security',
          description: 'Set up continuous security monitoring',
          inputSchema: {
            type: 'object',
            properties: {
              assets: {
                type: 'array',
                items: { type: 'string' }
              },
              alertThresholds: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    metric: { type: 'string' },
                    threshold: { type: 'number' },
                    severity: {
                      type: 'string',
                      enum: ['critical', 'high', 'medium', 'low', 'info']
                    }
                  }
                }
              },
              interval: { type: 'number' }
            },
            required: ['assets', 'alertThresholds', 'interval']
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
          case 'security_scan': {
            const args = request.params.arguments as unknown as SecurityScanArgs;
            if (!this.validateSecurityScanArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid security_scan arguments');
            }
            const results = await this.performSecurityScan(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
            };
          }

          case 'threat_model': {
            const args = request.params.arguments as unknown as ThreatModelArgs;
            if (!this.validateThreatModelArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid threat_model arguments');
            }
            const model = await this.generateThreatModel(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(model, null, 2) }]
            };
          }

          case 'validate_security': {
            const args = request.params.arguments as unknown as SecurityValidationArgs;
            if (!this.validateSecurityValidationArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_security arguments');
            }
            const validation = await this.validateSecurity(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }]
            };
          }

          case 'monitor_security': {
            const args = request.params.arguments as unknown as ContinuousMonitoringArgs;
            if (!this.validateContinuousMonitoringArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid monitor_security arguments');
            }
            const monitoring = await this.setupMonitoring(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(monitoring, null, 2) }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Security Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  // Type guard functions
  private validateSecurityScanArgs(args: unknown): args is SecurityScanArgs {
    const a = args as SecurityScanArgs;
    return typeof a.target === 'string' &&
      SECURITY_SCAN_TYPES.includes(a.type as SecurityScanType);
  }

  private validateThreatModelArgs(args: unknown): args is ThreatModelArgs {
    const a = args as ThreatModelArgs;
    return a.system &&
      Array.isArray(a.system.components) &&
      Array.isArray(a.system.dataFlows) &&
      Array.isArray(a.system.trustBoundaries);
  }

  private validateSecurityValidationArgs(args: unknown): args is SecurityValidationArgs {
    const a = args as SecurityValidationArgs;
    return Array.isArray(a.requirements) &&
      typeof a.implementation === 'string';
  }

  private validateContinuousMonitoringArgs(args: unknown): args is ContinuousMonitoringArgs {
    const a = args as ContinuousMonitoringArgs;
    return Array.isArray(a.assets) &&
      Array.isArray(a.alertThresholds) &&
      typeof a.interval === 'number';
  }

  private async performSecurityScan(args: SecurityScanArgs): Promise<object> {
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate security scan
    const results = {
      id: scanId,
      target: args.target,
      type: args.type,
      findings: [
        {
          severity: 'high',
          category: 'vulnerability',
          description: 'Potential SQL injection vulnerability',
          location: `${args.target}/api/data`,
          recommendation: 'Implement proper input validation'
        },
        {
          severity: 'medium',
          category: 'configuration',
          description: 'Insecure SSL configuration',
          location: 'server.config',
          recommendation: 'Update SSL configuration to industry standards'
        }
      ],
      metrics: {
        vulnerabilities: {
          critical: Math.floor(Math.random() * 2),
          high: Math.floor(Math.random() * 5),
          medium: Math.floor(Math.random() * 10),
          low: Math.floor(Math.random() * 20)
        },
        coverage: Math.random() * 100,
        duration: Math.floor(Math.random() * 300)
      },
      metadata: {
        timestamp: new Date().toISOString(),
        options: args.options || {}
      }
    };

    this.scanResults.set(scanId, results);
    
    // Publish event for autonomous workflow
    this.eventBus.publish({
      type: 'security.scan.completed',
      severity: results.findings[0]?.severity as ThreatSeverity || 'info',
      details: results,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  private async generateThreatModel(args: ThreatModelArgs): Promise<object> {
    const modelId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate threat modeling
    const model = {
      id: modelId,
      system: args.system,
      threats: args.system.components.map(component => ({
        component,
        threats: [
          {
            type: 'data-exposure',
            likelihood: Math.random(),
            impact: Math.random(),
            mitigations: ['encryption', 'access-control']
          },
          {
            type: 'denial-of-service',
            likelihood: Math.random(),
            impact: Math.random(),
            mitigations: ['rate-limiting', 'caching']
          }
        ]
      })),
      dataFlowAnalysis: args.system.dataFlows.map(flow => ({
        ...flow,
        risks: [
          {
            type: 'interception',
            severity: 'high',
            mitigation: 'Use TLS for data in transit'
          }
        ]
      })),
      recommendations: [
        'Implement encryption for sensitive data',
        'Add authentication for all endpoints',
        'Set up monitoring and alerting'
      ],
      metadata: {
        context: args.context || 'general',
        timestamp: new Date().toISOString()
      }
    };

    this.threatModels.set(modelId, model);
    
    // Publish event for autonomous workflow
    this.eventBus.publish({
      type: 'security.threat_model.created',
      severity: 'info',
      details: model,
      timestamp: new Date().toISOString()
    });

    return model;
  }

  private async validateSecurity(args: SecurityValidationArgs): Promise<object> {
    const validationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate security validation
    const validation = {
      id: validationId,
      requirements: args.requirements.map(req => ({
        requirement: req,
        status: Math.random() > 0.2 ? 'passed' : 'failed',
        evidence: `Implementation at ${args.implementation}`,
        notes: `Validation performed in ${args.environment || 'default'} environment`
      })),
      summary: {
        passedCount: Math.floor(args.requirements.length * 0.8),
        failedCount: Math.ceil(args.requirements.length * 0.2),
        coverage: Math.random() * 100
      },
      recommendations: [
        'Add additional security headers',
        'Implement rate limiting',
        'Enable audit logging'
      ],
      metadata: {
        environment: args.environment || 'default',
        timestamp: new Date().toISOString()
      }
    };

    this.validations.set(validationId, validation);
    
    // Publish event for autonomous workflow
    this.eventBus.publish({
      type: 'security.validation.completed',
      severity: validation.summary.failedCount > 0 ? 'high' : 'info',
      details: validation,
      timestamp: new Date().toISOString()
    });

    return validation;
  }

  private async setupMonitoring(args: ContinuousMonitoringArgs): Promise<object> {
    // Simulate monitoring setup
    const monitoring = {
      assets: args.assets.map(asset => ({
        asset,
        status: 'monitored',
        metrics: args.alertThresholds.reduce((acc, threshold) => ({
          ...acc,
          [threshold.metric]: {
            current: Math.random() * threshold.threshold,
            threshold: threshold.threshold,
            status: 'normal'
          }
        }), {})
      })),
      alerts: {
        rules: args.alertThresholds.map(threshold => ({
          ...threshold,
          status: 'active'
        })),
        channels: ['slack', 'email', 'dashboard']
      },
      schedule: {
        interval: args.interval,
        nextCheck: new Date(Date.now() + args.interval * 1000).toISOString()
      },
      metadata: {
        setup: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      }
    };

    // Publish event for autonomous workflow
    this.eventBus.publish({
      type: 'security.monitoring.configured',
      severity: 'info',
      details: monitoring,
      timestamp: new Date().toISOString()
    });

    return monitoring;
  }

  private async notifyArchitectureTeam(threatModel: object): Promise<void> {
    // Simulate notification to architecture team
    console.error('[Security] Notifying architecture team of threat model updates');
    // In a real implementation, this would integrate with the system-architect-server
  }

  private async notifyDevOpsTeam(scanResults: object): Promise<void> {
    // Simulate notification to DevOps team
    console.error('[Security] Notifying DevOps team of security scan results');
    // In a real implementation, this would integrate with the devops-engineer-server
  }

  private async notifyDevelopmentTeam(scanResults: object): Promise<void> {
    // Simulate notification to development team
    console.error('[Security] Notifying development team of security scan results');
    // In a real implementation, this would integrate with the development-team-server
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Security Engineer MCP Server running on stdio');
  }
}

const server = new SecurityEngineerServer();
server.run().catch(console.error);