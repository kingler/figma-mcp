import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const auditProcessorToolName = "mcp_audit-processor";
export const auditProcessorToolDescription = "Process audit findings and generate actionable items like feature requests, bug tickets, and user stories.";

export const AuditProcessorToolSchema = z.object({
  action: z.enum([
    "process",   // Process audit findings
    "analyze",   // Analyze audit report
    "generate",  // Generate actionable items
    "track"      // Track audit findings
  ]).describe("Audit processing action to perform"),
  inputPath: z.string().describe("Path to the audit report file"),
  outputPath: z.string().optional().describe("Path for generated output"),
  options: z.object({
    format: z.enum(["markdown", "json", "yaml"]).optional().default("markdown"),
    generateTickets: z.boolean().optional().default(true),
    prioritize: z.boolean().optional().default(true),
    assignOwners: z.boolean().optional().default(false)
  }).optional()
});

export async function runAuditProcessorTool(args: z.infer<typeof AuditProcessorToolSchema>) {
  const { action, inputPath, outputPath, options = {} } = args;
  
  try {
    switch (action) {
      case "process":
        return await processAuditFindings(inputPath, outputPath, options);
      case "analyze":
        return await analyzeAuditReport(inputPath, options);
      case "generate":
        return await generateActionableItems(inputPath, outputPath, options);
      case "track":
        return await trackAuditFindings(inputPath, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Audit processing failed: ${errorMessage}`
    };
  }
}

async function processAuditFindings(inputPath: string, outputPath: string | undefined, options: any): Promise<any> {
  const { parseAuditReport } = require("../scripts/parse_audit_report.js");
  
  // Process the audit report
  const findings = await parseAuditReport(inputPath, {
    format: options.format,
    generateTickets: options.generateTickets
  });
  
  // Save processed findings if output path is provided
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, JSON.stringify(findings, null, 2));
  }
  
  return {
    success: true,
    message: "Audit findings processed successfully",
    findings,
    outputPath
  };
}

async function analyzeAuditReport(inputPath: string, options: any): Promise<any> {
  // Use OpenAI to analyze the audit report and provide insights
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const fs = require("fs").promises;
  const reportContent = await fs.readFile(inputPath, "utf8");

  const systemPrompt = `You are an expert software auditor analyzing an audit report. 
  Provide insights about the findings, prioritize issues, and suggest improvements.`;

  const response = await openai.chat.completions.create({
    model: "o3-mini-2025-01-31",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: reportContent }
    ],
  });

  return {
    success: true,
    message: "Audit report analysis completed",
    analysis: response.choices[0]?.message?.content || "No analysis generated",
    reportContent
  };
}

async function generateActionableItems(inputPath: string, outputPath: string | undefined, options: any): Promise<any> {
  const { generateActionItems } = require("../scripts/parse_audit_report.js");
  
  // Generate actionable items from audit findings
  const actionItems = await generateActionItems(inputPath, {
    format: options.format,
    prioritize: options.prioritize,
    assignOwners: options.assignOwners
  });
  
  // Save generated items if output path is provided
  if (outputPath) {
    const fs = require("fs").promises;
    await fs.writeFile(outputPath, JSON.stringify(actionItems, null, 2));
  }
  
  return {
    success: true,
    message: "Actionable items generated successfully",
    actionItems,
    outputPath
  };
}

async function trackAuditFindings(inputPath: string, options: any): Promise<any> {
  const { trackFindings } = require("../scripts/parse_audit_report.js");
  
  // Track and update status of audit findings
  const trackingResults = await trackFindings(inputPath, {
    format: options.format
  });
  
  return {
    success: true,
    message: "Audit findings tracking updated",
    tracking: trackingResults
  };
}

interface ActionItem {
  type: "feature" | "bug" | "story";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  owner?: string;
  status: "open" | "in-progress" | "resolved";
  created: string;
  updated: string;
} 