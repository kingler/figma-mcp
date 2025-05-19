import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys.js";
import * as path from "path";

export const uxWorkflowManagerToolName = "mcp_ux-workflow-manager";
export const uxWorkflowManagerToolDescription = "UX Workflow Manager - Orchestrates the complete UX/UI design process and workflow.";

export const UXWorkflowManagerToolSchema = z.object({
  action: z.enum([
    "init_workflow",
    "requirements_analysis",
    "design_system_setup",
    "wireframe_development",
    "design_validation",
    "implementation",
    "generate_documentation",
    "check_status"
  ]).describe("UX workflow action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    phase: z.enum([
      "requirements",
      "design",
      "development",
      "validation",
      "implementation"
    ]).describe("Current workflow phase"),
    requirements: z.object({
      userStories: z.array(z.string()).optional(),
      features: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional()
    }).optional(),
    designSystem: z.object({
      components: z.array(z.string()).optional(),
      patterns: z.array(z.string()).optional(),
      tokens: z.array(z.string()).optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Workflow context"),
  options: z.object({
    framework: z.enum(["react", "vue", "angular", "web"]).default("react"),
    styling: z.enum(["tailwind", "css", "scss"]).default("tailwind"),
    generateDocs: z.boolean().default(true),
    validateSteps: z.boolean().default(true),
    autoProgress: z.boolean().default(false)
  }).optional()
});

export async function runUXWorkflowManagerTool(args: z.infer<typeof UXWorkflowManagerToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get workflow context
    const workflowContext = await getWorkflowContext(context);
    
    const systemPrompt = `You are a UX Workflow Manager specializing in orchestrating UX/UI design processes.
    Your role is to manage and coordinate the complete UX/UI design workflow, ensuring consistency and quality.
    Based on the provided context and target, perform the requested workflow action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          workflowContext,
          options
        })}
      ],
    });

    const workflow = response.choices[0]?.message?.content;
    if (!workflow) {
      throw new Error("Failed to generate workflow response");
    }

    // Process workflow results
    switch (action) {
      case "init_workflow":
        return await initializeWorkflow(context, workflow, options);
      case "requirements_analysis":
        return await analyzeRequirements(context, workflow, options);
      case "design_system_setup":
        return await setupDesignSystem(context, workflow, options);
      case "wireframe_development":
        return await developWireframes(context, workflow, options);
      case "design_validation":
        return await validateDesign(context, workflow, options);
      case "implementation":
        return await implementDesign(context, workflow, options);
      case "generate_documentation":
        return await generateDocumentation(context, workflow, options);
      case "check_status":
        return await checkWorkflowStatus(context, workflow, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `UX workflow operation failed: ${errorMessage}`
    };
  }
}

async function getWorkflowContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const workflowContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      workflowContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          workflowContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return workflowContext;
  } catch (error) {
    console.warn("Failed to get complete workflow context:", error);
    return workflowContext;
  }
}

async function initializeWorkflow(context: any, workflow: string, options: any): Promise<any> {
  const workflowSetup = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const workflowPath = path.join(context.projectPath, ".ux-workflow");
  
  // Create workflow directory structure
  await fs.mkdir(workflowPath, { recursive: true });
  await fs.mkdir(path.join(workflowPath, "requirements"), { recursive: true });
  await fs.mkdir(path.join(workflowPath, "design-system"), { recursive: true });
  await fs.mkdir(path.join(workflowPath, "wireframes"), { recursive: true });
  await fs.mkdir(path.join(workflowPath, "validation"), { recursive: true });
  await fs.mkdir(path.join(workflowPath, "implementation"), { recursive: true });
  
  // Generate workflow configuration
  await fs.writeFile(
    path.join(workflowPath, "workflow.config.json"),
    JSON.stringify(workflowSetup.config, null, 2)
  );
  
  // Generate workflow documentation
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(workflowPath, "README.md"),
      workflowSetup.documentation
    );
  }
  
  return {
    success: true,
    message: "UX workflow initialized successfully",
    workflow: workflowSetup
  };
}

async function analyzeRequirements(context: any, workflow: string, options: any): Promise<any> {
  const analysis = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const requirementsPath = path.join(context.projectPath, ".ux-workflow", "requirements");
  
  // Generate requirements analysis
  await fs.writeFile(
    path.join(requirementsPath, "analysis.json"),
    JSON.stringify(analysis.requirements, null, 2)
  );
  
  // Generate documentation
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(requirementsPath, "README.md"),
      analysis.documentation
    );
  }
  
  return {
    success: true,
    message: "Requirements analysis completed successfully",
    analysis
  };
}

async function setupDesignSystem(context: any, workflow: string, options: any): Promise<any> {
  const designSystem = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const designSystemPath = path.join(context.projectPath, ".ux-workflow", "design-system");
  
  // Generate design system setup
  await fs.writeFile(
    path.join(designSystemPath, "design-system.json"),
    JSON.stringify(designSystem.setup, null, 2)
  );
  
  // Generate documentation
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(designSystemPath, "README.md"),
      designSystem.documentation
    );
  }
  
  return {
    success: true,
    message: "Design system setup completed successfully",
    designSystem
  };
}

async function developWireframes(context: any, workflow: string, options: any): Promise<any> {
  const wireframes = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const wireframesPath = path.join(context.projectPath, ".ux-workflow", "wireframes");
  
  // Generate wireframe files
  for (const wireframe of wireframes.files) {
    await fs.writeFile(
      path.join(wireframesPath, wireframe.name),
      wireframe.content
    );
  }
  
  // Generate documentation
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(wireframesPath, "README.md"),
      wireframes.documentation
    );
  }
  
  return {
    success: true,
    message: "Wireframe development completed successfully",
    wireframes
  };
}

async function validateDesign(context: any, workflow: string, options: any): Promise<any> {
  const validation = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, ".ux-workflow", "validation");
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, "validation-report.md"),
    validation.report
  );
  
  // Generate validation data
  await fs.writeFile(
    path.join(validationPath, "validation-data.json"),
    JSON.stringify(validation.data, null, 2)
  );
  
  return {
    success: true,
    message: "Design validation completed successfully",
    validation
  };
}

async function implementDesign(context: any, workflow: string, options: any): Promise<any> {
  const implementation = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const implementationPath = path.join(context.projectPath, ".ux-workflow", "implementation");
  
  // Generate implementation files
  for (const file of implementation.files) {
    await fs.writeFile(
      path.join(implementationPath, file.name),
      file.content
    );
  }
  
  // Generate documentation
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(implementationPath, "README.md"),
      implementation.documentation
    );
  }
  
  return {
    success: true,
    message: "Design implementation completed successfully",
    implementation
  };
}

async function generateDocumentation(context: any, workflow: string, options: any): Promise<any> {
  const documentation = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const docsPath = path.join(context.projectPath, "docs", "ux-workflow");
  
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
    message: "Workflow documentation generated successfully",
    documentation
  };
}

async function checkWorkflowStatus(context: any, workflow: string, options: any): Promise<any> {
  const status = JSON.parse(workflow);
  
  const fs = require("fs").promises;
  const statusPath = path.join(context.projectPath, ".ux-workflow", "status");
  
  // Create status directory
  await fs.mkdir(statusPath, { recursive: true });
  
  // Generate status report
  await fs.writeFile(
    path.join(statusPath, "status-report.md"),
    status.report
  );
  
  return {
    success: true,
    message: "Workflow status check completed successfully",
    status
  };
} 