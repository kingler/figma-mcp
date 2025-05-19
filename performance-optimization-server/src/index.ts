import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request
} from '@modelcontextprotocol/sdk/types.js';

type AnalysisType = 'api' | 'database' | 'system' | 'code';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

interface AnalyzePerformanceArgs {
  target: string;
  type: AnalysisType;
  metrics: string[];
  duration?: number;
}

interface AnalysisResult extends AnalyzePerformanceArgs {
  metricValues: Record<string, number>;
  timestamp: string;
}

interface OptimizationSuggestionArgs {
  analysisId: string;
  context?: string;
  constraints?: Record<string, unknown>;
}

interface MonitorMetricsArgs {
  metrics: string[];
  interval: number;
  threshold?: Record<string, number>;
}

interface BenchmarkArgs {
  scenario: string;
  parameters: Record<string, unknown>;
  iterations: number;
}

function validateAnalyzePerformanceArgs(args: unknown): args is AnalyzePerformanceArgs {
  const a = args as Partial<AnalyzePerformanceArgs>;
  return typeof a.target === 'string' &&
    ['api', 'database', 'system', 'code'].includes(a.type as string) &&
    Array.isArray(a.metrics) &&
    a.metrics.every(m => typeof m === 'string') &&
    (a.duration === undefined || typeof a.duration === 'number');
}

function validateOptimizationSuggestionArgs(args: unknown): args is OptimizationSuggestionArgs {
  const a = args as Partial<OptimizationSuggestionArgs>;
  return typeof a.analysisId === 'string' &&
    (a.context === undefined || typeof a.context === 'string') &&
    (a.constraints === undefined || typeof a.constraints === 'object');
}

function validateMonitorMetricsArgs(args: unknown): args is MonitorMetricsArgs {
  const a = args as Partial<MonitorMetricsArgs>;
  return Array.isArray(a.metrics) &&
    a.metrics.every(m => typeof m === 'string') &&
    typeof a.interval === 'number' &&
    (a.threshold === undefined || typeof a.threshold === 'object');
}

function validateBenchmarkArgs(args: unknown): args is BenchmarkArgs {
  const a = args as Partial<BenchmarkArgs>;
  return typeof a.scenario === 'string' &&
    typeof a.parameters === 'object' &&
    typeof a.iterations === 'number';
}

class PerformanceOptimizationServer {
  private server: Server;
  private analyses: Map<string, AnalysisResult>;
  private metrics: Map<string, number[]>;

  constructor() {
    this.server = new Server(
      {
        name: 'performance-optimization-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.analyses = new Map();
    this.metrics = new Map();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_performance',
          description: 'Analyze performance of a specified target',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target to analyze' },
              type: {
                type: 'string',
                enum: ['api', 'database', 'system', 'code'],
                description: 'Type of analysis'
              },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to analyze'
              },
              duration: {
                type: 'number',
                description: 'Analysis duration in seconds'
              }
            },
            required: ['target', 'type', 'metrics']
          }
        },
        {
          name: 'get_optimization_suggestions',
          description: 'Get optimization suggestions based on analysis',
          inputSchema: {
            type: 'object',
            properties: {
              analysisId: { type: 'string', description: 'Analysis ID' },
              context: { type: 'string', description: 'Additional context' },
              constraints: {
                type: 'object',
                description: 'Optimization constraints'
              }
            },
            required: ['analysisId']
          }
        },
        {
          name: 'monitor_metrics',
          description: 'Monitor performance metrics in real-time',
          inputSchema: {
            type: 'object',
            properties: {
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to monitor'
              },
              interval: {
                type: 'number',
                description: 'Monitoring interval in seconds'
              },
              threshold: {
                type: 'object',
                description: 'Alert thresholds for metrics'
              }
            },
            required: ['metrics', 'interval']
          }
        },
        {
          name: 'run_benchmark',
          description: 'Run performance benchmark tests',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: { type: 'string', description: 'Benchmark scenario' },
              parameters: {
                type: 'object',
                description: 'Benchmark parameters'
              },
              iterations: {
                type: 'number',
                description: 'Number of iterations'
              }
            },
            required: ['scenario', 'parameters', 'iterations']
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
          case 'analyze_performance': {
            if (!validateAnalyzePerformanceArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid analyze_performance arguments');
            }
            
            const analysisId = await this.analyzePerformance(
              request.params.arguments.target,
              request.params.arguments.type as AnalysisType,
              request.params.arguments.metrics,
              request.params.arguments.duration
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ analysisId }, null, 2)
                }
              ]
            };
          }

          case 'get_optimization_suggestions': {
            if (!validateOptimizationSuggestionArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid get_optimization_suggestions arguments');
            }

            const suggestions = await this.getOptimizationSuggestions(
              request.params.arguments.analysisId,
              request.params.arguments.context,
              request.params.arguments.constraints
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(suggestions, null, 2)
                }
              ]
            };
          }

          case 'monitor_metrics': {
            if (!validateMonitorMetricsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid monitor_metrics arguments');
            }

            const monitoring = await this.monitorMetrics(
              request.params.arguments.metrics,
              request.params.arguments.interval,
              request.params.arguments.threshold
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

          case 'run_benchmark': {
            if (!validateBenchmarkArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid run_benchmark arguments');
            }

            const results = await this.runBenchmark(
              request.params.arguments.scenario,
              request.params.arguments.parameters,
              request.params.arguments.iterations
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2)
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
        console.error('[Performance Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async analyzePerformance(
    target: string,
    type: AnalysisType,
    metrics: string[],
    duration?: number
  ): Promise<string> {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate performance analysis
    const analysis: AnalysisResult = {
      target,
      type,
      metrics,
      duration: duration || 60,
      metricValues: metrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: Math.random() * 100
      }), {}),
      timestamp: new Date().toISOString()
    };

    this.analyses.set(analysisId, analysis);
    return analysisId;
  }

  private async getOptimizationSuggestions(
    analysisId: string,
    context?: string,
    constraints?: Record<string, unknown>
  ): Promise<object> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`);
    }

    return {
      analysisId,
      suggestions: [
        {
          type: 'optimization',
          target: analysis.target,
          description: 'Optimize resource utilization',
          impact: 'high',
          effort: 'medium',
          metrics: analysis.metricValues
        },
        {
          type: 'configuration',
          target: analysis.target,
          description: 'Adjust system parameters',
          impact: 'medium',
          effort: 'low',
          parameters: constraints || {}
        }
      ],
      context: context || 'General optimization',
      timestamp: new Date().toISOString()
    };
  }

  private async monitorMetrics(
    metrics: string[],
    interval: number,
    threshold?: Record<string, number>
  ): Promise<object> {
    // Simulate metric collection
    const metricValues = metrics.reduce((acc, metric) => {
      const values = Array.from({ length: 5 }, () => Math.random() * 100);
      this.metrics.set(metric, values);
      return {
        ...acc,
        [metric]: {
          current: values[values.length - 1],
          trend: values,
          threshold: threshold?.[metric] || null,
          status: 'normal'
        }
      };
    }, {});

    return {
      metrics: metricValues,
      interval,
      timestamp: new Date().toISOString()
    };
  }

  private async runBenchmark(
    scenario: string,
    parameters: Record<string, unknown>,
    iterations: number
  ): Promise<object> {
    // Simulate benchmark execution
    const results = Array.from({ length: iterations }, (_, i) => ({
      iteration: i + 1,
      duration: Math.random() * 1000,
      metrics: {
        throughput: Math.random() * 1000,
        latency: Math.random() * 100,
        errorRate: Math.random() * 0.1
      }
    }));

    return {
      scenario,
      parameters,
      iterations,
      results,
      summary: {
        averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / iterations,
        maxThroughput: Math.max(...results.map(r => r.metrics.throughput)),
        averageLatency: results.reduce((sum, r) => sum + r.metrics.latency, 0) / iterations
      },
      timestamp: new Date().toISOString()
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Performance Optimization MCP Server running on stdio');
  }
}

const server = new PerformanceOptimizationServer();
server.run().catch(console.error);