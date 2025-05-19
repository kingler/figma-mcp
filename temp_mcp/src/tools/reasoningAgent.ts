import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const reasoningAgentToolName = "mcp_reasoning-agent";
export const reasoningAgentToolDescription = "Reasoning Agent - Provides advanced reasoning, reflection, and validation capabilities through structured prompts and expert validation.";

export const ReasoningAgentToolSchema = z.object({
  action: z.enum([
    "analyze_query",
    "self_reflect",
    "plan_reasoning",
    "explore_alternatives",
    "execute_reasoning",
    "validate_solution",
    "generate_report"
  ]).describe("Reasoning action to perform"),
  context: z.object({
    query: z.string().describe("The query or problem to analyze"),
    domain: z.string().describe("The domain of expertise required"),
    requirements: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Reasoning context"),
  options: z.object({
    confidenceThreshold: z.number().min(0).max(1).default(0.5),
    expertValidation: z.boolean().default(true),
    generateReport: z.boolean().default(true),
    expertDomains: z.array(z.string()).optional(),
    validationCriteria: z.array(z.string()).optional()
  }).optional()
});

export async function runReasoningAgentTool(args: z.infer<typeof ReasoningAgentToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get reasoning context
    const reasoningContext = await getReasoningContext(context);
    
    const systemPrompt = `You are a Reasoning Agent specializing in deep chain-of-thought reasoning, critical self-reflection, and expert validation.
    Your role is to analyze problems, explore solutions, and validate decisions through structured reasoning processes.
    Based on the provided context and target, perform the requested reasoning action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          reasoningContext,
          options
        })}
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error("Failed to generate reasoning analysis");
    }

    // Process reasoning results
    switch (action) {
      case "analyze_query":
        return await analyzeQuery(context, analysis, options);
      case "self_reflect":
        return await performSelfReflection(context, analysis, options);
      case "plan_reasoning":
        return await planReasoning(context, analysis, options);
      case "explore_alternatives":
        return await exploreAlternatives(context, analysis, options);
      case "execute_reasoning":
        return await executeReasoning(context, analysis, options);
      case "validate_solution":
        return await validateSolution(context, analysis, options);
      case "generate_report":
        return await generateReport(context, analysis, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Reasoning operation failed: ${errorMessage}`
    };
  }
}

async function getReasoningContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const reasoningContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      reasoningContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          reasoningContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return reasoningContext;
  } catch (error) {
    console.warn("Failed to get complete reasoning context:", error);
    return reasoningContext;
  }
}

async function analyzeQuery(context: any, analysis: string, options: any): Promise<any> {
  const queryAnalysis = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateQueryAnalysisReport(queryAnalysis);
    await saveReport("query_analysis", report);
  }
  
  return {
    success: true,
    message: "Query analysis completed successfully",
    analysis: queryAnalysis
  };
}

async function performSelfReflection(context: any, analysis: string, options: any): Promise<any> {
  const reflection = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateSelfReflectionReport(reflection);
    await saveReport("self_reflection", report);
  }
  
  return {
    success: true,
    message: "Self-reflection completed successfully",
    reflection
  };
}

async function planReasoning(context: any, analysis: string, options: any): Promise<any> {
  const plan = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateReasoningPlanReport(plan);
    await saveReport("reasoning_plan", report);
  }
  
  return {
    success: true,
    message: "Reasoning plan generated successfully",
    plan
  };
}

async function exploreAlternatives(context: any, analysis: string, options: any): Promise<any> {
  const alternatives = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateAlternativesReport(alternatives);
    await saveReport("alternatives_analysis", report);
  }
  
  return {
    success: true,
    message: "Alternatives exploration completed successfully",
    alternatives
  };
}

async function executeReasoning(context: any, analysis: string, options: any): Promise<any> {
  const execution = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateReasoningExecutionReport(execution);
    await saveReport("reasoning_execution", report);
  }
  
  return {
    success: true,
    message: "Reasoning execution completed successfully",
    execution
  };
}

async function validateSolution(context: any, analysis: string, options: any): Promise<any> {
  const validation = JSON.parse(analysis);
  
  if (options.generateReport) {
    const report = generateValidationReport(validation);
    await saveReport("solution_validation", report);
  }
  
  return {
    success: true,
    message: "Solution validation completed successfully",
    validation
  };
}

async function generateReport(context: any, analysis: string, options: any): Promise<any> {
  const report = JSON.parse(analysis);
  
  if (options.generateReport) {
    const finalReport = generateComprehensiveReport(report);
    await saveReport("comprehensive_report", finalReport);
  }
  
  return {
    success: true,
    message: "Report generated successfully",
    report
  };
}

async function saveReport(type: string, content: string): Promise<void> {
  const fs = require("fs").promises;
  const reportPath = path.join(process.cwd(), ".reports", `${type}_${Date.now()}.md`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, content);
}

function generateQueryAnalysisReport(analysis: any): string {
  return `# Query Analysis Report

## Overview
${analysis.overview}

## Key Concepts
${analysis.concepts.map((concept: any) => `
### ${concept.name}
- Description: ${concept.description}
- Confidence: ${concept.confidence}
- Related Concepts: ${concept.related.join(", ")}
`).join("\n")}

## Assumptions
${analysis.assumptions.map((assumption: any) => `
- ${assumption.statement}
  - Confidence: ${assumption.confidence}
  - Rationale: ${assumption.rationale}
`).join("\n")}

## Potential Complexities
${analysis.complexities.map((complexity: any) => `
### ${complexity.area}
- Description: ${complexity.description}
- Impact: ${complexity.impact}
- Mitigation: ${complexity.mitigation}
`).join("\n")}

## Next Steps
${analysis.nextSteps.map((step: string) => `1. ${step}`).join("\n")}
`;
}

function generateSelfReflectionReport(reflection: any): string {
  return `# Self-Reflection Report

## Initial Understanding
${reflection.initialUnderstanding}

## Knowledge Assessment
### Available Information
${reflection.knowledge.available.map((item: string) => `- ${item}`).join("\n")}

### Knowledge Gaps
${reflection.knowledge.gaps.map((gap: any) => `
- ${gap.area}
  - Impact: ${gap.impact}
  - Mitigation: ${gap.mitigation}
`).join("\n")}

## Assumptions Analysis
${reflection.assumptions.map((assumption: any) => `
### ${assumption.statement}
- Confidence: ${assumption.confidence}
- Supporting Evidence: ${assumption.evidence}
- Potential Risks: ${assumption.risks}
`).join("\n")}

## Alternative Perspectives
${reflection.alternatives.map((alt: any) => `
### ${alt.perspective}
- Description: ${alt.description}
- Strengths: ${alt.strengths.join(", ")}
- Weaknesses: ${alt.weaknesses.join(", ")}
`).join("\n")}

## Confidence Assessment
${Object.entries(reflection.confidence).map(([area, score]) => `- ${area}: ${score}`).join("\n")}

## Recommendations
${reflection.recommendations.map((rec: string) => `1. ${rec}`).join("\n")}
`;
}

function generateReasoningPlanReport(plan: any): string {
  return `# Reasoning Plan Report

## Objective
${plan.objective}

## Approach
${plan.approach}

## Steps
${plan.steps.map((step: any) => `
### ${step.name}
- Description: ${step.description}
- Expected Outcome: ${step.outcome}
- Success Criteria: ${step.criteria.join(", ")}
- Dependencies: ${step.dependencies.join(", ")}
`).join("\n")}

## Risk Assessment
${plan.risks.map((risk: any) => `
### ${risk.name}
- Probability: ${risk.probability}
- Impact: ${risk.impact}
- Mitigation: ${risk.mitigation}
`).join("\n")}

## Success Metrics
${plan.metrics.map((metric: any) => `
- ${metric.name}: ${metric.description}
  - Target: ${metric.target}
  - Measurement: ${metric.measurement}
`).join("\n")}
`;
}

function generateAlternativesReport(alternatives: any): string {
  return `# Alternatives Analysis Report

## Overview
${alternatives.overview}

## Alternatives Considered
${alternatives.options.map((option: any) => `
### ${option.name}
- Description: ${option.description}
- Pros: ${option.pros.join(", ")}
- Cons: ${option.cons.join(", ")}
- Feasibility: ${option.feasibility}/10
- Implementation Complexity: ${option.complexity}/10
`).join("\n")}

## Comparison Matrix
${alternatives.comparison.map((criterion: any) => `
### ${criterion.name}
${criterion.options.map((opt: any) => `- ${opt.name}: ${opt.score}/10`).join("\n")}
`).join("\n")}

## Recommendations
${alternatives.recommendations.map((rec: any) => `
### ${rec.option}
- Rationale: ${rec.rationale}
- Implementation Notes: ${rec.notes}
- Risk Factors: ${rec.risks.join(", ")}
`).join("\n")}
`;
}

function generateReasoningExecutionReport(execution: any): string {
  return `# Reasoning Execution Report

## Process Overview
${execution.overview}

## Steps Executed
${execution.steps.map((step: any) => `
### ${step.name}
- Status: ${step.status}
- Duration: ${step.duration}
- Outcome: ${step.outcome}
- Observations: ${step.observations.join(", ")}
`).join("\n")}

## Decision Points
${execution.decisions.map((decision: any) => `
### ${decision.point}
- Context: ${decision.context}
- Options Considered: ${decision.options.join(", ")}
- Selected Option: ${decision.selected}
- Rationale: ${decision.rationale}
`).join("\n")}

## Challenges Encountered
${execution.challenges.map((challenge: any) => `
### ${challenge.name}
- Description: ${challenge.description}
- Impact: ${challenge.impact}
- Resolution: ${challenge.resolution}
`).join("\n")}

## Outcomes
${execution.outcomes.map((outcome: any) => `
### ${outcome.area}
- Result: ${outcome.result}
- Success Metrics: ${outcome.metrics.join(", ")}
- Lessons Learned: ${outcome.lessons.join(", ")}
`).join("\n")}
`;
}

function generateValidationReport(validation: any): string {
  return `# Solution Validation Report

## Overview
${validation.overview}

## Validation Criteria
${validation.criteria.map((criterion: any) => `
### ${criterion.name}
- Description: ${criterion.description}
- Status: ${criterion.status}
- Evidence: ${criterion.evidence}
`).join("\n")}

## Expert Review
${validation.expertReview.map((review: any) => `
### ${review.expert}
- Domain: ${review.domain}
- Assessment: ${review.assessment}
- Strengths: ${review.strengths.join(", ")}
- Concerns: ${review.concerns.join(", ")}
- Recommendations: ${review.recommendations.join(", ")}
`).join("\n")}

## Validation Results
${validation.results.map((result: any) => `
### ${result.area}
- Status: ${result.status}
- Score: ${result.score}/10
- Findings: ${result.findings.join(", ")}
- Actions Required: ${result.actions.join(", ")}
`).join("\n")}

## Confidence Assessment
${Object.entries(validation.confidence).map(([area, score]) => `- ${area}: ${score}`).join("\n")}
`;
}

function generateComprehensiveReport(report: any): string {
  return `# Comprehensive Reasoning Report

## Executive Summary
${report.summary}

## Process Overview
${report.process.map((step: any) => `
### ${step.phase}
- Status: ${step.status}
- Key Outcomes: ${step.outcomes.join(", ")}
- Confidence: ${step.confidence}
`).join("\n")}

## Key Findings
${report.findings.map((finding: any) => `
### ${finding.area}
- Observation: ${finding.observation}
- Impact: ${finding.impact}
- Supporting Evidence: ${finding.evidence}
- Confidence: ${finding.confidence}
`).join("\n")}

## Expert Validation
${report.validation.map((validation: any) => `
### ${validation.expert}
- Domain: ${validation.domain}
- Assessment: ${validation.assessment}
- Key Points: ${validation.points.join(", ")}
`).join("\n")}

## Recommendations
${report.recommendations.map((rec: any) => `
### ${rec.priority}. ${rec.title}
- Description: ${rec.description}
- Rationale: ${rec.rationale}
- Implementation: ${rec.implementation}
- Expected Impact: ${rec.impact}
`).join("\n")}

## Next Steps
${report.nextSteps.map((step: string) => `1. ${step}`).join("\n")}

## Confidence Matrix
${Object.entries(report.confidenceMatrix).map(([area, score]) => `- ${area}: ${score}`).join("\n")}
`;
} 