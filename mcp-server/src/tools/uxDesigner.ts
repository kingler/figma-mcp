import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys.js";
import * as path from "path";

export const uxDesignerToolName = "mcp_ux-designer";
export const uxDesignerToolDescription = "UX Designer Agent - Creates user journeys, interaction designs, and wireframes.";

export const UXDesignerToolSchema = z.object({
  action: z.enum([
    "map_user_journey",
    "design_interactions",
    "create_wireframes",
    "define_information_arch",
    "prototype_flow",
    "validate_usability",
    "generate_specs"
  ]).describe("UX design action to perform"),
  targetPath: z.string().describe("Path to target file or directory"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "research",
      "ideation",
      "design",
      "validation"
    ]),
    artifacts: z.array(z.string()).optional()
  }).describe("Design context"),
  options: z.object({
    format: z.enum([
      "sketch",
      "wireframe",
      "prototype",
      "flowchart",
      "journey_map"
    ]).optional(),
    fidelity: z.enum([
      "low",
      "medium",
      "high"
    ]).optional().default("medium"),
    generateAssets: z.boolean().optional().default(true),
    includeAnnotations: z.boolean().optional().default(true)
  }).optional()
});

export async function runUXDesignerTool(args: z.infer<typeof UXDesignerToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for UX design decisions
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get design context
    const designContext = await getDesignContext(targetPath, context);
    
    const systemPrompt = `You are a UX Designer specializing in user journey mapping, interaction design, and wireframe creation.
    Your role is to create intuitive and user-friendly design solutions based on user research and requirements.
    Based on the provided context and target, perform the requested UX design action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          designContext,
          options
        })}
      ],
    });

    const design = response.choices[0]?.message?.content;
    if (!design) {
      throw new Error("Failed to generate design output");
    }

    // Process UX design results
    switch (action) {
      case "map_user_journey":
        return await createUserJourney(targetPath, design, options);
      case "design_interactions":
        return await designInteractions(targetPath, design, options);
      case "create_wireframes":
        return await createWireframes(targetPath, design, options);
      case "define_information_arch":
        return await defineInformationArchitecture(targetPath, design, options);
      case "prototype_flow":
        return await createPrototypeFlow(targetPath, design, options);
      case "validate_usability":
        return await validateUsability(targetPath, design, options);
      case "generate_specs":
        return await generateDesignSpecs(targetPath, design, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `UX Designer operation failed: ${errorMessage}`
    };
  }
}

async function getDesignContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const designContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      designContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      designContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      designContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
          designContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return designContext;
  } catch (error) {
    console.warn("Failed to get complete design context:", error);
    return designContext;
  }
}

async function createUserJourney(targetPath: string, design: string, options: any): Promise<any> {
  const journey = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateJourneyMap(journey));
  }
  
  return {
    success: true,
    message: "User journey map created successfully",
    journey
  };
}

async function designInteractions(targetPath: string, design: string, options: any): Promise<any> {
  const interactions = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateInteractionDesign(interactions));
  }
  
  return {
    success: true,
    message: "Interaction design created successfully",
    interactions
  };
}

async function createWireframes(targetPath: string, design: string, options: any): Promise<any> {
  const wireframes = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateWireframeSpecs(wireframes, options.fidelity));
  }
  
  return {
    success: true,
    message: "Wireframes created successfully",
    wireframes
  };
}

async function defineInformationArchitecture(targetPath: string, design: string, options: any): Promise<any> {
  const architecture = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateInformationArchitecture(architecture));
  }
  
  return {
    success: true,
    message: "Information architecture defined successfully",
    architecture
  };
}

async function createPrototypeFlow(targetPath: string, design: string, options: any): Promise<any> {
  const prototype = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generatePrototypeSpec(prototype));
  }
  
  return {
    success: true,
    message: "Prototype flow created successfully",
    prototype
  };
}

async function validateUsability(targetPath: string, design: string, options: any): Promise<any> {
  const validation = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateUsabilityReport(validation));
  }
  
  return {
    success: true,
    message: "Usability validation completed successfully",
    validation
  };
}

async function generateDesignSpecs(targetPath: string, design: string, options: any): Promise<any> {
  const specs = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateDesignSpecification(specs));
  }
  
  return {
    success: true,
    message: "Design specifications generated successfully",
    specs
  };
}

function generateJourneyMap(journey: any): string {
  return `# User Journey Map

## Overview
${journey.overview}

## User Persona
${journey.persona}

## Journey Stages
${journey.stages.map((stage: any) => `
### ${stage.name}
${stage.description}

#### Actions
${stage.actions.map((action: string) => `- ${action}`).join('\n')}

#### Thoughts
${stage.thoughts.map((thought: string) => `- ${thought}`).join('\n')}

#### Emotions
${stage.emotions.map((emotion: string) => `- ${emotion}`).join('\n')}

#### Pain Points
${stage.painPoints.map((point: string) => `- ${point}`).join('\n')}

#### Opportunities
${stage.opportunities.map((opp: string) => `- ${opp}`).join('\n')}
`).join('\n')}

## Key Insights
${journey.insights.map((insight: string) => `- ${insight}`).join('\n')}
`;
}

function generateInteractionDesign(interactions: any): string {
  return `# Interaction Design Specification

## Overview
${interactions.overview}

## Components
${interactions.components.map((component: any) => `
### ${component.name}
${component.description}

#### States
${component.states.map((state: any) => `
##### ${state.name}
- Trigger: ${state.trigger}
- Behavior: ${state.behavior}
- Feedback: ${state.feedback}
`).join('\n')}

#### Animations
${component.animations.map((animation: any) => `
##### ${animation.name}
- Type: ${animation.type}
- Duration: ${animation.duration}
- Easing: ${animation.easing}
`).join('\n')}
`).join('\n')}

## Gestures & Input
${interactions.gestures.map((gesture: any) => `
### ${gesture.name}
- Action: ${gesture.action}
- Response: ${gesture.response}
- Constraints: ${gesture.constraints}
`).join('\n')}
`;
}

function generateWireframeSpecs(wireframes: any, fidelity: string): string {
  return `# Wireframe Specifications (${fidelity} fidelity)

## Overview
${wireframes.overview}

## Screens
${wireframes.screens.map((screen: any) => `
### ${screen.name}
${screen.description}

#### Layout
${screen.layout}

#### Components
${screen.components.map((component: any) => `
##### ${component.name}
- Type: ${component.type}
- Position: ${component.position}
- Size: ${component.size}
- Content: ${component.content}
${component.interactions ? `- Interactions: ${component.interactions}` : ''}
`).join('\n')}

#### Annotations
${screen.annotations.map((note: string) => `- ${note}`).join('\n')}
`).join('\n')}

## Design System References
${wireframes.designSystem.map((ref: any) => `- ${ref.component}: ${ref.usage}`).join('\n')}
`;
}

function generateInformationArchitecture(architecture: any): string {
  return `# Information Architecture

## Site Map
${architecture.siteMap}

## Content Structure
${architecture.contentStructure.map((section: any) => `
### ${section.name}
${section.description}

#### Content Types
${section.contentTypes.map((type: string) => `- ${type}`).join('\n')}

#### Relationships
${section.relationships.map((rel: string) => `- ${rel}`).join('\n')}
`).join('\n')}

## Navigation
${architecture.navigation.map((nav: any) => `
### ${nav.name}
- Type: ${nav.type}
- Items: ${nav.items.join(', ')}
- Access: ${nav.access}
`).join('\n')}

## Taxonomies
${architecture.taxonomies.map((tax: any) => `
### ${tax.name}
${tax.terms.map((term: string) => `- ${term}`).join('\n')}
`).join('\n')}
`;
}

function generatePrototypeSpec(prototype: any): string {
  return `# Interactive Prototype Specification

## Overview
${prototype.overview}

## User Flows
${prototype.flows.map((flow: any) => `
### ${flow.name}
${flow.description}

#### Steps
${flow.steps.map((step: any) => `
##### ${step.number}. ${step.name}
- Screen: ${step.screen}
- Action: ${step.action}
- Response: ${step.response}
- Success Path: ${step.successPath}
- Error Path: ${step.errorPath || 'N/A'}
`).join('\n')}
`).join('\n')}

## Interactions
${prototype.interactions.map((interaction: any) => `
### ${interaction.name}
- Trigger: ${interaction.trigger}
- Animation: ${interaction.animation}
- Duration: ${interaction.duration}
- Feedback: ${interaction.feedback}
`).join('\n')}

## States
${prototype.states.map((state: any) => `
### ${state.name}
- Components: ${state.components.join(', ')}
- Conditions: ${state.conditions.join(', ')}
- Transitions: ${state.transitions.join(', ')}
`).join('\n')}
`;
}

function generateUsabilityReport(validation: any): string {
  return `# Usability Validation Report

## Overview
${validation.overview}

## Heuristic Evaluation
${validation.heuristics.map((heuristic: any) => `
### ${heuristic.principle}
- Score: ${heuristic.score}/10
- Findings: ${heuristic.findings.join(', ')}
- Recommendations: ${heuristic.recommendations.join(', ')}
`).join('\n')}

## User Flow Analysis
${validation.flows.map((flow: any) => `
### ${flow.name}
- Completion Rate: ${flow.completionRate}%
- Average Time: ${flow.averageTime}
- Error Rate: ${flow.errorRate}%
- Pain Points: ${flow.painPoints.join(', ')}
`).join('\n')}

## Recommendations
${validation.recommendations.map((rec: any) => `
### ${rec.priority}. ${rec.title}
${rec.description}
- Impact: ${rec.impact}
- Effort: ${rec.effort}
- Timeline: ${rec.timeline}
`).join('\n')}
`;
}

function generateDesignSpecification(specs: any): string {
  return `# Design Specifications

## Overview
${specs.overview}

## Components
${specs.components.map((component: any) => `
### ${component.name}
${component.description}

#### Visual Properties
- Size: ${component.size}
- Color: ${component.color}
- Typography: ${component.typography}
- Spacing: ${component.spacing}

#### Behavior
${component.behavior.map((behavior: string) => `- ${behavior}`).join('\n')}

#### States
${component.states.map((state: any) => `
##### ${state.name}
- Visual Changes: ${state.visualChanges.join(', ')}
- Interactions: ${state.interactions.join(', ')}
`).join('\n')}
`).join('\n')}

## Layout Guidelines
${specs.layout.map((guideline: any) => `
### ${guideline.name}
${guideline.description}
- Grid: ${guideline.grid}
- Breakpoints: ${guideline.breakpoints.join(', ')}
- Constraints: ${guideline.constraints.join(', ')}
`).join('\n')}

## Design Tokens
${specs.tokens.map((token: any) => `
### ${token.category}
${token.values.map((value: any) => `- ${value.name}: ${value.value}`).join('\n')}
`).join('\n')}
`;
} 