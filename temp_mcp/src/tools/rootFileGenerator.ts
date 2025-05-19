import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const rootFileGeneratorToolName = "mcp_root-file-generator";
export const rootFileGeneratorToolDescription = "Root File Generator - Creates and manages root app components and routing setup.";

export const RootFileGeneratorToolSchema = z.object({
  action: z.enum([
    "create_root_component",
    "update_routing",
    "add_global_state",
    "add_middleware",
    "generate_types",
    "validate_structure",
    "generate_documentation"
  ]).describe("Root file action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    appConfig: z.object({
      name: z.string(),
      framework: z.enum(["react", "next"]),
      routing: z.object({
        type: z.enum(["browser-router", "hash-router", "memory-router"]),
        routes: z.array(z.object({
          path: z.string(),
          component: z.string(),
          auth: z.boolean().optional(),
          layout: z.string().optional(),
          children: z.array(z.any()).optional()
        }))
      }),
      state: z.object({
        type: z.enum(["redux", "context", "zustand", "jotai", "none"]).optional(),
        features: z.array(z.string()).optional()
      }).optional(),
      middleware: z.array(z.string()).optional()
    }).describe("App configuration"),
    artifacts: z.array(z.string()).optional()
  }).describe("Root file context"),
  options: z.object({
    typescript: z.boolean().default(true),
    styling: z.enum(["tailwind", "css", "scss"]).default("tailwind"),
    strictMode: z.boolean().default(true),
    generateTests: z.boolean().default(true),
    generateDocs: z.boolean().default(true)
  }).optional()
});

export async function runRootFileGeneratorTool(args: z.infer<typeof RootFileGeneratorToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get root file context
    const rootContext = await getRootContext(context);
    
    const systemPrompt = `You are a Root File Generator specializing in creating and managing root app components.
    Your role is to create, document, and implement root app components following best practices.
    Based on the provided context and target, perform the requested root file action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          rootContext,
          options
        })}
      ],
    });

    const root = response.choices[0]?.message?.content;
    if (!root) {
      throw new Error("Failed to generate root file");
    }

    // Process root file results
    switch (action) {
      case "create_root_component":
        return await createRootComponent(context, root, options);
      case "update_routing":
        return await updateRouting(context, root, options);
      case "add_global_state":
        return await addGlobalState(context, root, options);
      case "add_middleware":
        return await addMiddleware(context, root, options);
      case "generate_types":
        return await generateTypes(context, root, options);
      case "validate_structure":
        return await validateStructure(context, root, options);
      case "generate_documentation":
        return await generateDocumentation(context, root, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Root file operation failed: ${errorMessage}`
    };
  }
}

async function getRootContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const rootContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      rootContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          rootContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return rootContext;
  } catch (error) {
    console.warn("Failed to get complete root context:", error);
    return rootContext;
  }
}

async function createRootComponent(context: any, root: string, options: any): Promise<any> {
  const rootComponent = JSON.parse(root);
  
  const fs = require("fs").promises;
  const srcPath = path.join(context.projectPath, "src");
  
  // Create src directory if it doesn't exist
  await fs.mkdir(srcPath, { recursive: true });
  
  // Generate root component file
  const extension = options.typescript ? "tsx" : "jsx";
  await fs.writeFile(
    path.join(srcPath, `App.${extension}`),
    rootComponent.code
  );
  
  // Generate types if requested
  if (options.typescript) {
    await fs.writeFile(
      path.join(srcPath, "App.d.ts"),
      rootComponent.types
    );
  }
  
  // Generate tests if requested
  if (options.generateTests) {
    await fs.writeFile(
      path.join(srcPath, `App.test.${extension}`),
      rootComponent.tests
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(srcPath, "App.md"),
      rootComponent.documentation
    );
  }
  
  return {
    success: true,
    message: "Root component created successfully",
    component: rootComponent
  };
}

async function updateRouting(context: any, root: string, options: any): Promise<any> {
  const routing = JSON.parse(root);
  
  const fs = require("fs").promises;
  const srcPath = path.join(context.projectPath, "src");
  
  // Update routing configuration
  const extension = options.typescript ? "tsx" : "jsx";
  await fs.writeFile(
    path.join(srcPath, `App.${extension}`),
    routing.code
  );
  
  // Update types if using TypeScript
  if (options.typescript) {
    await fs.writeFile(
      path.join(srcPath, "routes.d.ts"),
      routing.types
    );
  }
  
  return {
    success: true,
    message: "Routing updated successfully",
    routing
  };
}

async function addGlobalState(context: any, root: string, options: any): Promise<any> {
  const state = JSON.parse(root);
  
  const fs = require("fs").promises;
  const storePath = path.join(context.projectPath, "src", "store");
  
  // Create store directory
  await fs.mkdir(storePath, { recursive: true });
  
  // Generate store files
  const extension = options.typescript ? "ts" : "js";
  await fs.writeFile(
    path.join(storePath, `index.${extension}`),
    state.store
  );
  
  // Generate types if using TypeScript
  if (options.typescript) {
    await fs.writeFile(
      path.join(storePath, "types.ts"),
      state.types
    );
  }
  
  return {
    success: true,
    message: "Global state added successfully",
    state
  };
}

async function addMiddleware(context: any, root: string, options: any): Promise<any> {
  const middleware = JSON.parse(root);
  
  const fs = require("fs").promises;
  const middlewarePath = path.join(context.projectPath, "src", "middleware");
  
  // Create middleware directory
  await fs.mkdir(middlewarePath, { recursive: true });
  
  // Generate middleware files
  const extension = options.typescript ? "ts" : "js";
  for (const mw of middleware.files) {
    await fs.writeFile(
      path.join(middlewarePath, `${mw.name}.${extension}`),
      mw.code
    );
  }
  
  return {
    success: true,
    message: "Middleware added successfully",
    middleware
  };
}

async function generateTypes(context: any, root: string, options: any): Promise<any> {
  const types = JSON.parse(root);
  
  const fs = require("fs").promises;
  const typesPath = path.join(context.projectPath, "src", "types");
  
  // Create types directory
  await fs.mkdir(typesPath, { recursive: true });
  
  // Generate type files
  for (const type of types.files) {
    await fs.writeFile(
      path.join(typesPath, type.name),
      type.content
    );
  }
  
  return {
    success: true,
    message: "Types generated successfully",
    types
  };
}

async function validateStructure(context: any, root: string, options: any): Promise<any> {
  const validation = JSON.parse(root);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, "root-structure-validation.md"),
    validation.report
  );
  
  return {
    success: true,
    message: "Structure validation completed successfully",
    validation
  };
}

async function generateDocumentation(context: any, root: string, options: any): Promise<any> {
  const documentation = JSON.parse(root);
  
  const fs = require("fs").promises;
  const docsPath = path.join(context.projectPath, "docs", "root");
  
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