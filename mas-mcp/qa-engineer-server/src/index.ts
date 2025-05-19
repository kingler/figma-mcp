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
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import services
import { CodeAnalyzerFactory } from './services/code-analysis/analyzer-factory.js';
import { LLMProviderFactory } from './services/llm/provider-factory.js';
import { LLMProvider } from './services/llm/types.js';
import { TestPromptGenerator } from './services/prompts/test-prompts.js';
import { TestExecutorFactory } from './services/test-execution/executor-factory.js';

// Types
interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type TestType = 'unit' | 'integration' | 'e2e' | 'performance';

interface TestCase {
  id: string;
  description: string;
  steps: string[];
  assertions: string[];
  priority: number;
}

interface TestPlan {
  scope: string;
  type: TestType;
  language: string;
  requirements: string[];
  coverage: number;
  cases: TestCase[];
  timestamp: string;
}

interface GenerateTestPlanArgs {
  scope: string;
  type: TestType;
  language: string;
  sourceFiles?: string[];
  requirements?: string[];
  coverage?: number;
}

interface GenerateTestsArgs {
  scope: string;
  type: TestType;
  language: string;
  sourceFiles?: string[];
  requirements?: string[];
  coverage?: number;
  outputDir?: string;
}

interface ExecuteTestsArgs {
  testDir: string;
  language: string;
  framework?: string;
}

interface GenerateAutomationScriptArgs {
  scenario: string;
  language: string;
  framework: string;
  steps: AutomationStep[];
  outputFile?: string;
}

interface AutomationStep {
  action: string;
  target?: string;
  value?: string;
  timeout?: number;
}

interface CollectMetricsArgs {
  metrics: string[];
  duration: number;
  interval: number;
  outputFile?: string;
}

// Validation functions
function validateGenerateTestPlanArgs(args: unknown): args is GenerateTestPlanArgs {
  const a = args as Partial<GenerateTestPlanArgs>;
  return typeof a.scope === 'string' &&
    ['unit', 'integration', 'e2e', 'performance'].includes(a.type as string) &&
    typeof a.language === 'string' &&
    (a.sourceFiles === undefined || (Array.isArray(a.sourceFiles) && a.sourceFiles.every(f => typeof f === 'string'))) &&
    (a.requirements === undefined || (Array.isArray(a.requirements) && a.requirements.every(r => typeof r === 'string'))) &&
    (a.coverage === undefined || typeof a.coverage === 'number');
}

function validateGenerateTestsArgs(args: unknown): args is GenerateTestsArgs {
  const a = args as Partial<GenerateTestsArgs>;
  return typeof a.scope === 'string' &&
    ['unit', 'integration', 'e2e', 'performance'].includes(a.type as string) &&
    typeof a.language === 'string' &&
    (a.sourceFiles === undefined || (Array.isArray(a.sourceFiles) && a.sourceFiles.every(f => typeof f === 'string'))) &&
    (a.requirements === undefined || (Array.isArray(a.requirements) && a.requirements.every(r => typeof r === 'string'))) &&
    (a.coverage === undefined || typeof a.coverage === 'number') &&
    (a.outputDir === undefined || typeof a.outputDir === 'string');
}

function validateExecuteTestsArgs(args: unknown): args is ExecuteTestsArgs {
  const a = args as Partial<ExecuteTestsArgs>;
  return typeof a.testDir === 'string' &&
    typeof a.language === 'string' &&
    (a.framework === undefined || typeof a.framework === 'string');
}

function validateGenerateAutomationScriptArgs(args: unknown): args is GenerateAutomationScriptArgs {
  const a = args as Partial<GenerateAutomationScriptArgs>;
  return typeof a.scenario === 'string' &&
    typeof a.language === 'string' &&
    typeof a.framework === 'string' &&
    Array.isArray(a.steps) &&
    a.steps.every(s => 
      typeof s.action === 'string' &&
      (s.target === undefined || typeof s.target === 'string') &&
      (s.value === undefined || typeof s.value === 'string') &&
      (s.timeout === undefined || typeof s.timeout === 'number')
    ) &&
    (a.outputFile === undefined || typeof a.outputFile === 'string');
}

function validateCollectMetricsArgs(args: unknown): args is CollectMetricsArgs {
  const a = args as Partial<CollectMetricsArgs>;
  return Array.isArray(a.metrics) &&
    a.metrics.every(m => typeof m === 'string') &&
    typeof a.duration === 'number' &&
    typeof a.interval === 'number' &&
    (a.outputFile === undefined || typeof a.outputFile === 'string');
}

class QAEngineerServer {
  private server: Server;
  private testPlans: Map<string, TestPlan>;
  private testResults: Map<string, object>;
  private metrics: Map<string, number[]>;
  
  // Services
  private codeAnalyzerFactory: CodeAnalyzerFactory;
  private llmProvider: LLMProvider;
  private promptGenerator: TestPromptGenerator;

  constructor() {
    this.server = new Server(
      {
        name: 'qa-engineer-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize services
    this.codeAnalyzerFactory = new CodeAnalyzerFactory();
    this.llmProvider = LLMProviderFactory.getDefaultProvider();
    this.promptGenerator = new TestPromptGenerator();

    // Initialize state
    this.testPlans = new Map();
    this.testResults = new Map();
    this.metrics = new Map();
    
    // Setup tool handlers
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_test_plan',
          description: 'Generate a comprehensive test plan with test cases',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', description: 'Testing scope (e.g., module name, function name)' },
              type: {
                type: 'string',
                enum: ['unit', 'integration', 'e2e', 'performance'],
                description: 'Type of testing'
              },
              language: {
                type: 'string',
                description: 'Programming language (python, nodejs)'
              },
              sourceFiles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Source files to analyze for test generation'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Test requirements'
              },
              coverage: {
                type: 'number',
                description: 'Target coverage percentage'
              }
            },
            required: ['scope', 'type', 'language']
          }
        },
        {
          name: 'generate_tests',
          description: 'Generate and write test files for a project',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', description: 'Testing scope (e.g., module name, function name)' },
              type: {
                type: 'string',
                enum: ['unit', 'integration', 'e2e', 'performance'],
                description: 'Type of testing'
              },
              language: {
                type: 'string',
                description: 'Programming language (python, nodejs)'
              },
              sourceFiles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Source files to analyze for test generation'
              },
              requirements: {
                type: 'array',
                items: { type: 'string' },
                description: 'Test requirements'
              },
              coverage: {
                type: 'number',
                description: 'Target coverage percentage'
              },
              outputDir: {
                type: 'string',
                description: 'Directory to write test files to'
              }
            },
            required: ['scope', 'type', 'language']
          }
        },
        {
          name: 'execute_tests',
          description: 'Execute tests in a directory',
          inputSchema: {
            type: 'object',
            properties: {
              testDir: { type: 'string', description: 'Directory containing tests' },
              language: { type: 'string', description: 'Programming language (python, nodejs)' },
              framework: { type: 'string', description: 'Test framework (pytest, unittest, jest, mocha)' }
            },
            required: ['testDir', 'language']
          }
        },
        {
          name: 'generate_automation_script',
          description: 'Generate test automation script',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: { type: 'string', description: 'Test scenario' },
              language: { type: 'string', description: 'Programming language (python, nodejs)' },
              framework: { type: 'string', description: 'Automation framework (selenium, playwright, puppeteer)' },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string' },
                    target: { type: 'string' },
                    value: { type: 'string' },
                    timeout: { type: 'number' }
                  },
                  required: ['action']
                },
                description: 'Test steps'
              },
              outputFile: { type: 'string', description: 'Output file path' }
            },
            required: ['scenario', 'language', 'framework', 'steps']
          }
        },
        {
          name: 'collect_metrics',
          description: 'Collect test metrics',
          inputSchema: {
            type: 'object',
            properties: {
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Metrics to collect'
              },
              duration: {
                type: 'number',
                description: 'Collection duration in seconds'
              },
              interval: {
                type: 'number',
                description: 'Collection interval in seconds'
              },
              outputFile: {
                type: 'string',
                description: 'Output file path'
              }
            },
            required: ['metrics', 'duration', 'interval']
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
          case 'generate_test_plan': {
            if (!validateGenerateTestPlanArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_test_plan arguments');
            }
            
            const testPlan = await this.generateTestPlan(
              request.params.arguments.scope,
              request.params.arguments.type,
              request.params.arguments.language,
              request.params.arguments.sourceFiles,
              request.params.arguments.requirements,
              request.params.arguments.coverage
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(testPlan, null, 2)
                }
              ]
            };
          }

          case 'generate_tests': {
            if (!validateGenerateTestsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_tests arguments');
            }

            const testFiles = await this.generateTests(
              request.params.arguments.scope,
              request.params.arguments.type,
              request.params.arguments.language,
              request.params.arguments.sourceFiles,
              request.params.arguments.requirements,
              request.params.arguments.coverage,
              request.params.arguments.outputDir
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ testFiles }, null, 2)
                }
              ]
            };
          }

          case 'execute_tests': {
            if (!validateExecuteTestsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid execute_tests arguments');
            }

            const results = await this.executeTests(
              request.params.arguments.testDir,
              request.params.arguments.language,
              request.params.arguments.framework
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

          case 'generate_automation_script': {
            if (!validateGenerateAutomationScriptArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_automation_script arguments');
            }

            const script = await this.generateAutomationScript(
              request.params.arguments.scenario,
              request.params.arguments.language,
              request.params.arguments.framework,
              request.params.arguments.steps,
              request.params.arguments.outputFile
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(script, null, 2)
                }
              ]
            };
          }

          case 'collect_metrics': {
            if (!validateCollectMetricsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid collect_metrics arguments');
            }

            const metrics = await this.collectMetrics(
              request.params.arguments.metrics,
              request.params.arguments.duration,
              request.params.arguments.interval,
              request.params.arguments.outputFile
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
        console.error('[QA Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  /**
   * Generate a test plan using code analysis and LLM
   */
  private async generateTestPlan(
    scope: string,
    type: TestType,
    language: string,
    sourceFiles?: string[],
    requirements?: string[],
    coverage?: number
  ): Promise<TestPlan> {
    console.log(`Generating ${type} test plan for ${scope} in ${language}`);
    
    // Analyze source files if provided
    let codeAnalysis: any[] | undefined = undefined;
    if (sourceFiles && sourceFiles.length > 0) {
      codeAnalysis = await this.analyzeSourceFiles(sourceFiles);
    }
    
    // Generate prompt based on test type
    const promptContext = {
      scope,
      language: language.toLowerCase() === 'python' ? 'python' : 'nodejs' as 'python' | 'nodejs',
      codeAnalysis,
      requirements,
      coverage
    };
    
    let prompt = '';
    switch (type) {
      case 'unit':
        prompt = this.promptGenerator.generateUnitTestPrompt(promptContext);
        break;
      case 'integration':
        prompt = this.promptGenerator.generateIntegrationTestPrompt(promptContext);
        break;
      case 'e2e':
        prompt = this.promptGenerator.generateE2ETestPrompt(promptContext);
        break;
      case 'performance':
        prompt = this.promptGenerator.generatePerformanceTestPrompt(promptContext);
        break;
    }
    
    // Define the schema for the test plan
    const testPlanSchema = {
      type: 'object',
      properties: {
        scope: { type: 'string' },
        type: { type: 'string' },
        language: { type: 'string' },
        requirements: { 
          type: 'array',
          items: { type: 'string' }
        },
        coverage: { type: 'number' },
        cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              steps: { 
                type: 'array',
                items: { type: 'string' }
              },
              assertions: {
                type: 'array',
                items: { type: 'string' }
              },
              priority: { type: 'number' }
            }
          }
        }
      }
    };
    
    // Generate test plan using LLM
    const testPlanData = await this.llmProvider.generateStructuredData<TestPlan>(
      prompt,
      testPlanSchema,
      {
        temperature: 0.2,
        systemMessage: `You are a QA engineer specialized in ${language} testing. Generate a comprehensive test plan for the given scope.`
      }
    );
    
    // Add timestamp
    const testPlan: TestPlan = {
      ...testPlanData,
      timestamp: new Date().toISOString()
    };
    
    // Store the test plan
    const testPlanId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.testPlans.set(testPlanId, testPlan);
    
    return testPlan;
  }

  /**
   * Generate test files and write them to disk
   */
  private async generateTests(
    scope: string,
    type: TestType,
    language: string,
    sourceFiles?: string[],
    requirements?: string[],
    coverage?: number,
    outputDir?: string
  ): Promise<string[]> {
    // Generate test plan first
    const testPlan = await this.generateTestPlan(
      scope,
      type,
      language,
      sourceFiles,
      requirements,
      coverage
    );
    
    // Generate test code based on the test plan
    const testCodePrompt = `
Generate ${language} test code for the following test plan:
${JSON.stringify(testPlan, null, 2)}

The tests should follow best practices for ${language} and use the appropriate testing framework.
`;

    const testCode = await this.llmProvider.generateText(
      testCodePrompt,
      {
        temperature: 0.2,
        systemMessage: `You are a QA engineer specialized in ${language} testing. Generate test code based on the provided test plan.`
      }
    );
    
    // Determine output directory
    const actualOutputDir = outputDir || path.join(process.cwd(), 'tests');
    
    // Get appropriate test executor
    const testExecutor = TestExecutorFactory.getExecutor(language);
    
    // Generate test files
    const testFiles = await testExecutor.generateTestFiles(testCode, actualOutputDir);
    
    return testFiles;
  }

  /**
   * Execute tests in a directory
   */
  private async executeTests(
    testDir: string,
    language: string,
    framework?: string
  ): Promise<object> {
    // Get appropriate test executor
    const testExecutor = TestExecutorFactory.getExecutor(language, framework);
    
    // Execute tests
    const results = await testExecutor.executeTests(testDir);
    
    return results;
  }

  /**
   * Generate automation script
   */
  private async generateAutomationScript(
    scenario: string,
    language: string,
    framework: string,
    steps: AutomationStep[],
    outputFile?: string
  ): Promise<object> {
    // Generate automation script using LLM
    const prompt = `
Generate a ${framework} automation script for the following scenario in ${language}:
Scenario: ${scenario}

Steps:
${steps.map((step, index) => `${index + 1}. ${step.action} ${step.target || ''} ${step.value || ''}`).join('\n')}

The script should follow best practices for ${framework} and ${language}.
`;

    const scriptCode = await this.llmProvider.generateText(
      prompt,
      {
        temperature: 0.2,
        systemMessage: `You are a QA automation engineer specialized in ${framework} and ${language}. Generate automation script based on the provided scenario and steps.`
      }
    );
    
    // Write to file if outputFile is provided
    if (outputFile) {
      const outputPath = path.resolve(outputFile);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, scriptCode);
    }
    
    // Return the generated script
    return {
      scenario,
      framework,
      language,
      steps,
      script: scriptCode,
      outputFile,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Collect metrics
   */
  private async collectMetrics(
    metrics: string[],
    duration: number,
    interval: number,
    outputFile?: string
  ): Promise<object> {
    // Simulate metric collection
    const samples = Math.floor(duration / interval);
    const metricData = metrics.reduce((acc, metric) => {
      const values = Array.from({ length: samples }, () => Math.random() * 100);
      this.metrics.set(metric, values);
      return {
        ...acc,
        [metric]: {
          values,
          summary: {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, v) => sum + v, 0) / values.length
          }
        }
      };
    }, {});
    
    const result = {
      metrics: metricData,
      collection: {
        duration,
        interval,
        samples
      },
      timestamp: new Date().toISOString()
    };
    
    // Write to file if outputFile is provided
    if (outputFile) {
      const outputPath = path.resolve(outputFile);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    }
    
    return result;
  }

  /**
   * Analyze source files
   */
  private async analyzeSourceFiles(filePaths: string[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const filePath of filePaths) {
      try {
        const analyzer = this.codeAnalyzerFactory.getAnalyzerForFile(filePath);
        if (analyzer) {
          const result = await analyzer.analyzeFile(filePath);
          results.push(result);
        }
      } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Run the server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('QA Engineer MCP Server running on stdio');
  }
}

const server = new QAEngineerServer();
server.run().catch(console.error);
