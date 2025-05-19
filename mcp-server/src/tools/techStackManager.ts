import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys.js";
import * as path from "path";

export const techStackManagerToolName = "mcp_tech-stack-manager";
export const techStackManagerToolDescription = "Tech Stack Manager - Analyzes, manages, and documents technology stack and dependencies.";

export const TechStackManagerToolSchema = z.object({
  action: z.enum([
    "analyze_requirements",
    "select_core_tech",
    "select_framework",
    "analyze_dependencies",
    "generate_bom",
    "validate_compatibility",
    "generate_documentation",
    "update_dependencies"
  ]).describe("Tech stack action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    projectType: z.enum([
      "web_app",
      "mobile_app",
      "desktop_app",
      "cli_tool",
      "library",
      "api"
    ]).describe("Type of application"),
    requirements: z.object({
      features: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      performance: z.array(z.string()).optional(),
      security: z.array(z.string()).optional()
    }).optional(),
    preferences: z.object({
      language: z.string().optional(),
      framework: z.string().optional(),
      styling: z.string().optional(),
      testing: z.string().optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Tech stack context"),
  options: z.object({
    generateLockFile: z.boolean().default(true),
    pinVersions: z.boolean().default(true),
    includeDevDeps: z.boolean().default(true),
    generateDocs: z.boolean().default(true),
    validateVersions: z.boolean().default(true)
  }).optional()
});

export async function runTechStackManagerTool(args: z.infer<typeof TechStackManagerToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get tech stack context
    const techContext = await getTechContext(context);
    
    const systemPrompt = `You are a Tech Stack Manager specializing in analyzing and managing technology stacks.
    Your role is to analyze requirements, select appropriate technologies, and manage dependencies.
    Based on the provided context and target, perform the requested tech stack action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          techContext,
          options
        })}
      ],
    });

    const tech = response.choices[0]?.message?.content;
    if (!tech) {
      throw new Error("Failed to generate tech stack analysis");
    }

    // Process tech stack results
    switch (action) {
      case "analyze_requirements":
        return await analyzeRequirements(context, tech, options);
      case "select_core_tech":
        return await selectCoreTech(context, tech, options);
      case "select_framework":
        return await selectFramework(context, tech, options);
      case "analyze_dependencies":
        return await analyzeDependencies(context, tech, options);
      case "generate_bom":
        return await generateBOM(context, tech, options);
      case "validate_compatibility":
        return await validateCompatibility(context, tech, options);
      case "generate_documentation":
        return await generateDocumentation(context, tech, options);
      case "update_dependencies":
        return await updateDependencies(context, tech, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Tech stack operation failed: ${errorMessage}`
    };
  }
}

async function getTechContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const techContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      techContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          techContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return techContext;
  } catch (error) {
    console.warn("Failed to get complete tech context:", error);
    return techContext;
  }
}

async function analyzeRequirements(context: any, tech: string, options: any): Promise<any> {
  const analysis = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const analysisPath = path.join(context.projectPath, "tech-analysis");
  
  // Create analysis directory
  await fs.mkdir(analysisPath, { recursive: true });
  
  // Generate analysis report
  await fs.writeFile(
    path.join(analysisPath, "requirements-analysis.md"),
    analysis.report
  );
  
  return {
    success: true,
    message: "Requirements analysis completed successfully",
    analysis
  };
}

async function selectCoreTech(context: any, tech: string, options: any): Promise<any> {
  const coreTech = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const techPath = path.join(context.projectPath, "tech-stack");
  
  // Create tech stack directory
  await fs.mkdir(techPath, { recursive: true });
  
  // Generate core tech selection
  await fs.writeFile(
    path.join(techPath, "core-tech.json"),
    JSON.stringify(coreTech.selection, null, 2)
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(techPath, "core-tech.md"),
      coreTech.documentation
    );
  }
  
  return {
    success: true,
    message: "Core technology selected successfully",
    coreTech
  };
}

async function selectFramework(context: any, tech: string, options: any): Promise<any> {
  const framework = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const techPath = path.join(context.projectPath, "tech-stack");
  
  // Create tech stack directory
  await fs.mkdir(techPath, { recursive: true });
  
  // Generate framework selection
  await fs.writeFile(
    path.join(techPath, "framework.json"),
    JSON.stringify(framework.selection, null, 2)
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(techPath, "framework.md"),
      framework.documentation
    );
  }
  
  return {
    success: true,
    message: "Framework selected successfully",
    framework
  };
}

async function analyzeDependencies(context: any, tech: string, options: any): Promise<any> {
  const dependencies = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const depsPath = path.join(context.projectPath, "dependencies");
  
  // Create dependencies directory
  await fs.mkdir(depsPath, { recursive: true });
  
  // Generate dependency analysis
  await fs.writeFile(
    path.join(depsPath, "dependency-analysis.json"),
    JSON.stringify(dependencies.analysis, null, 2)
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(depsPath, "dependencies.md"),
      dependencies.documentation
    );
  }
  
  return {
    success: true,
    message: "Dependencies analyzed successfully",
    dependencies
  };
}

async function generateBOM(context: any, tech: string, options: any): Promise<any> {
  const bom = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const bomPath = path.join(context.projectPath, "bom");
  
  // Create BOM directory
  await fs.mkdir(bomPath, { recursive: true });
  
  // Generate BOM files
  await fs.writeFile(
    path.join(bomPath, "bill-of-materials.json"),
    JSON.stringify(bom.materials, null, 2)
  );
  
  // Generate lock file if requested
  if (options.generateLockFile) {
    await fs.writeFile(
      path.join(bomPath, "bom.lock"),
      bom.lockFile
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(bomPath, "bom.md"),
      bom.documentation
    );
  }
  
  return {
    success: true,
    message: "Bill of Materials generated successfully",
    bom
  };
}

async function validateCompatibility(context: any, tech: string, options: any): Promise<any> {
  const validation = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, "compatibility-validation.md"),
    validation.report
  );
  
  return {
    success: true,
    message: "Compatibility validation completed successfully",
    validation
  };
}

async function generateDocumentation(context: any, tech: string, options: any): Promise<any> {
  const documentation = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const docsPath = path.join(context.projectPath, "docs", "tech-stack");
  
  // Create documentation directory
  await fs.mkdir(docsPath, { recursive: true });
  
  // Generate documentation files
  for (const doc of documentation.files) {
    await fs.writeFile(
      path.join(docsPath, doc.name),
      doc.content
    );
  }
  
  return {
    success: true,
    message: "Documentation generated successfully",
    documentation
  };
}

async function updateDependencies(context: any, tech: string, options: any): Promise<any> {
  const update = JSON.parse(tech);
  
  const fs = require("fs").promises;
  const depsPath = path.join(context.projectPath, "dependencies");
  
  // Create dependencies directory
  await fs.mkdir(depsPath, { recursive: true });
  
  // Update dependency files
  await fs.writeFile(
    path.join(depsPath, "package.json"),
    JSON.stringify(update.dependencies, null, 2)
  );
  
  // Update lock file if it exists
  if (update.lockFile) {
    await fs.writeFile(
      path.join(depsPath, "package-lock.json"),
      update.lockFile
    );
  }
  
  return {
    success: true,
    message: "Dependencies updated successfully",
    update
  };
} 