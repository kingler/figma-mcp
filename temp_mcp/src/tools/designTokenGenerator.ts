import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const designTokenGeneratorToolName = "mcp_design-token-generator";
export const designTokenGeneratorToolDescription = "Design Token Generator - Creates and manages design tokens, theme configurations, and styling systems.";

export const DesignTokenGeneratorToolSchema = z.object({
  action: z.enum([
    "generate_color_tokens",
    "generate_typography_tokens",
    "generate_spacing_tokens",
    "generate_animation_tokens",
    "generate_theme_config",
    "generate_css_variables",
    "generate_utility_classes",
    "validate_tokens"
  ]).describe("Design token action to perform"),
  context: z.object({
    projectPath: z.string().describe("Path to the project root"),
    tokens: z.object({
      colors: z.object({
        primary: z.record(z.string()).optional(),
        semantic: z.record(z.string()).optional(),
        custom: z.record(z.string()).optional()
      }).optional(),
      typography: z.object({
        fonts: z.record(z.string()).optional(),
        sizes: z.record(z.string()).optional(),
        weights: z.record(z.string()).optional()
      }).optional(),
      spacing: z.record(z.string()).optional(),
      animation: z.object({
        transitions: z.record(z.string()).optional(),
        keyframes: z.record(z.string()).optional()
      }).optional()
    }).optional(),
    framework: z.enum(["react", "next", "vue"]).optional(),
    styling: z.enum(["tailwind", "css", "scss"]).optional(),
    artifacts: z.array(z.string()).optional()
  }).describe("Token context"),
  options: z.object({
    format: z.enum(["js", "json", "css"]).default("js"),
    darkMode: z.boolean().default(true),
    cssVariables: z.boolean().default(true),
    utilityClasses: z.boolean().default(true),
    generateTypes: z.boolean().default(true)
  }).optional()
});

export async function runDesignTokenGeneratorTool(args: z.infer<typeof DesignTokenGeneratorToolSchema>) {
  const { action, context, options = {} } = args;
  
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get token context
    const tokenContext = await getTokenContext(context);
    
    const systemPrompt = `You are a Design Token Generator specializing in creating and managing design tokens.
    Your role is to create, document, and implement design tokens following design system best practices.
    Based on the provided context and target, perform the requested token action.`;

    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({
          action,
          tokenContext,
          options
        })}
      ],
    });

    const tokens = response.choices[0]?.message?.content;
    if (!tokens) {
      throw new Error("Failed to generate design tokens");
    }

    // Process token results
    switch (action) {
      case "generate_color_tokens":
        return await generateColorTokens(context, tokens, options);
      case "generate_typography_tokens":
        return await generateTypographyTokens(context, tokens, options);
      case "generate_spacing_tokens":
        return await generateSpacingTokens(context, tokens, options);
      case "generate_animation_tokens":
        return await generateAnimationTokens(context, tokens, options);
      case "generate_theme_config":
        return await generateThemeConfig(context, tokens, options);
      case "generate_css_variables":
        return await generateCSSVariables(context, tokens, options);
      case "generate_utility_classes":
        return await generateUtilityClasses(context, tokens, options);
      case "validate_tokens":
        return await validateTokens(context, tokens, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Design token operation failed: ${errorMessage}`
    };
  }
}

async function getTokenContext(context: any): Promise<any> {
  const fs = require("fs").promises;
  const tokenContext: any = { ...context };
  
  try {
    // Add additional context from artifacts
    if (context.artifacts?.length) {
      tokenContext.artifacts = {};
      for (const artifact of context.artifacts) {
        try {
          const content = await fs.readFile(artifact, "utf8");
          tokenContext.artifacts[artifact] = content;
        } catch (error) {
          console.warn(`Failed to read artifact: ${artifact}`, error);
        }
      }
    }
    
    return tokenContext;
  } catch (error) {
    console.warn("Failed to get complete token context:", error);
    return tokenContext;
  }
}

async function generateColorTokens(context: any, tokens: string, options: any): Promise<any> {
  const colorTokens = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const tokensPath = path.join(context.projectPath, "tokens");
  
  // Create tokens directory
  await fs.mkdir(tokensPath, { recursive: true });
  
  // Generate color token files
  await fs.writeFile(
    path.join(tokensPath, `colors.${options.format}`),
    colorTokens.code
  );
  
  // Generate types if requested
  if (options.generateTypes) {
    await fs.writeFile(
      path.join(tokensPath, "colors.d.ts"),
      colorTokens.types
    );
  }
  
  return {
    success: true,
    message: "Color tokens generated successfully",
    tokens: colorTokens
  };
}

async function generateTypographyTokens(context: any, tokens: string, options: any): Promise<any> {
  const typographyTokens = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const tokensPath = path.join(context.projectPath, "tokens");
  
  // Create tokens directory
  await fs.mkdir(tokensPath, { recursive: true });
  
  // Generate typography token files
  await fs.writeFile(
    path.join(tokensPath, `typography.${options.format}`),
    typographyTokens.code
  );
  
  // Generate types if requested
  if (options.generateTypes) {
    await fs.writeFile(
      path.join(tokensPath, "typography.d.ts"),
      typographyTokens.types
    );
  }
  
  return {
    success: true,
    message: "Typography tokens generated successfully",
    tokens: typographyTokens
  };
}

async function generateSpacingTokens(context: any, tokens: string, options: any): Promise<any> {
  const spacingTokens = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const tokensPath = path.join(context.projectPath, "tokens");
  
  // Create tokens directory
  await fs.mkdir(tokensPath, { recursive: true });
  
  // Generate spacing token files
  await fs.writeFile(
    path.join(tokensPath, `spacing.${options.format}`),
    spacingTokens.code
  );
  
  // Generate types if requested
  if (options.generateTypes) {
    await fs.writeFile(
      path.join(tokensPath, "spacing.d.ts"),
      spacingTokens.types
    );
  }
  
  return {
    success: true,
    message: "Spacing tokens generated successfully",
    tokens: spacingTokens
  };
}

async function generateAnimationTokens(context: any, tokens: string, options: any): Promise<any> {
  const animationTokens = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const tokensPath = path.join(context.projectPath, "tokens");
  
  // Create tokens directory
  await fs.mkdir(tokensPath, { recursive: true });
  
  // Generate animation token files
  await fs.writeFile(
    path.join(tokensPath, `animations.${options.format}`),
    animationTokens.code
  );
  
  // Generate types if requested
  if (options.generateTypes) {
    await fs.writeFile(
      path.join(tokensPath, "animations.d.ts"),
      animationTokens.types
    );
  }
  
  return {
    success: true,
    message: "Animation tokens generated successfully",
    tokens: animationTokens
  };
}

async function generateThemeConfig(context: any, tokens: string, options: any): Promise<any> {
  const themeConfig = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const configPath = path.join(context.projectPath, "config");
  
  // Create config directory
  await fs.mkdir(configPath, { recursive: true });
  
  // Generate theme configuration
  await fs.writeFile(
    path.join(configPath, `theme.config.${options.format}`),
    themeConfig.code
  );
  
  // Generate types if requested
  if (options.generateTypes) {
    await fs.writeFile(
      path.join(configPath, "theme.config.d.ts"),
      themeConfig.types
    );
  }
  
  return {
    success: true,
    message: "Theme configuration generated successfully",
    config: themeConfig
  };
}

async function generateCSSVariables(context: any, tokens: string, options: any): Promise<any> {
  const cssVariables = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const stylesPath = path.join(context.projectPath, "styles");
  
  // Create styles directory
  await fs.mkdir(stylesPath, { recursive: true });
  
  // Generate CSS variables
  await fs.writeFile(
    path.join(stylesPath, "variables.css"),
    cssVariables.code
  );
  
  return {
    success: true,
    message: "CSS variables generated successfully",
    variables: cssVariables
  };
}

async function generateUtilityClasses(context: any, tokens: string, options: any): Promise<any> {
  const utilityClasses = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const stylesPath = path.join(context.projectPath, "styles");
  
  // Create styles directory
  await fs.mkdir(stylesPath, { recursive: true });
  
  // Generate utility classes
  await fs.writeFile(
    path.join(stylesPath, "utilities.css"),
    utilityClasses.code
  );
  
  return {
    success: true,
    message: "Utility classes generated successfully",
    utilities: utilityClasses
  };
}

async function validateTokens(context: any, tokens: string, options: any): Promise<any> {
  const validation = JSON.parse(tokens);
  
  const fs = require("fs").promises;
  const validationPath = path.join(context.projectPath, "validation");
  
  // Create validation directory
  await fs.mkdir(validationPath, { recursive: true });
  
  // Generate validation report
  await fs.writeFile(
    path.join(validationPath, "tokens-validation.md"),
    validation.report
  );
  
  return {
    success: true,
    message: "Token validation completed successfully",
    validation
  };
} 