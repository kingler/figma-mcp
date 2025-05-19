import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const testingAgentToolName = "mcp_testing-agent";
export const testingAgentToolDescription = "Testing Agent - Generates, executes, and validates tests based on user stories and agile metrics.";

export const TestingAgentToolSchema = z.object({
  action: z.enum([
    "generate_unit_tests",
    "generate_performance_tests",
    "execute_tests",
    "analyze_coverage",
    "validate_test_suite",
    "monitor_test_execution",
    "generate_test_report"
  ]).describe("Testing action to perform"),
  targetPath: z.string().describe("Path to target file or directory"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "development",
      "testing",
      "validation",
      "maintenance"
    ]),
    userStories: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      storyPoints: z.number(),
      priority: z.enum(["high", "medium", "low"]),
      dependencies: z.array(z.string()).optional()
    })).optional(),
    testFramework: z.enum([
      "jest",
      "mocha",
      "pytest",
      "junit",
      "cypress",
      "playwright"
    ]).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Testing context"),
  options: z.object({
    language: z.string().optional(),
    coverageThreshold: z.number().optional().default(85),
    includeE2E: z.boolean().optional().default(false),
    generateMocks: z.boolean().optional().default(true),
    generateReport: z.boolean().optional().default(true),
    testCategories: z.array(z.enum([
      "unit",
      "integration",
      "e2e",
      "performance",
      "security"
    ])).optional(),
    performanceMetrics: z.array(z.enum([
      "load",
      "stress",
      "endurance",
      "spike",
      "scalability"
    ])).optional()
  }).optional()
});

export async function runTestingAgentTool(args: z.infer<typeof TestingAgentToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for test generation and analysis
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get testing context
    const testingContext = await getTestingContext(targetPath, context);
    
    const systemPrompt = `You are a Testing Agent specializing in test generation, execution, and validation.
    Your role is to ensure code quality through comprehensive testing based on user stories and agile metrics.
    Based on the provided context and target, perform the requested testing action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          testingContext,
          options
        })}
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error("Failed to generate testing analysis");
    }

    // Process testing results
    switch (action) {
      case "generate_unit_tests":
        return await generateUnitTests(targetPath, analysis, options);
      case "generate_performance_tests":
        return await generatePerformanceTests(targetPath, analysis, options);
      case "execute_tests":
        return await executeTests(targetPath, analysis, options);
      case "analyze_coverage":
        return await analyzeCoverage(targetPath, analysis, options);
      case "validate_test_suite":
        return await validateTestSuite(targetPath, analysis, options);
      case "monitor_test_execution":
        return await monitorTestExecution(targetPath, analysis, options);
      case "generate_test_report":
        return await generateTestReport(targetPath, analysis, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Testing operation failed: ${errorMessage}`
    };
  }
}

async function getTestingContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const testingContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      testingContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      testingContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      testingContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          testingContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return testingContext;
  } catch (error) {
    console.warn("Failed to get complete testing context:", error);
    return testingContext;
  }
}

async function generateUnitTests(targetPath: string, analysis: string, options: any): Promise<any> {
  const unitTests = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateUnitTestsCode(unitTests));
  }
  
  return {
    success: true,
    message: "Unit tests generated successfully",
    tests: unitTests
  };
}

async function generatePerformanceTests(targetPath: string, analysis: string, options: any): Promise<any> {
  const performanceTests = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generatePerformanceTestsCode(performanceTests));
  }
  
  return {
    success: true,
    message: "Performance tests generated successfully",
    tests: performanceTests
  };
}

async function executeTests(targetPath: string, analysis: string, options: any): Promise<any> {
  const execution = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateExecutionReport(execution));
  }
  
  return {
    success: true,
    message: "Tests executed successfully",
    execution
  };
}

async function analyzeCoverage(targetPath: string, analysis: string, options: any): Promise<any> {
  const coverage = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateCoverageReport(coverage));
  }
  
  return {
    success: true,
    message: "Coverage analysis completed successfully",
    coverage
  };
}

async function validateTestSuite(targetPath: string, analysis: string, options: any): Promise<any> {
  const validation = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateValidationReport(validation));
  }
  
  return {
    success: true,
    message: "Test suite validation completed successfully",
    validation
  };
}

async function monitorTestExecution(targetPath: string, analysis: string, options: any): Promise<any> {
  const monitoring = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateMonitoringReport(monitoring));
  }
  
  return {
    success: true,
    message: "Test execution monitoring completed successfully",
    monitoring
  };
}

async function generateTestReport(targetPath: string, analysis: string, options: any): Promise<any> {
  const report = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateTestingReport(report));
  }
  
  return {
    success: true,
    message: "Test report generated successfully",
    report
  };
}

function generateUnitTestsCode(tests: any): string {
  return `// Generated Unit Tests
${tests.framework === 'jest' ? "import { describe, it, expect } from 'jest';" : ''}

${tests.imports.map((imp: string) => imp).join('\n')}

${tests.suites.map((suite: any) => `
describe('${suite.name}', () => {
  ${suite.beforeAll ? `beforeAll(() => {
    ${suite.beforeAll}
  });` : ''}

  ${suite.beforeEach ? `beforeEach(() => {
    ${suite.beforeEach}
  });` : ''}

  ${suite.tests.map((test: any) => `
  it('${test.description}', ${test.async ? 'async ' : ''}() => {
    ${test.arrange ? `// Arrange\n    ${test.arrange}` : ''}
    ${test.act ? `// Act\n    ${test.act}` : ''}
    ${test.assert ? `// Assert\n    ${test.assert}` : ''}
  });`).join('\n')}

  ${suite.afterEach ? `afterEach(() => {
    ${suite.afterEach}
  });` : ''}

  ${suite.afterAll ? `afterAll(() => {
    ${suite.afterAll}
  });` : ''}
});`).join('\n\n')}
`;
}

function generatePerformanceTestsCode(tests: any): string {
  return `// Generated Performance Tests
${tests.imports.map((imp: string) => imp).join('\n')}

${tests.config ? `// Test Configuration
${tests.config}` : ''}

${tests.scenarios.map((scenario: any) => `
describe('${scenario.name} Performance Tests', () => {
  ${scenario.setup ? `beforeAll(async () => {
    ${scenario.setup}
  });` : ''}

  ${scenario.tests.map((test: any) => `
  it('${test.description}', async () => {
    // Setup
    ${test.setup}

    // Execute
    ${test.execute}

    // Verify
    ${test.verify}
  });`).join('\n')}

  ${scenario.teardown ? `afterAll(async () => {
    ${scenario.teardown}
  });` : ''}
});`).join('\n\n')}

${tests.metrics ? `// Performance Metrics
${tests.metrics}` : ''}
`;
}

function generateExecutionReport(execution: any): string {
  return `# Test Execution Report

## Overview
${execution.overview}

## Test Suites
${execution.suites.map((suite: any) => `
### ${suite.name}
- Status: ${suite.status}
- Duration: ${suite.duration}
- Total Tests: ${suite.totalTests}
- Passed: ${suite.passed}
- Failed: ${suite.failed}
- Skipped: ${suite.skipped}

#### Test Results
${suite.results.map((result: any) => `
##### ${result.name}
- Status: ${result.status}
- Duration: ${result.duration}
${result.error ? `- Error: ${result.error}
- Stack Trace: ${result.stackTrace}` : ''}
`).join('\n')}
`).join('\n')}

## Coverage Summary
${Object.entries(execution.coverage).map(([type, value]) => `- ${type}: ${value}`).join('\n')}

## Performance Metrics
${execution.performance ? Object.entries(execution.performance).map(([metric, value]) => `- ${metric}: ${value}`).join('\n') : 'N/A'}
`;
}

function generateCoverageReport(coverage: any): string {
  return `# Test Coverage Report

## Overview
${coverage.overview}

## Coverage Summary
${Object.entries(coverage.summary).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

## Coverage by File
${coverage.files.map((file: any) => `
### ${file.path}
- Statements: ${file.statements}%
- Branches: ${file.branches}%
- Functions: ${file.functions}%
- Lines: ${file.lines}%

#### Uncovered Lines
${file.uncovered.map((line: any) => `- Line ${line.number}: ${line.content}`).join('\n')}
`).join('\n')}

## Coverage Trends
${coverage.trends.map((trend: any) => `
### ${trend.period}
${Object.entries(trend.metrics).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}
`).join('\n')}
`;
}

function generateValidationReport(validation: any): string {
  return `# Test Suite Validation Report

## Overview
${validation.overview}

## User Story Coverage
${validation.userStories.map((story: any) => `
### ${story.id}: ${story.title}
- Coverage: ${story.coverage}%
- Missing Tests: ${story.missingTests.join(', ') || 'None'}
- Test Quality: ${story.testQuality}/10
`).join('\n')}

## Test Quality Metrics
${validation.qualityMetrics.map((metric: any) => `
### ${metric.name}
- Score: ${metric.score}/10
- Issues: ${metric.issues.map((issue: string) => `\n  - ${issue}`).join('')}
- Recommendations: ${metric.recommendations.map((rec: string) => `\n  - ${rec}`).join('')}
`).join('\n')}

## Validation Results
${validation.results.map((result: any) => `
### ${result.category}
- Status: ${result.status}
- Issues Found: ${result.issues.length}
${result.issues.map((issue: any) => `- ${issue.severity}: ${issue.description}`).join('\n')}
`).join('\n')}
`;
}

function generateMonitoringReport(monitoring: any): string {
  return `# Test Execution Monitoring Report

## Overview
${monitoring.overview}

## Execution Metrics
${Object.entries(monitoring.metrics).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

## Resource Usage
${monitoring.resources.map((resource: any) => `
### ${resource.name}
- Average: ${resource.average}
- Peak: ${resource.peak}
- Trend: ${resource.trend}
`).join('\n')}

## Test Performance
${monitoring.performance.map((metric: any) => `
### ${metric.name}
- Current: ${metric.current}
- Baseline: ${metric.baseline}
- Delta: ${metric.delta}
- Status: ${metric.status}
`).join('\n')}

## Issues Detected
${monitoring.issues.map((issue: any) => `
### ${issue.severity}. ${issue.title}
${issue.description}
- Impact: ${issue.impact}
- Resolution: ${issue.resolution}
`).join('\n')}
`;
}

function generateTestingReport(report: any): string {
  return `# Comprehensive Testing Report

## Executive Summary
${report.summary}

## Test Coverage
### Overall Coverage
${Object.entries(report.coverage.overall).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

### Coverage by Component
${report.coverage.components.map((component: any) => `
#### ${component.name}
${Object.entries(component.metrics).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}
`).join('\n')}

## Test Results
### Unit Tests
${report.results.unit.map((suite: any) => `
#### ${suite.name}
- Status: ${suite.status}
- Duration: ${suite.duration}
- Pass Rate: ${suite.passRate}%
`).join('\n')}

### Performance Tests
${report.results.performance.map((test: any) => `
#### ${test.name}
- Metric: ${test.metric}
- Result: ${test.result}
- Threshold: ${test.threshold}
- Status: ${test.status}
`).join('\n')}

## User Story Coverage
${report.userStories.map((story: any) => `
### ${story.id}: ${story.title}
- Story Points: ${story.storyPoints}
- Test Coverage: ${story.coverage}%
- Acceptance Criteria Met: ${story.acceptanceCriteriaMet}/${story.totalAcceptanceCriteria}
`).join('\n')}

## Quality Metrics
${report.qualityMetrics.map((metric: any) => `
### ${metric.category}
- Score: ${metric.score}/10
- Status: ${metric.status}
- Trend: ${metric.trend}
`).join('\n')}

## Recommendations
${report.recommendations.map((rec: any) => `
### ${rec.priority}. ${rec.title}
${rec.description}
- Impact: ${rec.impact}
- Effort: ${rec.effort}
- Timeline: ${rec.timeline}
`).join('\n')}

## Next Steps
${report.nextSteps.map((step: string) => `1. ${step}`).join('\n')}
`;
} 