import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const morpheusValidatorToolName = "mcp_morpheus-validator";
export const morpheusValidatorToolDescription = "High-Level Validator & Decision Maker - Validates requirements, architecture, and design decisions.";

export const MorpheusValidatorToolSchema = z.object({
  action: z.enum([
    "validate_requirements",
    "validate_architecture",
    "validate_design",
    "validate_implementation",
    "validate_test_coverage",
    "analyze_solution"
  ]).describe("Validation action to perform"),
  targetPath: z.string().describe("Path to the target file or directory to validate"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "requirements",
      "architecture",
      "design",
      "implementation",
      "testing"
    ]),
    artifacts: z.array(z.string()).optional()
  }).describe("Validation context"),
  options: z.object({
    principles: z.array(z.enum([
      "SOLID",
      "YAGNI",
      "KISS",
      "DRY"
    ])).optional(),
    strictness: z.enum(["relaxed", "normal", "strict"]).optional().default("normal"),
    generateReport: z.boolean().optional().default(true)
  }).optional()
});

export async function runMorpheusValidatorTool(args: z.infer<typeof MorpheusValidatorToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for validation decisions
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get validation context
    const validationContext = await getValidationContext(targetPath, context);
    
    const systemPrompt = `You are Morpheus, the High-Level Validator & Decision Maker.
    Your role is to validate and ensure quality across all aspects of the SDLC.
    You enforce SOLID, YAGNI, KISS principles and prevent premature optimization.
    Based on the provided context and target, perform the requested validation.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          validationContext,
          options
        })}
      ],
    });

    const validation = response.choices[0]?.message?.content;
    if (!validation) {
      throw new Error("Failed to generate validation response");
    }

    // Process validation results
    switch (action) {
      case "validate_requirements":
        return await validateRequirements(targetPath, validation, options);
      case "validate_architecture":
        return await validateArchitecture(targetPath, validation, options);
      case "validate_design":
        return await validateDesign(targetPath, validation, options);
      case "validate_implementation":
        return await validateImplementation(targetPath, validation, options);
      case "validate_test_coverage":
        return await validateTestCoverage(targetPath, validation, options);
      case "analyze_solution":
        return await analyzeSolution(targetPath, validation, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Morpheus validation failed: ${errorMessage}`
    };
  }
}

async function getValidationContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const validationContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      validationContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      validationContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      validationContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          validationContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return validationContext;
  } catch (error) {
    console.warn("Failed to get complete validation context:", error);
    return validationContext;
  }
}

async function validateRequirements(targetPath: string, validation: string, options: any): Promise<any> {
  const validationResult = JSON.parse(validation);
  
  // Generate validation report if requested
  if (options.generateReport) {
    const fs = require("fs").promises;
    const reportPath = path.join(path.dirname(targetPath), "validation-report.md");
    await fs.writeFile(reportPath, generateValidationReport(validationResult));
  }
  
  return {
    success: validationResult.valid,
    message: validationResult.message,
    issues: validationResult.issues,
    recommendations: validationResult.recommendations
  };
}

async function validateArchitecture(targetPath: string, validation: string, options: any): Promise<any> {
  const validationResult = JSON.parse(validation);
  
  return {
    success: validationResult.valid,
    message: validationResult.message,
    violations: validationResult.violations,
    suggestions: validationResult.suggestions
  };
}

async function validateDesign(targetPath: string, validation: string, options: any): Promise<any> {
  const validationResult = JSON.parse(validation);
  
  return {
    success: validationResult.valid,
    message: validationResult.message,
    issues: validationResult.issues,
    improvements: validationResult.improvements
  };
}

async function validateImplementation(targetPath: string, validation: string, options: any): Promise<any> {
  const validationResult = JSON.parse(validation);
  
  return {
    success: validationResult.valid,
    message: validationResult.message,
    violations: validationResult.violations,
    refactoringSuggestions: validationResult.refactoringSuggestions
  };
}

async function validateTestCoverage(targetPath: string, validation: string, options: any): Promise<any> {
  const validationResult = JSON.parse(validation);
  
  return {
    success: validationResult.valid,
    message: validationResult.message,
    coverage: validationResult.coverage,
    missingTests: validationResult.missingTests
  };
}

async function analyzeSolution(targetPath: string, validation: string, options: any): Promise<any> {
  const analysisResult = JSON.parse(validation);
  
  return {
    success: true,
    message: "Solution analysis completed",
    analysis: analysisResult.analysis,
    recommendations: analysisResult.recommendations
  };
}

function generateValidationReport(validationResult: any): string {
  return `# Validation Report

## Overview
${validationResult.message}

## Issues Found
${validationResult.issues.map((issue: any) => `- ${issue}`).join('\n')}

## Recommendations
${validationResult.recommendations.map((rec: any) => `- ${rec}`).join('\n')}

## Next Steps
${validationResult.nextSteps?.map((step: any) => `1. ${step}`).join('\n') || 'No specific next steps provided.'}
`;
} 