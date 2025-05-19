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
import { parse, stringify } from 'yaml';
import * as esprima from 'esprima';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type CodeQualityMetric = 'complexity' | 'maintainability' | 'reliability' | 'security';
type CodeIssueLevel = 'error' | 'warning' | 'info';

interface AnalyzeCodeArgs {
  files: string[];
  metrics: CodeQualityMetric[];
  rules?: {
    name: string;
    level: CodeIssueLevel;
    config?: Record<string, unknown>;
  }[];
}

interface ReviewChangesArgs {
  diff: string;
  context?: {
    repository: string;
    branch: string;
    commit: string;
  };
  rules?: {
    name: string;
    level: CodeIssueLevel;
    config?: Record<string, unknown>;
  }[];
}

interface TrackMetricsArgs {
  project: string;
  metrics: {
    name: string;
    threshold?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
  }[];
  timeframe: {
    start: string;
    end: string;
  };
}

interface ValidateComplianceArgs {
  files: string[];
  standards: string[];
  context?: {
    environment: string;
    requirements?: Record<string, unknown>;
  };
}

// Event system for autonomous workflow integration
interface CodeQualityEvent {
  type: string;
  level: CodeIssueLevel;
  details: Record<string, unknown>;
  timestamp: string;
}

class CodeQualityEventBus {
  private static instance: CodeQualityEventBus;
  private subscribers: Map<string, ((event: CodeQualityEvent) => void)[]>;

  private constructor() {
    this.subscribers = new Map();
  }

  static getInstance(): CodeQualityEventBus {
    if (!CodeQualityEventBus.instance) {
      CodeQualityEventBus.instance = new CodeQualityEventBus();
    }
    return CodeQualityEventBus.instance;
  }

  subscribe(eventType: string, callback: (event: CodeQualityEvent) => void): void {
    const subscribers = this.subscribers.get(eventType) || [];
    subscribers.push(callback);
    this.subscribers.set(eventType, subscribers);
  }

  publish(event: CodeQualityEvent): void {
    const subscribers = this.subscribers.get(event.type) || [];
    subscribers.forEach(callback => callback(event));
  }
}

// Type guard functions
function validateAnalyzeCodeArgs(args: unknown): args is AnalyzeCodeArgs {
  const a = args as Partial<AnalyzeCodeArgs>;
  return Array.isArray(a.files) &&
    a.files.every(f => typeof f === 'string') &&
    Array.isArray(a.metrics) &&
    a.metrics.every(m => ['complexity', 'maintainability', 'reliability', 'security'].includes(m)) &&
    (a.rules === undefined || (
      Array.isArray(a.rules) &&
      a.rules.every(r =>
        typeof r.name === 'string' &&
        ['error', 'warning', 'info'].includes(r.level) &&
        (r.config === undefined || typeof r.config === 'object')
      )
    ));
}

function validateReviewChangesArgs(args: unknown): args is ReviewChangesArgs {
  const a = args as Partial<ReviewChangesArgs>;
  return typeof a.diff === 'string' &&
    (a.context === undefined || (
      typeof a.context === 'object' &&
      typeof a.context.repository === 'string' &&
      typeof a.context.branch === 'string' &&
      typeof a.context.commit === 'string'
    )) &&
    (a.rules === undefined || (
      Array.isArray(a.rules) &&
      a.rules.every(r =>
        typeof r.name === 'string' &&
        ['error', 'warning', 'info'].includes(r.level) &&
        (r.config === undefined || typeof r.config === 'object')
      )
    ));
}

function validateTrackMetricsArgs(args: unknown): args is TrackMetricsArgs {
  const a = args as Partial<TrackMetricsArgs>;
  return typeof a.project === 'string' &&
    Array.isArray(a.metrics) &&
    a.metrics.every(m =>
      typeof m.name === 'string' &&
      (m.threshold === undefined || typeof m.threshold === 'number') &&
      (m.trend === undefined || ['increasing', 'decreasing', 'stable'].includes(m.trend))
    ) &&
    typeof a.timeframe === 'object' &&
    typeof a.timeframe.start === 'string' &&
    typeof a.timeframe.end === 'string';
}

function validateValidateComplianceArgs(args: unknown): args is ValidateComplianceArgs {
  const a = args as Partial<ValidateComplianceArgs>;
  return Array.isArray(a.files) &&
    a.files.every(f => typeof f === 'string') &&
    Array.isArray(a.standards) &&
    a.standards.every(s => typeof s === 'string') &&
    (a.context === undefined || (
      typeof a.context === 'object' &&
      typeof a.context.environment === 'string' &&
      (a.context.requirements === undefined || typeof a.context.requirements === 'object')
    ));
}

class CodeQualityAnalystServer {
  private server: Server;
  private eventBus: CodeQualityEventBus;
  private analyses: Map<string, object>;
  private reviews: Map<string, object>;
  private metrics: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'code-quality-analyst-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.eventBus = CodeQualityEventBus.getInstance();
    this.analyses = new Map();
    this.reviews = new Map();
    this.metrics = new Map();
    this.setupEventHandlers();
    this.setupToolHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for code changes
    this.eventBus.subscribe('code.committed', async (event) => {
      await this.analyzeCodeChanges(event.details as Record<string, unknown>);
    });

    // Listen for deployment events
    this.eventBus.subscribe('deployment.requested', async (event) => {
      await this.validateDeploymentCode(event.details as Record<string, unknown>);
    });

    // Listen for compliance updates
    this.eventBus.subscribe('compliance.updated', async (event) => {
      await this.updateComplianceRules(event.details as Record<string, unknown>);
    });
  }

  private setupToolHandlers() {
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
        },
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
              },
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    level: {
                      type: 'string',
                      enum: ['error', 'warning', 'info']
                    },
                    config: { type: 'object' }
                  },
                  required: ['name', 'level']
                }
              }
            },
            required: ['files', 'metrics']
          }
        },
        {
          name: 'review_changes',
          description: 'Review code changes',
          inputSchema: {
            type: 'object',
            properties: {
              diff: { type: 'string', description: 'Code diff to review' },
              context: {
                type: 'object',
                properties: {
                  repository: { type: 'string' },
                  branch: { type: 'string' },
                  commit: { type: 'string' }
                },
                required: ['repository', 'branch', 'commit']
              },
              rules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    level: {
                      type: 'string',
                      enum: ['error', 'warning', 'info']
                    },
                    config: { type: 'object' }
                  },
                  required: ['name', 'level']
                }
              }
            },
            required: ['diff']
          }
        },
        {
          name: 'track_metrics',
          description: 'Track code quality metrics',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Project name' },
              metrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    threshold: { type: 'number' },
                    trend: {
                      type: 'string',
                      enum: ['increasing', 'decreasing', 'stable']
                    }
                  },
                  required: ['name']
                }
              },
              timeframe: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' }
                },
                required: ['start', 'end']
              }
            },
            required: ['project', 'metrics', 'timeframe']
          }
        },
        {
          name: 'validate_compliance',
          description: 'Validate code compliance',
          inputSchema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files to validate'
              },
              standards: {
                type: 'array',
                items: { type: 'string' },
                description: 'Compliance standards'
              },
              context: {
                type: 'object',
                properties: {
                  environment: { type: 'string' },
                  requirements: { type: 'object' }
                },
                required: ['environment']
              }
            },
            required: ['files', 'standards']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      // Add a timeout mechanism to prevent hanging
      const executeWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
        let timeoutId: NodeJS.Timeout;
        
        console.error(`[Code Quality] Setting timeout of ${timeoutMs}ms for operation`);
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            console.error(`[Code Quality] Operation timed out after ${timeoutMs}ms`);
            reject(new McpError(
              ErrorCode.InternalError,
              `Operation timed out after ${timeoutMs}ms`
            ));
          }, timeoutMs);
        });
        
        try {
          console.error('[Code Quality] Executing operation with timeout...');
          const result = await Promise.race([promise, timeoutPromise]);
          console.error('[Code Quality] Operation completed successfully within timeout');
          clearTimeout(timeoutId!);
          return result as T;
        } catch (error) {
          console.error('[Code Quality] Error during operation:', error);
          clearTimeout(timeoutId!);
          throw error;
        }
      };

      try {
        // Special case for echo tool - bypass timeout mechanism for testing
        if (request.params.name === 'echo') {
          console.error('[Code Quality] Echo tool called');
          const message = request.params.arguments?.message || 'No message provided';
          console.error(`[Code Quality] Echoing message: ${message}`);
          return {
            content: [{ type: 'text', text: `Echo: ${message}` }]
          };
        }
        
        switch (request.params.name) {
          case 'analyze_code': {
            const args = request.params.arguments as unknown;
            if (!validateAnalyzeCodeArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid analyze_code arguments');
            }
            const analysis = await executeWithTimeout(this.analyzeCode(args));
            return {
              content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
            };
          }

          case 'review_changes': {
            const args = request.params.arguments as unknown;
            if (!validateReviewChangesArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid review_changes arguments');
            }
            const review = await executeWithTimeout(this.reviewChanges(args));
            return {
              content: [{ type: 'text', text: JSON.stringify(review, null, 2) }]
            };
          }

          case 'track_metrics': {
            const args = request.params.arguments as unknown;
            if (!validateTrackMetricsArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid track_metrics arguments');
            }
            const tracking = await executeWithTimeout(this.trackMetrics(args));
            return {
              content: [{ type: 'text', text: JSON.stringify(tracking, null, 2) }]
            };
          }

          case 'validate_compliance': {
            const args = request.params.arguments as unknown;
            if (!validateValidateComplianceArgs(args)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_compliance arguments');
            }
            const validation = await executeWithTimeout(this.validateCompliance(args));
            return {
              content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Code Quality Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async analyzeCode(args: AnalyzeCodeArgs): Promise<object> {
    console.error('[Code Quality] Starting code analysis...');
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate code analysis using esprima for JavaScript/TypeScript files
    console.error('[Code Quality] Generating analysis data...');
    const analysis = {
      id: analysisId,
      files: args.files,
      metrics: args.metrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: {
          score: Math.random() * 100,
          issues: Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
            type: metric,
            severity: Math.random() > 0.5 ? 'error' : 'warning',
            location: `${args.files[0]}:${Math.floor(Math.random() * 100)}`,
            message: `${metric} issue detected`
          }))
        }
      }), {}),
      summary: {
        score: Math.random() * 100,
        issues: Math.floor(Math.random() * 20),
        coverage: Math.random() * 100
      },
      recommendations: [
        'Reduce cyclomatic complexity',
        'Improve code documentation',
        'Fix security vulnerabilities'
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        rules: args.rules || []
      }
    };

    this.analyses.set(analysisId, analysis);
    
    // Publish event for autonomous workflow
    console.error('[Code Quality] Publishing analysis event...');
    this.eventBus.publish({
      type: 'code.analyzed',
      level: analysis.summary.issues > 10 ? 'error' : 'info',
      details: analysis,
      timestamp: new Date().toISOString()
    });

    console.error('[Code Quality] Analysis completed successfully');
    return analysis;
  }

  private async reviewChanges(args: ReviewChangesArgs): Promise<object> {
    console.error('[Code Quality] Starting code review...');
    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate code review
    console.error('[Code Quality] Generating review data...');
    const review = {
      id: reviewId,
      context: args.context || {
        repository: 'unknown',
        branch: 'unknown',
        commit: 'unknown'
      },
      changes: {
        files: Math.floor(Math.random() * 10),
        additions: Math.floor(Math.random() * 1000),
        deletions: Math.floor(Math.random() * 1000)
      },
      issues: Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
        type: Math.random() > 0.5 ? 'style' : 'logic',
        severity: Math.random() > 0.5 ? 'error' : 'warning',
        file: `file${Math.floor(Math.random() * 5)}.ts`,
        line: Math.floor(Math.random() * 100),
        message: 'Code issue detected'
      })),
      suggestions: [
        'Extract duplicated code into function',
        'Add error handling',
        'Improve variable naming'
      ],
      metadata: {
        reviewer: 'code-quality-analyst-mcp',
        timestamp: new Date().toISOString()
      }
    };

    this.reviews.set(reviewId, review);
    
    // Publish event for autonomous workflow
    this.eventBus.publish({
      type: 'changes.reviewed',
      level: review.issues.length > 0 ? 'warning' : 'info',
      details: review,
      timestamp: new Date().toISOString()
    });

    return review;
  }

  private async trackMetrics(args: TrackMetricsArgs): Promise<object> {
    console.error('[Code Quality] Starting metrics tracking...');
    // Simulate metrics tracking
    const tracking = {
      project: args.project,
      timeframe: args.timeframe,
      metrics: args.metrics.reduce((acc, metric) => ({
        ...acc,
        [metric.name]: {
          current: Math.random() * 100,
          threshold: metric.threshold,
          trend: metric.trend || 'stable',
          history: Array.from({ length: 10 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 86400000).toISOString(),
            value: Math.random() * 100
          }))
        }
      }), {}),
      trends: {
        overall: Math.random() > 0.5 ? 'improving' : 'degrading',
        areas: {
          complexity: Math.random() > 0.5 ? 'stable' : 'increasing',
          coverage: Math.random() > 0.5 ? 'increasing' : 'stable',
          issues: Math.random() > 0.5 ? 'decreasing' : 'stable'
        }
      },
      alerts: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
        metric: args.metrics[0].name,
        threshold: args.metrics[0].threshold || 80,
        current: Math.random() * 100,
        status: 'warning'
      }))
    };

    // Publish event for autonomous workflow
    console.error('[Code Quality] Publishing metrics event...');
    this.eventBus.publish({
      type: 'metrics.tracked',
      level: tracking.alerts.length > 0 ? 'warning' : 'info',
      details: tracking,
      timestamp: new Date().toISOString()
    });

    console.error('[Code Quality] Metrics tracking completed successfully');
    return tracking;
  }

  private async validateCompliance(args: ValidateComplianceArgs): Promise<object> {
    console.error('[Code Quality] Starting compliance validation...');
    // Simulate compliance validation
    const validation = {
      files: args.files,
      standards: args.standards,
      context: args.context || {
        environment: 'default',
        requirements: {}
      },
      results: args.standards.map(standard => ({
        standard,
        status: Math.random() > 0.2 ? 'passed' : 'failed',
        checks: Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
          rule: `rule-${Math.floor(Math.random() * 100)}`,
          status: Math.random() > 0.2 ? 'passed' : 'failed',
          details: 'Compliance check details'
        }))
      })),
      summary: {
        passed: Math.floor(args.standards.length * 0.8),
        failed: Math.ceil(args.standards.length * 0.2),
        coverage: Math.random() * 100
      },
      recommendations: [
        'Update security policies',
        'Implement missing controls',
        'Document compliance procedures'
      ]
    };

    // Publish event for autonomous workflow
    console.error('[Code Quality] Publishing compliance event...');
    this.eventBus.publish({
      type: 'compliance.validated',
      level: validation.summary.failed > 0 ? 'error' : 'info',
      details: validation,
      timestamp: new Date().toISOString()
    });

    console.error('[Code Quality] Compliance validation completed successfully');
    return validation;
  }

  private async analyzeCodeChanges(changes: Record<string, unknown>): Promise<void> {
    // Analyze code changes and provide feedback
    console.error('[Code Quality] Analyzing code changes:', changes);
  }

  private async validateDeploymentCode(deployment: Record<string, unknown>): Promise<void> {
    // Validate code quality before deployment
    console.error('[Code Quality] Validating deployment code:', deployment);
  }

  private async updateComplianceRules(rules: Record<string, unknown>): Promise<void> {
    // Update compliance validation rules
    console.error('[Code Quality] Updating compliance rules:', rules);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Quality Analyst MCP Server running on stdio');
  }
}

const server = new CodeQualityAnalystServer();
server.run().catch(console.error);
