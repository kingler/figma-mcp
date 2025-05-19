import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// Define schema for components.json
export const componentsJsonSchema = z.object({
  $schema: z.string().optional(),
  style: z.union([z.literal('default'), z.literal('new-york')]),
  rsc: z.boolean().optional(),
  tsx: z.boolean().optional(),
  tailwind: z.object({
    config: z.string(),
    css: z.string(),
    baseColor: z.string(),
    cssVariables: z.boolean().optional(),
  }),
  aliases: z.record(z.string()).optional(),
});

// Define schema for component configuration
export const componentConfigSchema = z.object({
  name: z.string(),
  dependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })),
  type: z.string().optional(),
});

// Registry index schema
export const registryIndexSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  styles: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  items: z.array(z.object({
    name: z.string(),
    type: z.string(),
    dependencies: z.array(z.string()).optional(),
    registryDependencies: z.array(z.string()).optional(),
  })),
});

// Type for validation result
export type ValidationResult = {
  isValid: boolean;
  data: any | null;
  errors: string[] | null;
  path: string;
};

/**
 * Validates a components.json file against the schema
 * @param filePath Path to the components.json file
 * @returns Validation result with parsed data and any errors
 */
export async function validateComponentsJson(filePath: string): Promise<ValidationResult> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    const result = componentsJsonSchema.safeParse(jsonData);
    
    return {
      isValid: result.success,
      data: result.success ? result.data : null,
      errors: !result.success ? formatZodErrors(result.error) : null,
      path: filePath
    };
  } catch (error) {
    return {
      isValid: false,
      data: null,
      errors: [`File error: ${error instanceof Error ? error.message : String(error)}`],
      path: filePath
    };
  }
}

/**
 * Validates a component configuration against the schema
 * @param componentData Component configuration data
 * @returns Validation result
 */
export function validateComponent(componentData: unknown) {
  const result = componentConfigSchema.safeParse(componentData);
  
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    errors: !result.success ? formatZodErrors(result.error) : null
  };
}

/**
 * Validates a registry index against the schema
 * @param registryData Registry index data
 * @returns Validation result
 */
export function validateRegistryIndex(registryData: unknown) {
  const result = registryIndexSchema.safeParse(registryData);
  
  return {
    isValid: result.success,
    data: result.success ? result.data : null,
    errors: !result.success ? formatZodErrors(result.error) : null
  };
}

/**
 * Format Zod errors into a more readable format
 * @param error Zod error object
 * @returns Array of formatted error messages
 */
function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `${path ? `${path}: ` : ''}${err.message}`;
  });
}

/**
 * Checks if a project has a valid shadcn/ui setup
 * @param projectRoot Root directory of the project
 * @returns Validation result with details
 */
export async function validateProjectSetup(projectRoot: string) {
  const results = {
    componentsJson: {} as ValidationResult,
    tailwindConfig: {
      exists: false,
      path: '',
      isValid: false,
      errors: [] as string[]
    },
    cssFile: {
      exists: false,
      path: '',
      hasContents: false,
      errors: [] as string[]
    },
    componentsDir: {
      exists: false,
      path: '',
      components: [] as string[]
    }
  };
  
  // Check components.json
  const componentsJsonPath = path.join(projectRoot, 'components.json');
  try {
    results.componentsJson = await validateComponentsJson(componentsJsonPath);
  } catch (error) {
    results.componentsJson = {
      isValid: false,
      data: null,
      errors: [`Failed to read components.json: ${error instanceof Error ? error.message : String(error)}`],
      path: componentsJsonPath
    };
  }
  
  // If components.json is valid, check tailwind config
  if (results.componentsJson.isValid && results.componentsJson.data) {
    const tailwindConfigPath = path.join(projectRoot, results.componentsJson.data.tailwind.config);
    
    try {
      await fs.access(tailwindConfigPath);
      results.tailwindConfig.exists = true;
      results.tailwindConfig.path = tailwindConfigPath;
      results.tailwindConfig.isValid = true;
    } catch (error) {
      results.tailwindConfig.errors.push(`Tailwind config not found at ${tailwindConfigPath}`);
    }
    
    // Check CSS file
    const cssPath = path.join(projectRoot, results.componentsJson.data.tailwind.css);
    
    try {
      await fs.access(cssPath);
      results.cssFile.exists = true;
      results.cssFile.path = cssPath;
      
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      results.cssFile.hasContents = cssContent.length > 0;
      
      // Basic check for tailwind directives
      if (!cssContent.includes('@tailwind')) {
        results.cssFile.errors.push('CSS file does not contain @tailwind directives');
      }
    } catch (error) {
      results.cssFile.errors.push(`CSS file not found at ${cssPath}`);
    }
    
    // Check components directory
    const componentsPath = path.join(projectRoot, 'components/ui');
    
    try {
      await fs.access(componentsPath);
      results.componentsDir.exists = true;
      results.componentsDir.path = componentsPath;
      
      const files = await fs.readdir(componentsPath);
      results.componentsDir.components = files.filter(file => 
        file.endsWith('.tsx') || file.endsWith('.jsx')
      );
    } catch (error) {
      // Components directory might not exist yet, that's fine
    }
  }
  
  return results;
} 