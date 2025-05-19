import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const uxResearcherToolName = "mcp_ux-researcher";
export const uxResearcherToolDescription = "UX Research Specialist - Conducts user research, analyzes behavior, and provides insights.";

export const UXResearcherToolSchema = z.object({
  action: z.enum([
    "plan_research",
    "analyze_interviews",
    "process_survey",
    "generate_insights",
    "create_personas",
    "map_user_journey",
    "analyze_behavior"
  ]).describe("UX research action to perform"),
  inputPath: z.string().describe("Path to input data or research materials"),
  outputPath: z.string().optional().describe("Path for generated research outputs"),
  options: z.object({
    researchType: z.enum([
      "qualitative",
      "quantitative",
      "mixed"
    ]).optional().default("mixed"),
    dataFormat: z.enum([
      "interviews",
      "surveys",
      "analytics",
      "observations",
      "usability_tests"
    ]).optional(),
    generateVisuals: z.boolean().optional().default(true),
    includeRawData: z.boolean().optional().default(false)
  }).optional()
});

export async function runUXResearcherTool(args: z.infer<typeof UXResearcherToolSchema>) {
  const { action, inputPath, outputPath, options = {} } = args;
  
  try {
    // Use OpenAI for research analysis
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get research context and data
    const researchData = await getResearchData(inputPath, options);
    
    const systemPrompt = `You are a UX Research Specialist.
    Your role is to analyze user research data and provide actionable insights.
    Based on the provided data and research type, perform the requested analysis.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          researchData,
          options
        })}
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error("Failed to generate research analysis");
    }

    // Process research results
    switch (action) {
      case "plan_research":
        return await planResearch(analysis, outputPath, options);
      case "analyze_interviews":
        return await analyzeInterviews(analysis, outputPath, options);
      case "process_survey":
        return await processSurvey(analysis, outputPath, options);
      case "generate_insights":
        return await generateInsights(analysis, outputPath, options);
      case "create_personas":
        return await createPersonas(analysis, outputPath, options);
      case "map_user_journey":
        return await mapUserJourney(analysis, outputPath, options);
      case "analyze_behavior":
        return await analyzeBehavior(analysis, outputPath, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `UX research operation failed: ${errorMessage}`
    };
  }
}

async function getResearchData(inputPath: string, options: any): Promise<any> {
  const fs = require("fs").promises;
  
  try {
    const stats = await fs.stat(inputPath);
    if (stats.isFile()) {
      const content = await fs.readFile(inputPath, "utf8");
      return {
        type: options.dataFormat || "unknown",
        content: content
      };
    } else if (stats.isDirectory()) {
      const files = await fs.readdir(inputPath);
      const data: any = {};
      
      for (const file of files) {
        const content = await fs.readFile(path.join(inputPath, file), "utf8");
        data[file] = content;
      }
      
      return {
        type: options.dataFormat || "unknown",
        content: data
      };
    }
  } catch (error) {
    console.warn("Failed to read research data:", error);
    return {};
  }
}

async function planResearch(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const researchPlan = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateResearchPlan(researchPlan));
  }
  
  return {
    success: true,
    message: "Research plan generated successfully",
    plan: researchPlan
  };
}

async function analyzeInterviews(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const interviewAnalysis = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateInterviewReport(interviewAnalysis));
  }
  
  return {
    success: true,
    message: "Interview analysis completed successfully",
    analysis: interviewAnalysis
  };
}

async function processSurvey(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const surveyResults = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateSurveyReport(surveyResults));
  }
  
  return {
    success: true,
    message: "Survey processing completed successfully",
    results: surveyResults
  };
}

async function generateInsights(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const insights = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateInsightsReport(insights));
  }
  
  return {
    success: true,
    message: "Research insights generated successfully",
    insights
  };
}

async function createPersonas(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const personas = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generatePersonasDocument(personas));
  }
  
  return {
    success: true,
    message: "User personas created successfully",
    personas
  };
}

async function mapUserJourney(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const journeyMap = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateJourneyMapDocument(journeyMap));
  }
  
  return {
    success: true,
    message: "User journey map created successfully",
    journeyMap
  };
}

async function analyzeBehavior(analysis: string, outputPath: string | undefined, options: any): Promise<any> {
  const behaviorAnalysis = JSON.parse(analysis);
  
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, generateBehaviorReport(behaviorAnalysis));
  }
  
  return {
    success: true,
    message: "User behavior analysis completed successfully",
    analysis: behaviorAnalysis
  };
}

function generateResearchPlan(plan: any): string {
  return `# UX Research Plan

## Objectives
${plan.objectives.map((obj: string) => `- ${obj}`).join('\n')}

## Methodology
${plan.methodology}

## Timeline
${plan.timeline.map((item: any) => `- ${item.phase}: ${item.duration}`).join('\n')}

## Participants
${plan.participants}

## Data Collection Methods
${plan.methods.map((method: string) => `- ${method}`).join('\n')}

## Expected Outcomes
${plan.outcomes.map((outcome: string) => `- ${outcome}`).join('\n')}
`;
}

function generateInterviewReport(analysis: any): string {
  return `# Interview Analysis Report

## Key Findings
${analysis.findings.map((finding: string) => `- ${finding}`).join('\n')}

## Themes
${analysis.themes.map((theme: any) => `
### ${theme.name}
${theme.description}
${theme.quotes.map((quote: string) => `> ${quote}`).join('\n')}
`).join('\n')}

## Recommendations
${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
}

function generateSurveyReport(results: any): string {
  return `# Survey Results Analysis

## Overview
${results.overview}

## Key Metrics
${Object.entries(results.metrics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Findings
${results.findings.map((finding: string) => `- ${finding}`).join('\n')}

## Recommendations
${results.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
}

function generateInsightsReport(insights: any): string {
  return `# Research Insights

## Key Insights
${insights.key.map((insight: string) => `- ${insight}`).join('\n')}

## User Needs
${insights.needs.map((need: string) => `- ${need}`).join('\n')}

## Pain Points
${insights.painPoints.map((point: string) => `- ${point}`).join('\n')}

## Opportunities
${insights.opportunities.map((opp: string) => `- ${opp}`).join('\n')}
`;
}

function generatePersonasDocument(personas: any): string {
  return `# User Personas

${personas.map((persona: any) => `
## ${persona.name}
### Demographics
${persona.demographics}

### Goals
${persona.goals.map((goal: string) => `- ${goal}`).join('\n')}

### Pain Points
${persona.painPoints.map((point: string) => `- ${point}`).join('\n')}

### Behaviors
${persona.behaviors.map((behavior: string) => `- ${behavior}`).join('\n')}
`).join('\n')}
`;
}

function generateJourneyMapDocument(journey: any): string {
  return `# User Journey Map

## Overview
${journey.overview}

## Stages
${journey.stages.map((stage: any) => `
### ${stage.name}
- Actions: ${stage.actions.join(', ')}
- Thoughts: ${stage.thoughts.join(', ')}
- Emotions: ${stage.emotions.join(', ')}
- Pain Points: ${stage.painPoints.join(', ')}
- Opportunities: ${stage.opportunities.join(', ')}
`).join('\n')}
`;
}

function generateBehaviorReport(analysis: any): string {
  return `# User Behavior Analysis

## Patterns Identified
${analysis.patterns.map((pattern: string) => `- ${pattern}`).join('\n')}

## Key Behaviors
${analysis.behaviors.map((behavior: any) => `
### ${behavior.name}
${behavior.description}
- Frequency: ${behavior.frequency}
- Context: ${behavior.context}
`).join('\n')}

## Recommendations
${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`;
} 