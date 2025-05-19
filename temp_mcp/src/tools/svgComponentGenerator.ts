import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const svgComponentGeneratorToolName = "mcp_svg-component-generator";
export const svgComponentGeneratorToolDescription = "SVG Component Generator - Creates and manages SVG components for wireframes and design assets.";

export const SVGComponentGeneratorToolSchema = z.object({
  action: z.enum([
    "create_component",
    "create_icon",
    "create_illustration",
    "optimize_svg",
    "generate_variants",
    "generate_react_component",
    "generate_documentation",
    "validate_svg"
  ]).describe("SVG component action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    component: z.object({
      name: z.string(),
      type: z.enum(["ui", "icon", "illustration"]),
      description: z.string(),
      viewBox: z.string().optional(),
      size: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        aspectRatio: z.string().optional()
      }).optional(),
      style: z.object({
        fill: z.string().optional(),
        stroke: z.string().optional(),
        strokeWidth: z.string().optional()
      }).optional()
    }).describe("SVG component configuration"),
    designTokens: z.object({
      colors: z.record(z.string()).optional(),
      sizes: z.record(z.string()).optional(),
      styles: z.record(z.string()).optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("SVG context"),
  options: z.object({
    framework: z.enum(["react", "vue", "web"]).default("react"),
    typescript: z.boolean().default(true),
    optimize: z.boolean().default(true),
    generateTypes: z.boolean().default(true),
    generateStories: z.boolean().default(true),
    generateDocs: z.boolean().default(true)
  }).optional()
});

export async function runSVGComponentGeneratorTool(args: z.infer<typeof SVGComponentGeneratorToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get SVG context
    const svgContext = await getSVGContext(context);
    
    const systemPrompt = `You are an SVG Component Generator specializing in creating and managing SVG components.
    Your role is to create, optimize, and document SVG components following best practices.
    Based on the provided context and target, perform the requested SVG component action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          svgContext,
          options
        })}
      ],
    });

    const svg = response.choices[0]?.message?.content;
    if (!svg) {
      throw new Error("Failed to generate SVG component");
    }

    // Process SVG results
    switch (action) {
      case "create_component":
        return await createComponent(context, svg, options);
      case "create_icon":
        return await createIcon(context, svg, options);
      case "create_illustration":
        return await createIllustration(context, svg, options);
      case "optimize_svg":
        return await optimizeSVG(context, svg, options);
      case "generate_variants":
        return await generateVariants(context, svg, options);
      case "generate_react_component":
        return await generateReactComponent(context, svg, options);
      case "generate_documentation":
        return await generateDocumentation(context, svg, options);
      case "validate_svg":
        return await validateSVG(context, svg, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `SVG component operation failed: ${errorMessage}`
    };
  }
}

async function getSVGContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const svgContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      svgContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          svgContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return svgContext;
  } catch (error) {
    console.warn("Failed to get complete SVG context:", error);
    return svgContext;
  }
}

async function createComponent(context: any, svg: string, options: any): Promise<any> {
  const component = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "svg", context.component.type);
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate SVG file
  await fs.writeFile(
    path.join(componentPath, `${component.name}.svg`),
    component.svg
  );
  
  // Generate React component if requested
  if (options.framework === "react") {
    const extension = options.typescript ? "tsx" : "jsx";
    await fs.writeFile(
      path.join(componentPath, `${component.name}.${extension}`),
      component.react
    );
    
    if (options.typescript) {
      await fs.writeFile(
        path.join(componentPath, `${component.name}.d.ts`),
        component.types
      );
    }
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.md`),
      component.documentation
    );
  }
  
  // Generate Storybook stories if requested
  if (options.generateStories) {
    const extension = options.typescript ? "tsx" : "jsx";
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  return {
    success: true,
    message: "SVG component created successfully",
    component
  };
}

async function createIcon(context: any, svg: string, options: any): Promise<any> {
  const icon = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const iconPath = path.join(context.projectPath, "components", "svg", "icons");
  
  // Create icon directory
  await fs.mkdir(iconPath, { recursive: true });
  
  // Generate SVG file
  await fs.writeFile(
    path.join(iconPath, `${icon.name}.svg`),
    icon.svg
  );
  
  // Generate React component if requested
  if (options.framework === "react") {
    const extension = options.typescript ? "tsx" : "jsx";
    await fs.writeFile(
      path.join(iconPath, `${icon.name}.${extension}`),
      icon.react
    );
    
    if (options.typescript) {
      await fs.writeFile(
        path.join(iconPath, `${icon.name}.d.ts`),
        icon.types
      );
    }
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(iconPath, `${icon.name}.md`),
      icon.documentation
    );
  }
  
  return {
    success: true,
    message: "SVG icon created successfully",
    icon
  };
}

async function createIllustration(context: any, svg: string, options: any): Promise<any> {
  const illustration = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const illustrationPath = path.join(context.projectPath, "components", "svg", "illustrations");
  
  // Create illustration directory
  await fs.mkdir(illustrationPath, { recursive: true });
  
  // Generate SVG file
  await fs.writeFile(
    path.join(illustrationPath, `${illustration.name}.svg`),
    illustration.svg
  );
  
  // Generate React component if requested
  if (options.framework === "react") {
    const extension = options.typescript ? "tsx" : "jsx";
    await fs.writeFile(
      path.join(illustrationPath, `${illustration.name}.${extension}`),
      illustration.react
    );
    
    if (options.typescript) {
      await fs.writeFile(
        path.join(illustrationPath, `${illustration.name}.d.ts`),
        illustration.types
      );
    }
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(illustrationPath, `${illustration.name}.md`),
      illustration.documentation
    );
  }
  
  return {
    success: true,
    message: "SVG illustration created successfully",
    illustration
  };
}

async function optimizeSVG(context: any, svg: string, options: any): Promise<any> {
  const optimization = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const optimizedPath = path.join(context.projectPath, "components", "svg", "optimized");
  
  // Create optimized directory
  await fs.mkdir(optimizedPath, { recursive: true });
  
  // Generate optimized SVG
  await fs.writeFile(
    path.join(optimizedPath, `${optimization.name}.svg`),
    optimization.svg
  );
  
  return {
    success: true,
    message: "SVG optimized successfully",
    optimization
  };
}

async function generateVariants(context: any, svg: string, options: any): Promise<any> {
  const variants = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const variantsPath = path.join(context.projectPath, "components", "svg", "variants");
  
  // Create variants directory
  await fs.mkdir(variantsPath, { recursive: true });
  
  // Generate variant files
  for (const variant of variants.files) {
    await fs.writeFile(
      path.join(variantsPath, variant.name),
      variant.content
    );
  }
  
  return {
    success: true,
    message: "SVG variants generated successfully",
    variants
  };
}

async function generateReactComponent(context: any, svg: string, options: any): Promise<any> {
  const component = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "svg", "react");
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate React component
  const extension = options.typescript ? "tsx" : "jsx";
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${extension}`),
    component.react
  );
  
  // Generate types if requested
  if (options.typescript) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.d.ts`),
      component.types
    );
  }
  
  // Generate stories if requested
  if (options.generateStories) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  return {
    success: true,
    message: "React component generated successfully",
    component
  };
}

async function generateDocumentation(context: any, svg: string, options: any): Promise<any> {
  const documentation = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const docsPath = path.join(context.projectPath, "docs", "svg");
  
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
    message: "SVG documentation generated successfully",
    documentation
  };
}

async function validateSVG(context: any, svg: string, options: any): Promise<any> {
  const validation = JSON.parse(svg);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation", "svg");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, `${validation.name}-validation.md`),
    validation.report
  );
  
  return {
    success: true,
    message: "SVG validation completed successfully",
    validation
  };
} 