import { z } from "zod";

export const docGeneratorToolName = "mcp_doc-generator";
export const docGeneratorToolDescription = "Generate project documentation based on specified templates and types.";

export const DocGeneratorToolSchema = z.object({
  docType: z.enum([
    "BRD",     // Business Requirements Document
    "PRD",     // Product Requirements Document
    "UXDD",    // UX Design Document
    "SRS",     // Software Requirements Specification
    "API",     // API Documentation
    "ARCH",    // Architecture Documentation
    "DEPL"     // Deployment Documentation
  ]).describe("Type of documentation to generate"),
  outputPath: z.string().describe("Output path for the generated documentation"),
  projectInfo: z.object({
    name: z.string(),
    description: z.string(),
    version: z.string().optional()
  }).describe("Basic project information")
});

export async function runDocGeneratorTool(args: z.infer<typeof DocGeneratorToolSchema>) {
  const { docType, outputPath, projectInfo } = args;
  const fs = require("fs").promises;
  
  try {
    // Get template content based on doc type
    const template = await getDocTemplate(docType);
    
    // Replace template variables with project info
    const content = template
      .replace(/\${project_name}/g, projectInfo.name)
      .replace(/\${project_description}/g, projectInfo.description)
      .replace(/\${version}/g, projectInfo.version || "1.0.0")
      .replace(/\${date}/g, new Date().toISOString().split('T')[0]);
    
    // Ensure output directory exists
    await fs.mkdir(outputPath.split('/').slice(0, -1).join('/'), { recursive: true });
    
    // Write documentation file
    await fs.writeFile(outputPath, content, 'utf8');
    
    return {
      success: true,
      message: `Generated ${docType} documentation at ${outputPath}`,
      outputPath
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to generate documentation: ${errorMessage}`
    };
  }
}

async function getDocTemplate(docType: string): Promise<string> {
  const fs = require("fs").promises;
  const path = require("path");
  
  const templatePath = path.join(__dirname, "../templates", `${docType.toLowerCase()}.md`);
  
  try {
    return await fs.readFile(templatePath, 'utf8');
  } catch (error) {
    // Return basic template if specific template not found
    return getBasicTemplate(docType);
  }
}

function getBasicTemplate(docType: string): string {
  return `# ${docType} - \${project_name}

## Overview
\${project_description}

## Version
\${version}

## Date
\${date}

## Table of Contents
1. Introduction
2. Scope
3. Requirements
4. Implementation Details
5. References

## 1. Introduction
[Introduction content goes here]

## 2. Scope
[Scope content goes here]

## 3. Requirements
[Requirements content goes here]

## 4. Implementation Details
[Implementation details go here]

## 5. References
[References go here]
`;
}

// Ensure that a generateDoc function is exported:
export async function generateDoc(input: { title: string; content: string }): Promise<string> {
  return `# ${input.title}\n\n${input.content}`;
} 