import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const productOwnerToolName = "mcp_product-owner";
export const productOwnerToolDescription = "Product Owner Agent - Manages product requirements, business analysis, and stakeholder communication.";

export const ProductOwnerToolSchema = z.object({
  action: z.enum([
    "init_requirements",
    "feature_map",
    "init_roadmap",
    "analyze_requirements",
    "prioritize_features",
    "generate_spec_doc",
    "validate_requirements",
    "manage_backlog"
  ]).describe("Product management action to perform"),
  targetPath: z.string().describe("Path to target file or directory"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "planning",
      "requirements",
      "development",
      "review"
    ]),
    artifacts: z.array(z.string()).optional()
  }).describe("Product context"),
  options: z.object({
    format: z.enum([
      "BRD",     // Business Requirements Document
      "PRD",     // Product Requirements Document
      "FRD",     // Feature Requirements Document
      "EPIC",    // Epic Description
      "STORY"    // User Story
    ]).optional(),
    priority: z.enum([
      "high",
      "medium",
      "low"
    ]).optional(),
    generateDocs: z.boolean().optional().default(true),
    includeMetrics: z.boolean().optional().default(true)
  }).optional()
});

export async function runProductOwnerTool(args: z.infer<typeof ProductOwnerToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for product management decisions
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get product context
    const productContext = await getProductContext(targetPath, context);
    
    const systemPrompt = `You are a Product Owner and Business Analyst.
    Your role is to gather and manage product requirements, conduct business analysis, and communicate with stakeholders.
    Based on the provided context and target, perform the requested product management action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          productContext,
          options
        })}
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error("Failed to generate product analysis");
    }

    // Process product management results
    switch (action) {
      case "init_requirements":
        return await initializeRequirements(targetPath, analysis, options);
      case "feature_map":
        return await generateFeatureMap(targetPath, analysis, options);
      case "init_roadmap":
        return await initializeRoadmap(targetPath, analysis, options);
      case "analyze_requirements":
        return await analyzeRequirements(targetPath, analysis, options);
      case "prioritize_features":
        return await prioritizeFeatures(targetPath, analysis, options);
      case "generate_spec_doc":
        return await generateSpecDoc(targetPath, analysis, options);
      case "validate_requirements":
        return await validateRequirements(targetPath, analysis, options);
      case "manage_backlog":
        return await manageBacklog(targetPath, analysis, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Product Owner operation failed: ${errorMessage}`
    };
  }
}

async function getProductContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const productContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      productContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      productContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      productContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          productContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return productContext;
  } catch (error) {
    console.warn("Failed to get complete product context:", error);
    return productContext;
  }
}

async function initializeRequirements(targetPath: string, analysis: string, options: any): Promise<any> {
  const requirements = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateRequirementsDoc(requirements, options.format));
  }
  
  return {
    success: true,
    message: "Requirements initialized successfully",
    requirements
  };
}

async function generateFeatureMap(targetPath: string, analysis: string, options: any): Promise<any> {
  const featureMap = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateFeatureMapDoc(featureMap));
  }
  
  return {
    success: true,
    message: "Feature map generated successfully",
    featureMap
  };
}

async function initializeRoadmap(targetPath: string, analysis: string, options: any): Promise<any> {
  const roadmap = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateRoadmapDoc(roadmap));
  }
  
  return {
    success: true,
    message: "Roadmap initialized successfully",
    roadmap
  };
}

async function analyzeRequirements(targetPath: string, analysis: string, options: any): Promise<any> {
  const requirementsAnalysis = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateAnalysisReport(requirementsAnalysis));
  }
  
  return {
    success: true,
    message: "Requirements analysis completed successfully",
    analysis: requirementsAnalysis
  };
}

async function prioritizeFeatures(targetPath: string, analysis: string, options: any): Promise<any> {
  const prioritization = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generatePrioritizationDoc(prioritization));
  }
  
  return {
    success: true,
    message: "Features prioritized successfully",
    prioritization
  };
}

async function generateSpecDoc(targetPath: string, analysis: string, options: any): Promise<any> {
  const specDoc = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateSpecification(specDoc, options.format));
  }
  
  return {
    success: true,
    message: "Specification document generated successfully",
    specDoc
  };
}

async function validateRequirements(targetPath: string, analysis: string, options: any): Promise<any> {
  const validation = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateValidationReport(validation));
  }
  
  return {
    success: true,
    message: "Requirements validation completed successfully",
    validation
  };
}

async function manageBacklog(targetPath: string, analysis: string, options: any): Promise<any> {
  const backlogUpdate = JSON.parse(analysis);
  
  if (options.generateDocs) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateBacklogReport(backlogUpdate));
  }
  
  return {
    success: true,
    message: "Backlog updated successfully",
    backlog: backlogUpdate
  };
}

function generateRequirementsDoc(requirements: any, format: string = "PRD"): string {
  return `# ${format} - Product Requirements Document

## Overview
${requirements.overview}

## Business Goals
${requirements.goals.map((goal: string) => `- ${goal}`).join('\n')}

## User Stories
${requirements.stories.map((story: any) => `
### ${story.title}
As a ${story.role}, I want ${story.want} so that ${story.benefit}

#### Acceptance Criteria
${story.criteria.map((criterion: string) => `- ${criterion}`).join('\n')}
`).join('\n')}

## Technical Requirements
${requirements.technical.map((req: string) => `- ${req}`).join('\n')}

## Non-Functional Requirements
${requirements.nonFunctional.map((req: string) => `- ${req}`).join('\n')}
`;
}

function generateFeatureMapDoc(featureMap: any): string {
  return `# Feature Map

## Core Features
${featureMap.core.map((feature: any) => `
### ${feature.name}
${feature.description}
- Priority: ${feature.priority}
- Dependencies: ${feature.dependencies.join(', ')}
- Status: ${feature.status}
`).join('\n')}

## Future Features
${featureMap.future.map((feature: any) => `
### ${feature.name}
${feature.description}
- Priority: ${feature.priority}
- Dependencies: ${feature.dependencies.join(', ')}
`).join('\n')}
`;
}

function generateRoadmapDoc(roadmap: any): string {
  return `# Product Roadmap

## Vision
${roadmap.vision}

## Milestones
${roadmap.milestones.map((milestone: any) => `
### ${milestone.name} (${milestone.date})
${milestone.description}
#### Deliverables
${milestone.deliverables.map((item: string) => `- ${item}`).join('\n')}
`).join('\n')}

## Timeline
${roadmap.timeline.map((item: any) => `- ${item.phase}: ${item.duration}`).join('\n')}
`;
}

function generateAnalysisReport(analysis: any): string {
  return `# Requirements Analysis Report

## Overview
${analysis.overview}

## Key Findings
${analysis.findings.map((finding: string) => `- ${finding}`).join('\n')}

## Gaps Identified
${analysis.gaps.map((gap: string) => `- ${gap}`).join('\n')}

## Recommendations
${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
}

function generatePrioritizationDoc(prioritization: any): string {
  return `# Feature Prioritization

## High Priority
${prioritization.high.map((feature: any) => `
### ${feature.name}
- Business Value: ${feature.businessValue}
- Effort: ${feature.effort}
- Risk: ${feature.risk}
- Dependencies: ${feature.dependencies.join(', ')}
`).join('\n')}

## Medium Priority
${prioritization.medium.map((feature: any) => `
### ${feature.name}
- Business Value: ${feature.businessValue}
- Effort: ${feature.effort}
- Risk: ${feature.risk}
- Dependencies: ${feature.dependencies.join(', ')}
`).join('\n')}

## Low Priority
${prioritization.low.map((feature: any) => `
### ${feature.name}
- Business Value: ${feature.businessValue}
- Effort: ${feature.effort}
- Risk: ${feature.risk}
- Dependencies: ${feature.dependencies.join(', ')}
`).join('\n')}
`;
}

function generateSpecification(spec: any, format: string): string {
  return `# ${format} Specification

## Overview
${spec.overview}

## Scope
${spec.scope}

## Requirements
${spec.requirements.map((req: any) => `
### ${req.id}. ${req.title}
${req.description}
- Type: ${req.type}
- Priority: ${req.priority}
- Status: ${req.status}
`).join('\n')}

## Constraints
${spec.constraints.map((constraint: string) => `- ${constraint}`).join('\n')}

## Dependencies
${spec.dependencies.map((dep: string) => `- ${dep}`).join('\n')}
`;
}

function generateValidationReport(validation: any): string {
  return `# Requirements Validation Report

## Overview
${validation.overview}

## Validation Results
${validation.results.map((result: any) => `
### ${result.requirement}
- Status: ${result.status}
- Issues: ${result.issues.join(', ')}
- Recommendations: ${result.recommendations.join(', ')}
`).join('\n')}

## Summary
${validation.summary}

## Next Steps
${validation.nextSteps.map((step: string) => `1. ${step}`).join('\n')}
`;
}

function generateBacklogReport(backlog: any): string {
  return `# Product Backlog Update

## Sprint Overview
${backlog.sprintOverview}

## Current Sprint
${backlog.currentSprint.map((item: any) => `
### ${item.id}. ${item.title}
${item.description}
- Story Points: ${item.points}
- Status: ${item.status}
- Assignee: ${item.assignee}
`).join('\n')}

## Backlog Items
${backlog.items.map((item: any) => `
### ${item.id}. ${item.title}
${item.description}
- Priority: ${item.priority}
- Story Points: ${item.points}
- Dependencies: ${item.dependencies.join(', ')}
`).join('\n')}

## Sprint Metrics
${Object.entries(backlog.metrics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
`;
} 