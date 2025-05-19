import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const componentLayoutAgentToolName = "mcp_component-layout-agent";
export const componentLayoutAgentToolDescription = "Component Layout Agent - Creates and manages component layouts, specifications, and implementation guidelines.";

export const ComponentLayoutAgentToolSchema = z.object({
  action: z.enum([
    "create_basic_component",
    "create_navigation_component",
    "create_content_component",
    "create_modal_component",
    "create_layout_pattern",
    "generate_component_spec",
    "validate_component",
    "generate_documentation"
  ]).describe("Component layout action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    component: z.object({
      name: z.string(),
      type: z.enum([
        "card",
        "form-group",
        "navbar",
        "sidebar",
        "media-object",
        "list-group",
        "modal",
        "split-view",
        "dashboard-grid",
        "custom"
      ]),
      description: z.string(),
      features: z.array(z.string()).optional(),
      states: z.array(z.string()).optional(),
      accessibility: z.object({
        wcagLevel: z.enum(["A", "AA", "AAA"]).optional(),
        ariaLabels: z.array(z.string()).optional(),
        keyboardNav: z.boolean().optional()
      }).optional(),
      responsive: z.object({
        breakpoints: z.array(z.string()).optional(),
        mobileFirst: z.boolean().optional()
      }).optional()
    }).describe("Component configuration"),
    designSpec: z.object({
      goals: z.array(z.string()).optional(),
      userNeeds: z.array(z.string()).optional(),
      interactions: z.object({
        userActions: z.array(z.string()).optional(),
        systemResponses: z.array(z.string()).optional(),
        errorStates: z.array(z.string()).optional()
      }).optional(),
      style: z.object({
        colors: z.array(z.string()).optional(),
        typography: z.array(z.string()).optional(),
        spacing: z.array(z.string()).optional(),
        icons: z.array(z.string()).optional()
      }).optional()
    }).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Component context"),
  options: z.object({
    framework: z.enum(["react", "vue", "angular", "web"]).default("react"),
    styling: z.enum(["tailwind", "css", "scss"]).default("tailwind"),
    generateTests: z.boolean().default(true),
    includeStorybook: z.boolean().default(true),
    generateDocs: z.boolean().default(true),
    accessibility: z.boolean().default(true)
  }).optional()
});

export async function runComponentLayoutAgentTool(args: z.infer<typeof ComponentLayoutAgentToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get component context
    const componentContext = await getComponentContext(context);
    
    const systemPrompt = `You are a Component Layout Agent specializing in creating and managing component layouts.
    Your role is to create, document, and implement component layouts following best practices and accessibility standards.
    Based on the provided context and target, perform the requested component layout action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          componentContext,
          options
        })}
      ],
    });

    const layout = response.choices[0]?.message?.content;
    if (!layout) {
      throw new Error("Failed to generate component layout");
    }

    // Process layout results
    switch (action) {
      case "create_basic_component":
        return await createBasicComponent(context, layout, options);
      case "create_navigation_component":
        return await createNavigationComponent(context, layout, options);
      case "create_content_component":
        return await createContentComponent(context, layout, options);
      case "create_modal_component":
        return await createModalComponent(context, layout, options);
      case "create_layout_pattern":
        return await createLayoutPattern(context, layout, options);
      case "generate_component_spec":
        return await generateComponentSpec(context, layout, options);
      case "validate_component":
        return await validateComponent(context, layout, options);
      case "generate_documentation":
        return await generateDocumentation(context, layout, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Component layout operation failed: ${errorMessage}`
    };
  }
}

async function getComponentContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const componentContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      componentContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          componentContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return componentContext;
  } catch (error) {
    console.warn("Failed to get complete component context:", error);
    return componentContext;
  }
}

async function createBasicComponent(context: any, layout: string, options: any): Promise<any> {
  const component = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "basic");
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate component files
  const extension = options.framework === "react" ? "tsx" : "vue";
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${extension}`),
    component.code
  );
  
  // Generate styles
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${options.styling}`),
    component.styles
  );
  
  // Generate tests if requested
  if (options.generateTests) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.test.${extension}`),
      component.tests
    );
  }
  
  // Generate Storybook stories if requested
  if (options.includeStorybook) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.md`),
      component.documentation
    );
  }
  
  return {
    success: true,
    message: "Basic component created successfully",
    component
  };
}

async function createNavigationComponent(context: any, layout: string, options: any): Promise<any> {
  const component = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "navigation");
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate component files
  const extension = options.framework === "react" ? "tsx" : "vue";
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${extension}`),
    component.code
  );
  
  // Generate styles
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${options.styling}`),
    component.styles
  );
  
  // Generate tests if requested
  if (options.generateTests) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.test.${extension}`),
      component.tests
    );
  }
  
  // Generate Storybook stories if requested
  if (options.includeStorybook) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.md`),
      component.documentation
    );
  }
  
  return {
    success: true,
    message: "Navigation component created successfully",
    component
  };
}

async function createContentComponent(context: any, layout: string, options: any): Promise<any> {
  const component = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "content");
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate component files
  const extension = options.framework === "react" ? "tsx" : "vue";
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${extension}`),
    component.code
  );
  
  // Generate styles
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${options.styling}`),
    component.styles
  );
  
  // Generate tests if requested
  if (options.generateTests) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.test.${extension}`),
      component.tests
    );
  }
  
  // Generate Storybook stories if requested
  if (options.includeStorybook) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.md`),
      component.documentation
    );
  }
  
  return {
    success: true,
    message: "Content component created successfully",
    component
  };
}

async function createModalComponent(context: any, layout: string, options: any): Promise<any> {
  const component = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const componentPath = path.join(context.projectPath, "components", "modal");
  
  // Create component directory
  await fs.mkdir(componentPath, { recursive: true });
  
  // Generate component files
  const extension = options.framework === "react" ? "tsx" : "vue";
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${extension}`),
    component.code
  );
  
  // Generate styles
  await fs.writeFile(
    path.join(componentPath, `${component.name}.${options.styling}`),
    component.styles
  );
  
  // Generate tests if requested
  if (options.generateTests) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.test.${extension}`),
      component.tests
    );
  }
  
  // Generate Storybook stories if requested
  if (options.includeStorybook) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.stories.${extension}`),
      component.stories
    );
  }
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(componentPath, `${component.name}.md`),
      component.documentation
    );
  }
  
  return {
    success: true,
    message: "Modal component created successfully",
    component
  };
}

async function createLayoutPattern(context: any, layout: string, options: any): Promise<any> {
  const pattern = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const patternPath = path.join(context.projectPath, "patterns");
  
  // Create pattern directory
  await fs.mkdir(patternPath, { recursive: true });
  
  // Generate pattern files
  const extension = options.framework === "react" ? "tsx" : "vue";
  await fs.writeFile(
    path.join(patternPath, `${pattern.name}.${extension}`),
    pattern.code
  );
  
  // Generate styles
  await fs.writeFile(
    path.join(patternPath, `${pattern.name}.${options.styling}`),
    pattern.styles
  );
  
  // Generate documentation if requested
  if (options.generateDocs) {
    await fs.writeFile(
      path.join(patternPath, `${pattern.name}.md`),
      pattern.documentation
    );
  }
  
  return {
    success: true,
    message: "Layout pattern created successfully",
    pattern
  };
}

async function generateComponentSpec(context: any, layout: string, options: any): Promise<any> {
  const spec = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const specPath = path.join(context.projectPath, "specs", "components");
  
  // Create spec directory
  await fs.mkdir(specPath, { recursive: true });
  
  // Generate specification document
  await fs.writeFile(
    path.join(specPath, `${spec.name}-spec.md`),
    spec.documentation
  );
  
  return {
    success: true,
    message: "Component specification generated successfully",
    spec
  };
}

async function validateComponent(context: any, layout: string, options: any): Promise<any> {
  const validation = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation", "components");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, `${validation.name}-validation.md`),
    validation.report
  );
  
  return {
    success: true,
    message: "Component validation completed successfully",
    validation
  };
}

async function generateDocumentation(context: any, layout: string, options: any): Promise<any> {
  const documentation = JSON.parse(layout);
  
  const fs = require("fs").promises;
  const docsPath = path.join(context.projectPath, "docs", "components");
  
  // Create documentation directory
  await fs.mkdir(docsPath, { recursive: true });
  
  // Generate documentation files
  await fs.writeFile(
    path.join(docsPath, `${documentation.name}.md`),
    documentation.content
  );
  
  // Generate additional documentation assets if they exist
  if (documentation.assets) {
    const assetsPath = path.join(docsPath, "assets");
    await fs.mkdir(assetsPath, { recursive: true });
    
    for (const [name, content] of Object.entries(documentation.assets)) {
      await fs.writeFile(
        path.join(assetsPath, name),
        content as string
      );
    }
  }
  
  return {
    success: true,
    message: "Component documentation generated successfully",
    documentation
  };
} 