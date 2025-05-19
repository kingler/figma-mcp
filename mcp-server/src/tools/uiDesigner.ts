import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys.js";
import * as path from "path";

export const uiDesignerToolName = "mcp_ui-designer";
export const uiDesignerToolDescription = "UI Designer Agent - Creates visual designs, components, and manages design systems.";

export const UIDesignerToolSchema = z.object({
  action: z.enum([
    "create_visual_design",
    "design_component",
    "update_design_system",
    "generate_assets",
    "create_theme",
    "validate_design",
    "export_specs"
  ]).describe("UI design action to perform"),
  targetPath: z.string().describe("Path to target file or directory"),
  context: z.object({
    projectPath: z.string(),
    phase: z.enum([
      "concept",
      "design",
      "implementation",
      "review"
    ]),
    artifacts: z.array(z.string()).optional()
  }).describe("Design context"),
  options: z.object({
    format: z.enum([
      "figma",
      "sketch",
      "xd",
      "web",
      "react"
    ]).optional(),
    theme: z.enum([
      "light",
      "dark",
      "system"
    ]).optional().default("light"),
    generateAssets: z.boolean().optional().default(true),
    includeVariants: z.boolean().optional().default(true)
  }).optional()
});

export async function runUIDesignerTool(args: z.infer<typeof UIDesignerToolSchema>) {
  const { action, targetPath, context, options = {} } = args;
  
  try {
    // Use OpenAI for UI design decisions
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Get design context
    const designContext = await getDesignContext(targetPath, context);
    
    const systemPrompt = `You are a UI Designer specializing in visual design, component creation, and design system management.
    Your role is to create beautiful and consistent user interfaces based on design requirements and brand guidelines.
    Based on the provided context and target, perform the requested UI design action.`;

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

    // Process UI design results
    switch (action) {
      case "create_visual_design":
        return await createVisualDesign(targetPath, design, options);
      case "design_component":
        return await designComponent(targetPath, design, options);
      case "update_design_system":
        return await updateDesignSystem(targetPath, design, options);
      case "generate_assets":
        return await generateAssets(targetPath, design, options);
      case "create_theme":
        return await createTheme(targetPath, design, options);
      case "validate_design":
        return await validateDesign(targetPath, design, options);
      case "export_specs":
        return await exportSpecs(targetPath, design, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `UI Designer operation failed: ${errorMessage}`
    };
  }
}

async function getDesignContext(targetPath: string, context: any): Promise<any> {
  const fs = require("fs").promises;
  const designContext: any = { ...context };
  
  try {
    // Read target content
    const stats = await fs.stat(targetPath);
    if (stats.isFile()) {
      designContext.content = await fs.readFile(targetPath, "utf8");
    } else if (stats.isDirectory()) {
      designContext.files = await fs.readdir(targetPath);
    }
    
    // Add additional context from .context directory
    const projectContextPath = path.join(context.projectPath, ".context");
    if (context.artifacts?.length) {
      designContext.artifacts = {};
      for (const artifact of context.artifacts) {
        const artifactPath = path.join(projectContextPath, artifact);
        try {
          const content = await fs.readFile(artifactPath, "utf8");
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

async function createVisualDesign(targetPath: string, design: string, options: any): Promise<any> {
  const visualDesign = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateVisualDesignSpec(visualDesign));
  }
  
  return {
    success: true,
    message: "Visual design created successfully",
    design: visualDesign
  };
}

async function designComponent(targetPath: string, design: string, options: any): Promise<any> {
  const component = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateComponentSpec(component));
  }
  
  return {
    success: true,
    message: "Component designed successfully",
    component
  };
}

async function updateDesignSystem(targetPath: string, design: string, options: any): Promise<any> {
  const designSystem = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateDesignSystemDoc(designSystem));
  }
  
  return {
    success: true,
    message: "Design system updated successfully",
    designSystem
  };
}

async function generateAssets(targetPath: string, design: string, options: any): Promise<any> {
  const assets = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateAssetManifest(assets));
  }
  
  return {
    success: true,
    message: "Assets generated successfully",
    assets
  };
}

async function createTheme(targetPath: string, design: string, options: any): Promise<any> {
  const theme = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateThemeSpec(theme));
  }
  
  return {
    success: true,
    message: "Theme created successfully",
    theme
  };
}

async function validateDesign(targetPath: string, design: string, options: any): Promise<any> {
  const validation = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateValidationReport(validation));
  }
  
  return {
    success: true,
    message: "Design validation completed successfully",
    validation
  };
}

async function exportSpecs(targetPath: string, design: string, options: any): Promise<any> {
  const specs = JSON.parse(design);
  
  if (options.generateAssets) {
    const fs = require("fs").promises;
    await fs.writeFile(targetPath, generateDesignSpecs(specs));
  }
  
  return {
    success: true,
    message: "Design specs exported successfully",
    specs
  };
}

function generateVisualDesignSpec(design: any): string {
  return `# Visual Design Specification

## Overview
${design.overview}

## Color Palette
${design.colors.map((color: any) => `
### ${color.name}
- Hex: ${color.hex}
- RGB: ${color.rgb}
- Usage: ${color.usage}
${color.variants ? `- Variants: ${color.variants.map((v: any) => `\n  - ${v.name}: ${v.hex}`).join('')}` : ''}
`).join('\n')}

## Typography
${design.typography.map((font: any) => `
### ${font.name}
- Family: ${font.family}
- Weights: ${font.weights.join(', ')}
- Sizes: ${font.sizes.map((size: any) => `\n  - ${size.name}: ${size.value}`).join('')}
- Usage: ${font.usage}
`).join('\n')}

## Spacing System
${design.spacing.map((space: any) => `
### ${space.name}
- Value: ${space.value}
- Usage: ${space.usage}
`).join('\n')}

## Visual Elements
${design.elements.map((element: any) => `
### ${element.name}
${element.description}
- Style: ${element.style}
- Usage: ${element.usage}
`).join('\n')}
`;
}

function generateComponentSpec(component: any): string {
  return `# Component Design Specification

## Overview
${component.overview}

## Visual Properties
- Name: ${component.name}
- Type: ${component.type}
- Description: ${component.description}

## Variants
${component.variants.map((variant: any) => `
### ${variant.name}
${variant.description}
- Props: ${variant.props.map((prop: any) => `\n  - ${prop.name}: ${prop.type} (${prop.description})`).join('')}
- States: ${variant.states.map((state: any) => `\n  - ${state.name}: ${state.description}`).join('')}
`).join('\n')}

## Styling
${component.styling.map((style: any) => `
### ${style.category}
${style.properties.map((prop: any) => `- ${prop.name}: ${prop.value}`).join('\n')}
`).join('\n')}

## Behavior
${component.behavior.map((behavior: any) => `
### ${behavior.name}
- Trigger: ${behavior.trigger}
- Action: ${behavior.action}
- Animation: ${behavior.animation || 'None'}
`).join('\n')}

## Accessibility
${component.accessibility.map((item: string) => `- ${item}`).join('\n')}
`;
}

function generateDesignSystemDoc(system: any): string {
  return `# Design System Documentation

## Overview
${system.overview}

## Core Principles
${system.principles.map((principle: string) => `- ${principle}`).join('\n')}

## Components
${system.components.map((component: any) => `
### ${component.name}
${component.description}
- Category: ${component.category}
- Status: ${component.status}
- Usage: ${component.usage}
- Props: ${component.props.map((prop: any) => `\n  - ${prop.name}: ${prop.type}`).join('')}
`).join('\n')}

## Patterns
${system.patterns.map((pattern: any) => `
### ${pattern.name}
${pattern.description}
- Use Case: ${pattern.useCase}
- Examples: ${pattern.examples.join(', ')}
`).join('\n')}

## Updates
${system.updates.map((update: any) => `
### ${update.version} (${update.date})
${update.changes.map((change: string) => `- ${change}`).join('\n')}
`).join('\n')}
`;
}

function generateAssetManifest(assets: any): string {
  return `# Asset Manifest

## Icons
${assets.icons.map((icon: any) => `
### ${icon.name}
- File: ${icon.file}
- Sizes: ${icon.sizes.join(', ')}
- Formats: ${icon.formats.join(', ')}
`).join('\n')}

## Images
${assets.images.map((image: any) => `
### ${image.name}
- File: ${image.file}
- Dimensions: ${image.dimensions}
- Format: ${image.format}
- Usage: ${image.usage}
`).join('\n')}

## Illustrations
${assets.illustrations.map((illustration: any) => `
### ${illustration.name}
- File: ${illustration.file}
- Style: ${illustration.style}
- Usage: ${illustration.usage}
`).join('\n')}
`;
}

function generateThemeSpec(theme: any): string {
  return `# Theme Specification

## Overview
${theme.overview}

## Color Scheme
${theme.colors.map((color: any) => `
### ${color.name}
- Light: ${color.light}
- Dark: ${color.dark}
- Usage: ${color.usage}
`).join('\n')}

## Typography
${theme.typography.map((type: any) => `
### ${type.element}
- Font: ${type.font}
- Size: ${type.size}
- Weight: ${type.weight}
- Line Height: ${type.lineHeight}
`).join('\n')}

## Spacing
${theme.spacing.map((space: any) => `
### ${space.name}
- Value: ${space.value}
- Usage: ${space.usage}
`).join('\n')}

## Effects
${theme.effects.map((effect: any) => `
### ${effect.name}
- Type: ${effect.type}
- Values: ${effect.values}
- Usage: ${effect.usage}
`).join('\n')}
`;
}

function generateValidationReport(validation: any): string {
  return `# Design Validation Report

## Overview
${validation.overview}

## Consistency Check
${validation.consistency.map((check: any) => `
### ${check.category}
- Status: ${check.status}
- Issues: ${check.issues.map((issue: string) => `\n  - ${issue}`).join('')}
- Recommendations: ${check.recommendations.map((rec: string) => `\n  - ${rec}`).join('')}
`).join('\n')}

## Accessibility Audit
${validation.accessibility.map((audit: any) => `
### ${audit.criterion}
- Status: ${audit.status}
- WCAG Level: ${audit.wcagLevel}
- Issues: ${audit.issues.map((issue: string) => `\n  - ${issue}`).join('')}
`).join('\n')}

## Brand Alignment
${validation.brandAlignment.map((item: any) => `
### ${item.element}
- Status: ${item.status}
- Notes: ${item.notes}
`).join('\n')}

## Recommendations
${validation.recommendations.map((rec: any) => `
### ${rec.priority}. ${rec.title}
${rec.description}
- Impact: ${rec.impact}
- Effort: ${rec.effort}
`).join('\n')}
`;
}

function generateDesignSpecs(specs: any): string {
  return `# Design Specifications Export

## Overview
${specs.overview}

## Components
${specs.components.map((component: any) => `
### ${component.name}
${component.description}

#### Measurements
${component.measurements.map((measurement: any) => `- ${measurement.name}: ${measurement.value}`).join('\n')}

#### Styles
${component.styles.map((style: any) => `- ${style.property}: ${style.value}`).join('\n')}

#### Assets
${component.assets.map((asset: any) => `- ${asset.name}: ${asset.path}`).join('\n')}
`).join('\n')}

## Layout
${specs.layout.map((section: any) => `
### ${section.name}
- Grid: ${section.grid}
- Margins: ${section.margins}
- Padding: ${section.padding}
- Breakpoints: ${section.breakpoints.join(', ')}
`).join('\n')}

## Assets
${specs.assets.map((asset: any) => `
### ${asset.name}
- Type: ${asset.type}
- Location: ${asset.location}
- Format: ${asset.format}
- Dimensions: ${asset.dimensions}
`).join('\n')}
`;
} 