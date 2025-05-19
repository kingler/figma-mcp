import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const wireframeGeneratorToolName = "mcp_wireframe-generator";
export const wireframeGeneratorToolDescription = "Wireframe Generator - Creates and manages wireframes, prototypes, and design specifications.";

export const WireframeGeneratorToolSchema = z.object({
  action: z.enum([
    "create_wireframe",
    "create_prototype",
    "generate_specs",
    "validate_wireframe",
    "export_assets",
    "generate_flow",
    "update_wireframe",
    "integrate_components"
  ]).describe("Wireframe action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    wireframe: z.object({
      name: z.string(),
      type: z.enum(["page", "component", "flow", "prototype"]),
      description: z.string(),
      components: z.array(z.string()).optional(),
      layout: z.object({
        grid: z.boolean().optional(),
        responsive: z.boolean().optional(),
        breakpoints: z.array(z.string()).optional()
      }).optional(),
      interactions: z.array(z.string()).optional()
    }).describe("Wireframe configuration"),
    designSystem: z.object({
      components: z.array(z.string()).optional(),
      patterns: z.array(z.string()).optional(),
      tokens: z.array(z.string()).optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Wireframe context"),
  options: z.object({
    format: z.enum(["svg", "png", "html"]).default("svg"),
    fidelity: z.enum(["low", "medium", "high"]).default("medium"),
    annotations: z.boolean().default(true),
    responsive: z.boolean().default(true),
    exportAssets: z.boolean().default(true),
    generateDocs: z.boolean().default(true)
  }).optional()
});

export async function runWireframeGeneratorTool(args: z.infer<typeof WireframeGeneratorToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get wireframe context
    const wireframeContext = await getWireframeContext(context);
    
    const systemPrompt = `You are a Wireframe Generator specializing in creating and managing wireframes.
    Your role is to create, document, and validate wireframes following UX/UI best practices.
    Based on the provided context and target, perform the requested wireframe action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          wireframeContext,
          options
        })}
      ],
    });

    const wireframe = response.choices[0]?.message?.content;
    if (!wireframe) {
      throw new Error("Failed to generate wireframe");
    }

    // Process wireframe results
    switch (action) {
      case "create_wireframe":
        return await createWireframe(context, wireframe, options);
      case "create_prototype":
        return await createPrototype(context, wireframe, options);
      case "generate_specs":
        return await generateSpecs(context, wireframe, options);
      case "validate_wireframe":
        return await validateWireframe(context, wireframe, options);
      case "export_assets":
        return await exportAssets(context, wireframe, options);
      case "generate_flow":
        return await generateFlow(context, wireframe, options);
      case "update_wireframe":
        return await updateWireframe(context, wireframe, options);
      case "integrate_components":
        return await integrateComponents(context, wireframe, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Wireframe operation failed: ${errorMessage}`
    };
  }
}

async function getWireframeContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const wireframeContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      wireframeContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          wireframeContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return wireframeContext;
  } catch (error) {
    console.warn("Failed to get complete wireframe context:", error);
    return wireframeContext;
  }
}

async function createWireframe(context: any, wireframe: string, options: any): Promise<any> {
  const wireframeData = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const wireframePath = path.join(context.projectPath, "wireframes");
  
  // Create wireframe directory
  await fs.mkdir(wireframePath, { recursive: true });
  
  // Generate wireframe file
  await fs.writeFile(
    path.join(wireframePath, `${wireframeData.name}.${options.format}`),
    wireframeData.content
  );
  
  // Generate annotations if requested
  if (options.annotations) {
    await fs.writeFile(
      path.join(wireframePath, `${wireframeData.name}.annotations.md`),
      wireframeData.annotations
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(wireframePath, `${wireframeData.name}.md`),
      wireframeData.documentation
    );
  }
  
  return {
    success: true,
    message: "Wireframe created successfully",
    wireframe: wireframeData
  };
}

async function createPrototype(context: any, wireframe: string, options: any): Promise<any> {
  const prototypeData = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const prototypePath = path.join(context.projectPath, "prototypes");
  
  // Create prototype directory
  await fs.mkdir(prototypePath, { recursive: true });
  
  // Generate prototype files
  for (const file of prototypeData.files) {
    await fs.writeFile(
      path.join(prototypePath, file.name),
      file.content
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(prototypePath, "README.md"),
      prototypeData.documentation
    );
  }
  
  return {
    success: true,
    message: "Prototype created successfully",
    prototype: prototypeData
  };
}

async function generateSpecs(context: any, wireframe: string, options: any): Promise<any> {
  const specs = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const specsPath = path.join(context.projectPath, "specs", "wireframes");
  
  // Create specs directory
  await fs.mkdir(specsPath, { recursive: true });
  
  // Generate specification files
  await fs.writeFile(
    path.join(specsPath, `${specs.name}-spec.md`),
    specs.documentation
  );
  
  return {
    success: true,
    message: "Wireframe specifications generated successfully",
    specs
  };
}

async function validateWireframe(context: any, wireframe: string, options: any): Promise<any> {
  const validation = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation", "wireframes");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, `${validation.name}-validation.md`),
    validation.report
  );
  
  return {
    success: true,
    message: "Wireframe validation completed successfully",
    validation
  };
}

async function exportAssets(context: any, wireframe: string, options: any): Promise<any> {
  const assets = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const assetsPath = path.join(context.projectPath, "assets", "wireframes");
  
  // Create assets directory
  await fs.mkdir(assetsPath, { recursive: true });
  
  // Export assets
  for (const asset of assets.files) {
    await fs.writeFile(
      path.join(assetsPath, asset.name),
      asset.content
    );
  }
  
  return {
    success: true,
    message: "Wireframe assets exported successfully",
    assets
  };
}

async function generateFlow(context: any, wireframe: string, options: any): Promise<any> {
  const flow = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const flowPath = path.join(context.projectPath, "wireframes", "flows");
  
  // Create flow directory
  await fs.mkdir(flowPath, { recursive: true });
  
  // Generate flow diagram
  await fs.writeFile(
    path.join(flowPath, `${flow.name}.${options.format}`),
    flow.content
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(flowPath, `${flow.name}.md`),
      flow.documentation
    );
  }
  
  return {
    success: true,
    message: "User flow generated successfully",
    flow
  };
}

async function updateWireframe(context: any, wireframe: string, options: any): Promise<any> {
  const update = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const wireframePath = path.join(context.projectPath, "wireframes");
  
  // Update wireframe file
  await fs.writeFile(
    path.join(wireframePath, `${update.name}.${options.format}`),
    update.content
  );
  
  // Update annotations if they exist
  if (update.annotations) {
    await fs.writeFile(
      path.join(wireframePath, `${update.name}.annotations.md`),
      update.annotations
    );
  }
  
  return {
    success: true,
    message: "Wireframe updated successfully",
    update
  };
}

async function integrateComponents(context: any, wireframe: string, options: any): Promise<any> {
  const integration = JSON.parse(wireframe);
  
  const fs = require("fs").promises;
  const integrationPath = path.join(context.projectPath, "wireframes", "integrated");
  
  // Create integration directory
  await fs.mkdir(integrationPath, { recursive: true });
  
  // Generate integrated wireframe
  await fs.writeFile(
    path.join(integrationPath, `${integration.name}.${options.format}`),
    integration.content
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(integrationPath, `${integration.name}.md`),
      integration.documentation
    );
  }
  
  return {
    success: true,
    message: "Components integrated successfully",
    integration
  };
} 