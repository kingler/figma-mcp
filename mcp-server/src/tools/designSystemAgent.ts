import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys.js";
import * as path from "path";

export const designSystemAgentToolName = "mcp_design-system-agent";
export const designSystemAgentToolDescription = "Design System Agent - Creates and manages comprehensive design systems, documentation, and implementation guidelines.";

export const DesignSystemAgentToolSchema = z.object({
  action: z.enum([
    "create_design_system",
    "generate_documentation",
    "create_grid_system",
    "define_object_model",
    "create_page_structure",
    "create_wireframe",
    "create_prototype",
    "generate_specs",
    "validate_design"
  ]).describe("Design system action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    designSystem: z.object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
      principles: z.array(z.string()).optional(),
      tokens: z.object({
        colors: z.array(z.any()).optional(),
        typography: z.array(z.any()).optional(),
        spacing: z.array(z.any()).optional(),
        breakpoints: z.array(z.any()).optional()
      }).optional()
    }).describe("Design system configuration"),
    components: z.array(z.object({
      name: z.string(),
      type: z.enum(["atom", "molecule", "organism", "template", "page"]),
      description: z.string(),
      props: z.array(z.string()).optional(),
      variants: z.array(z.string()).optional()
    })).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Design context"),
  options: z.object({
    format: z.enum(["xml", "markdown", "json"]).default("markdown"),
    generateAssets: z.boolean().default(true),
    includeAnnotations: z.boolean().default(true),
    framework: z.enum(["react", "vue", "angular", "web"]).default("react"),
    styling: z.enum(["tailwind", "css", "scss"]).default("tailwind"),
    generateCode: z.boolean().default(true)
  }).optional()
});

export async function runDesignSystemAgentTool(args: z.infer<typeof DesignSystemAgentToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get design context
    const designContext = await getDesignContext(context);
    
    const systemPrompt = `You are a Design System Agent specializing in creating and managing comprehensive design systems.
    Your role is to create, document, and implement design systems following atomic design principles and best practices.
    Based on the provided context and target, perform the requested design system action.`;

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

    // Process design results
    switch (action) {
      case "create_design_system":
        return await createDesignSystem(context, design, options);
      case "generate_documentation":
        return await generateDocumentation(context, design, options);
      case "create_grid_system":
        return await createGridSystem(context, design, options);
      case "define_object_model":
        return await defineObjectModel(context, design, options);
      case "create_page_structure":
        return await createPageStructure(context, design, options);
      case "create_wireframe":
        return await createWireframe(context, design, options);
      case "create_prototype":
        return await createPrototype(context, design, options);
      case "generate_specs":
        return await generateSpecs(context, design, options);
      case "validate_design":
        return await validateDesign(context, design, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Design system operation failed: ${errorMessage}`
    };
  }
}

async function getDesignContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const designContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      designContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
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

async function createDesignSystem(context: any, design: string, options: any): Promise<any> {
  const designSystem = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const designSystemPath = path.join(context.projectPath, "design-system");
    
    // Create directory structure
    await fs.mkdir(designSystemPath, { recursive: true });
    await fs.mkdir(path.join(designSystemPath, "components"), { recursive: true });
    await fs.mkdir(path.join(designSystemPath, "tokens"), { recursive: true });
    await fs.mkdir(path.join(designSystemPath, "docs"), { recursive: true });
    
    // Generate design system files
    await fs.writeFile(
      path.join(designSystemPath, "design-system.config.json"),
      JSON.stringify(designSystem.config, null, 2)
    );
    
    // Generate component files
    for (const component of designSystem.components) {
      await fs.writeFile(
        path.join(designSystemPath, "components", `${component.name}.${options.framework === "react" ? "tsx" : "vue"}`),
        component.code
      );
    }
    
    // Generate token files
    await fs.writeFile(
      path.join(designSystemPath, "tokens", "index.ts"),
      designSystem.tokens
    );
    
    // Generate documentation
    await fs.writeFile(
      path.join(designSystemPath, "docs", "README.md"),
      designSystem.documentation
    );
  }
  
  return {
    success: true,
    message: "Design system created successfully",
    designSystem
  };
}

async function generateDocumentation(context: any, design: string, options: any): Promise<any> {
  const documentation = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const docsPath = path.join(context.projectPath, "docs");
    
    // Create documentation files
    await fs.mkdir(docsPath, { recursive: true });
    
    // Generate main documentation file
    await fs.writeFile(
      path.join(docsPath, "design-system.md"),
      documentation.main
    );
    
    // Generate component documentation
    for (const component of documentation.components) {
      await fs.writeFile(
        path.join(docsPath, `${component.name}.md`),
        component.documentation
      );
    }
  }
  
  return {
    success: true,
    message: "Documentation generated successfully",
    documentation
  };
}

async function createGridSystem(context: any, design: string, options: any): Promise<any> {
  const gridSystem = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const gridPath = path.join(context.projectPath, "styles");
    
    // Create grid system files
    await fs.mkdir(gridPath, { recursive: true });
    
    // Generate grid styles
    await fs.writeFile(
      path.join(gridPath, `grid.${options.styling}`),
      gridSystem.styles
    );
    
    // Generate grid documentation
    await fs.writeFile(
      path.join(gridPath, "grid.md"),
      gridSystem.documentation
    );
  }
  
  return {
    success: true,
    message: "Grid system created successfully",
    gridSystem
  };
}

async function defineObjectModel(context: any, design: string, options: any): Promise<any> {
  const objectModel = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const modelPath = path.join(context.projectPath, "models");
    
    // Create object model files
    await fs.mkdir(modelPath, { recursive: true });
    
    // Generate model definitions
    await fs.writeFile(
      path.join(modelPath, "object-model.ts"),
      objectModel.definitions
    );
    
    // Generate model documentation
    await fs.writeFile(
      path.join(modelPath, "object-model.md"),
      objectModel.documentation
    );
  }
  
  return {
    success: true,
    message: "Object model defined successfully",
    objectModel
  };
}

async function createPageStructure(context: any, design: string, options: any): Promise<any> {
  const pageStructure = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const pagesPath = path.join(context.projectPath, "pages");
    
    // Create page structure files
    await fs.mkdir(pagesPath, { recursive: true });
    
    // Generate page templates
    for (const page of pageStructure.pages) {
      await fs.writeFile(
        path.join(pagesPath, `${page.name}.${options.framework === "react" ? "tsx" : "vue"}`),
        page.code
      );
    }
    
    // Generate layout documentation
    await fs.writeFile(
      path.join(pagesPath, "layouts.md"),
      pageStructure.documentation
    );
  }
  
  return {
    success: true,
    message: "Page structure created successfully",
    pageStructure
  };
}

async function createWireframe(context: any, design: string, options: any): Promise<any> {
  const wireframe = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const wireframesPath = path.join(context.projectPath, "wireframes");
    
    // Create wireframe files
    await fs.mkdir(wireframesPath, { recursive: true });
    
    // Generate wireframe files
    await fs.writeFile(
      path.join(wireframesPath, `${wireframe.name}.svg`),
      wireframe.svg
    );
    
    // Generate wireframe documentation
    if (options.includeAnnotations) {
      await fs.writeFile(
        path.join(wireframesPath, `${wireframe.name}.md`),
        wireframe.documentation
      );
    }
  }
  
  return {
    success: true,
    message: "Wireframe created successfully",
    wireframe
  };
}

async function createPrototype(context: any, design: string, options: any): Promise<any> {
  const prototype = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const prototypePath = path.join(context.projectPath, "prototype");
    
    // Create prototype files
    await fs.mkdir(prototypePath, { recursive: true });
    await fs.mkdir(path.join(prototypePath, "components"), { recursive: true });
    await fs.mkdir(path.join(prototypePath, "pages"), { recursive: true });
    
    // Generate prototype files
    for (const component of prototype.components) {
      await fs.writeFile(
        path.join(prototypePath, "components", `${component.name}.${options.framework === "react" ? "tsx" : "vue"}`),
        component.code
      );
    }
    
    for (const page of prototype.pages) {
      await fs.writeFile(
        path.join(prototypePath, "pages", `${page.name}.${options.framework === "react" ? "tsx" : "vue"}`),
        page.code
      );
    }
    
    // Generate prototype documentation
    await fs.writeFile(
      path.join(prototypePath, "README.md"),
      prototype.documentation
    );
  }
  
  return {
    success: true,
    message: "Prototype created successfully",
    prototype
  };
}

async function generateSpecs(context: any, design: string, options: any): Promise<any> {
  const specs = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const specsPath = path.join(context.projectPath, "specs");
    
    // Create specs files
    await fs.mkdir(specsPath, { recursive: true });
    
    // Generate component specs
    for (const component of specs.components) {
      await fs.writeFile(
        path.join(specsPath, `${component.name}.md`),
        component.specification
      );
    }
    
    // Generate design tokens specs
    await fs.writeFile(
      path.join(specsPath, "tokens.md"),
      specs.tokens
    );
  }
  
  return {
    success: true,
    message: "Design specs generated successfully",
    specs
  };
}

async function validateDesign(context: any, design: string, options: any): Promise<any> {
  const validation = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    const validationPath = path.join(context.projectPath, "validation");
    
    // Create validation files
    await fs.mkdir(validationPath, { recursive: true });
    
    // Generate validation report
    await fs.writeFile(
      path.join(validationPath, "design-validation.md"),
      validation.report
    );
  }
  
  return {
    success: true,
    message: "Design validation completed successfully",
    validation
  };
} 