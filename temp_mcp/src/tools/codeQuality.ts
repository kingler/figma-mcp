import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const codeQualityToolName = "mcp_code-quality";
export const codeQualityToolDescription = "Code Quality Agent - Evaluates, improves, rates, and generates code through iterative validation.";

export const CodeQualityToolSchema = z.object({
  action: z.enum([
    "evaluate_code",
    "improve_code",
    "rate_code",
    "generate_code",
    "run_quality_chain",
    "validate_changes",
    "check_status"
  ]).describe("Code quality action to perform"),
  targetPath: z.string().describe("Path to target file or directory"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "development",
      "testing",
      "review",
      "maintenance"
    ]),
    previousMetrics: z.object({
      quality: z.number().optional(),
      principles: z.object({
        kiss: z.number().optional(),
        yagni: z.number().optional(),
        solid: z.number().optional()
      }).optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Code quality context"),
  options: z.object({
    language: z.string().optional(),
    maxIterations: z.number().optional().default(3),
    qualityThreshold: z.number().optional().default(0.85),
    principles: z.array(z.enum([
      "SOLID",
      "KISS",
      "YAGNI",
      "DRY"
    ])).optional(),
    generateReport: z.boolean().optional().default(true),
    isExistingProject: z.boolean().optional().default(false)
  }).optional()
});

export async function runCodeQualityTool(args: z.infer<typeof CodeQualityToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for code quality analysis
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get code context
    const codeContext = await getCodeContext(targetPath, context);
    
    const systemPrompt = `You are a Code Quality Agent specializing in code evaluation, improvement, rating, and generation.
    Your role is to ensure code quality through iterative validation based on SOLID, KISS, YAGNI, and DRY principles.
    Based on the provided context and target, perform the requested code quality action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          codeContext,
          options
        })}
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error("Failed to generate code quality analysis");
    }

    // Process code quality results
    switch (action) {
      case "evaluate_code":
        return await evaluateCode(targetPath, analysis, options);
      case "improve_code":
        return await improveCode(targetPath, analysis, options);
      case "rate_code":
        return await rateCode(targetPath, analysis, options);
      case "generate_code":
        return await generateCode(targetPath, analysis, options);
      case "run_quality_chain":
        return await runQualityChain(targetPath, analysis, options);
      case "validate_changes":
        return await validateChanges(targetPath, analysis, options);
      case "check_status":
        return await checkStatus(targetPath, analysis, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Code quality operation failed: ${errorMessage}`
    };
  }
}

async function getCodeContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const codeContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      codeContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      codeContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      codeContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          codeContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return codeContext;
  } catch (error) {
    console.warn("Failed to get complete code context:", error);
    return codeContext;
  }
}

async function evaluateCode(targetPath: string, analysis: string, options: any): Promise<any> {
  const evaluation = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateEvaluationReport(evaluation));
  }
  
  return {
    success: true,
    message: "Code evaluation completed successfully",
    evaluation
  };
}

async function improveCode(targetPath: string, analysis: string, options: any): Promise<any> {
  const improvements = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateImprovementReport(improvements));
  }
  
  return {
    success: true,
    message: "Code improvements generated successfully",
    improvements
  };
}

async function rateCode(targetPath: string, analysis: string, options: any): Promise<any> {
  const rating = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateRatingReport(rating));
  }
  
  return {
    success: true,
    message: "Code rating completed successfully",
    rating
  };
}

async function generateCode(targetPath: string, analysis: string, options: any): Promise<any> {
  const generation = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateCodeReport(generation));
  }
  
  return {
    success: true,
    message: "Code generation completed successfully",
    generation
  };
}

async function runQualityChain(targetPath: string, analysis: string, options: any): Promise<any> {
  const chain = JSON.parse(analysis);
  let currentIteration = 0;
  let qualityScore = 0;
  
  while (currentIteration < options.maxIterations && qualityScore < options.qualityThreshold) {
    // 1. Evaluate code
    const evaluation = await evaluateCode(targetPath, chain.evaluation, options);
    
    // 2. Improve code based on evaluation
    const improvements = await improveCode(targetPath, chain.improvements, options);
    
    // 3. Rate improved code
    const rating = await rateCode(targetPath, chain.rating, options);
    qualityScore = rating.rating.scores.quality.overall;
    
    // 4. Generate final code if quality threshold is met
    if (qualityScore >= options.qualityThreshold) {
      const generation = await generateCode(targetPath, chain.generation, options);
      return {
        success: true,
        message: "Quality chain completed successfully",
        iterations: currentIteration + 1,
        finalScore: qualityScore,
        chain: {
          evaluation,
          improvements,
          rating,
          generation
        }
      };
    }
    
    currentIteration++;
  }
  
  return {
    success: false,
    message: "Quality chain failed to meet threshold",
    iterations: currentIteration,
    finalScore: qualityScore
  };
}

async function validateChanges(targetPath: string, analysis: string, options: any): Promise<any> {
  const validation = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateValidationReport(validation));
  }
  
  return {
    success: true,
    message: "Code changes validated successfully",
    validation
  };
}

async function checkStatus(targetPath: string, analysis: string, options: any): Promise<any> {
  const status = JSON.parse(analysis);
  
  if (options.generateReport) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateStatusReport(status));
  }
  
  return {
    success: true,
    message: "Code quality status checked successfully",
    status
  };
}

function generateEvaluationReport(evaluation: any): string {
  return `# Code Evaluation Report

## Overview
${evaluation.summary}

## Quality Scores
${Object.entries(evaluation.scores).map(([metric, score]) => `- ${metric}: ${score}`).join('\n')}

## Principle Compliance
${evaluation.principles.map((principle: any) => `
### ${principle.name}
- Score: ${principle.score}/10
- Violations: ${principle.violations.map((v: string) => `\n  - ${v}`).join('')}
- Suggestions: ${principle.suggestions.map((s: string) => `\n  - ${s}`).join('')}
`).join('\n')}

## Details
### Strengths
${evaluation.details.strengths.map((strength: string) => `- ${strength}`).join('\n')}

### Violations
${evaluation.details.violations.map((violation: string) => `- ${violation}`).join('\n')}

### Suggestions
${evaluation.details.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}
`;
}

function generateImprovementReport(improvements: any): string {
  return `# Code Improvement Report

## Overview
${improvements.overview}

## Changes Made
${improvements.changes.map((change: any) => `
### ${change.type}
${change.description}
- Before: ${change.before}
- After: ${change.after}
- Rationale: ${change.rationale}
`).join('\n')}

## Metrics
### Before
${Object.entries(improvements.metrics.before).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

### After
${Object.entries(improvements.metrics.after).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

### Delta
${Object.entries(improvements.metrics.delta).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}
`;
}

function generateRatingReport(rating: any): string {
  return `# Code Rating Report

## Overview
${rating.analysis}

## Scores
### Quality Metrics
${Object.entries(rating.scores.quality).map(([metric, score]) => `- ${metric}: ${score}`).join('\n')}

### Principle Compliance
${Object.entries(rating.scores.principles).map(([principle, score]) => `- ${principle}: ${score}`).join('\n')}

## Analysis
${rating.details.map((detail: any) => `
### ${detail.category}
${detail.description}
- Impact: ${detail.impact}
- Recommendations: ${detail.recommendations.map((rec: string) => `\n  - ${rec}`).join('')}
`).join('\n')}

## Recommendations
${rating.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Next Steps
${rating.nextSteps.map((step: string) => `1. ${step}`).join('\n')}
`;
}

function generateCodeReport(generation: any): string {
  return `# Code Generation Report

## Overview
${generation.overview}

## Generated Code
\`\`\`${generation.language}
${generation.code}
\`\`\`

## Documentation
${generation.documentation.map((doc: string) => `- ${doc}`).join('\n')}

## Quality Report
${generation.qualityReport}

## Audit Report
${generation.isExistingProject ? generation.auditReport : 'N/A'}

## Improvements
### Features
${generation.improvements.features.map((feature: string) => `- ${feature}`).join('\n')}

### Bugs
${generation.improvements.bugs.map((bug: string) => `- ${bug}`).join('\n')}

### User Stories
${generation.improvements.userStories.map((story: string) => `- ${story}`).join('\n')}
`;
}

function generateValidationReport(validation: any): string {
  return `# Code Validation Report

## Overview
${validation.overview}

## Changes Validated
${validation.changes.map((change: any) => `
### ${change.type}
- Status: ${change.status}
- Impact: ${change.impact}
- Risk: ${change.risk}
- Tests: ${change.tests.map((test: string) => `\n  - ${test}`).join('')}
`).join('\n')}

## Quality Gates
${validation.qualityGates.map((gate: any) => `
### ${gate.name}
- Status: ${gate.status}
- Threshold: ${gate.threshold}
- Current: ${gate.current}
- Pass: ${gate.pass ? 'Yes' : 'No'}
`).join('\n')}

## Issues Found
${validation.issues.map((issue: any) => `
### ${issue.severity}. ${issue.title}
${issue.description}
- Impact: ${issue.impact}
- Resolution: ${issue.resolution}
`).join('\n')}
`;
}

function generateStatusReport(status: any): string {
  return `# Code Quality Status Report

## Overview
${status.overview}

## Current Metrics
${Object.entries(status.metrics).map(([metric, value]) => `- ${metric}: ${value}`).join('\n')}

## Quality Gates
${status.qualityGates.map((gate: any) => `
### ${gate.name}
- Status: ${gate.status}
- Threshold: ${gate.threshold}
- Current: ${gate.current}
`).join('\n')}

## Recent Changes
${status.recentChanges.map((change: any) => `
### ${change.date}
${change.description}
- Type: ${change.type}
- Impact: ${change.impact}
`).join('\n')}

## Trends
${status.trends.map((trend: any) => `
### ${trend.metric}
- Direction: ${trend.direction}
- Change: ${trend.change}
- Period: ${trend.period}
`).join('\n')}

## Action Items
${status.actionItems.map((item: any) => `
### ${item.priority}. ${item.title}
${item.description}
- Impact: ${item.impact}
- Effort: ${item.effort}
- Timeline: ${item.timeline}
`).join('\n')}
`;
} 