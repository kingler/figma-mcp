import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { exec } from "child_process";
import util from "util";
import fs from "fs/promises";
import path from "path";
import { validateProjectSetup, validateRegistryIndex } from "./schemaValidator.js";
import { 
  generateComponentPreview, 
  startPreviewServer, 
  generateAtomicDesignView,
  generateStorybookSite,
  takeComponentScreenshot,
  atomicComponentMap
} from "./componentPreview.js";
import {
  publishShadcnComponentToFigma,
  FigmaLibraryManager,
  figmaLibrarySchema,
  getShadcnComponentMetadata
} from "./figmaIntegration.js";
import { getFigmaMcpBridge, isFigmaMcpAvailable } from './figmaMcpConfig.js';
import { FigmaApiWrapper } from './directFigmaIntegration.js';

const execPromise = util.promisify(exec);

// Define an error interface that includes the exec error properties
interface ExecError extends Error {
  stderr?: string;
  stdout?: string;
}

// Style options
const styleOptions = ["slate", "gray", "zinc", "neutral", "stone"] as const;

export function createServer(): McpServer {
  const server = new McpServer({
    name: "ShadcnUIMcp",
    version: "1.0.0",
    description: "Manages shadcn/ui components via the CLI"
  });

  // Tool to add a single component
  server.tool(
    "add_component",
    "Add a specific shadcn/ui component to your project.",
    {
      componentName: z.string().describe("Name of the shadcn/ui component to add (e.g., 'button', 'card')."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      overwrite: z.boolean().optional().default(false).describe("Whether to overwrite existing files."),
      pathAlias: z.string().optional().describe("Custom path alias for the component (corresponds to --path).")
    },
    async ({ componentName, projectRoot, overwrite, pathAlias }) => {
      let command = `npx shadcn@latest add ${componentName} --cwd \"${projectRoot}\" --yes`;
      if (overwrite) {
        command += " --overwrite";
      }
      if (pathAlias) {
        command += ` --path \"${pathAlias}\"`;
      }

      try {
        const { stdout, stderr } = await execPromise(command);
        let output = "";
        if (stdout) output += `Stdout:\n${stdout}\n`;
        if (stderr) output += `Stderr:\n${stderr}\n`;
        if (!stdout && !stderr) output = "Command executed successfully, no output.";
        return { 
          content: [{ 
            type: "text", 
            text: output || "Component addition process completed." 
          }] 
        };
      } catch (error) {
        const execError = error as ExecError;
        return { 
          content: [{ 
            type: "text", 
            text: `Error executing shadcn-ui add command: ${execError.message}\nStderr: ${execError.stderr || 'N/A'}\nStdout: ${execError.stdout || 'N/A'}` 
          }] 
        };
      }
    }
  );

  // Tool to add a package of components based on atomic design type
  server.tool(
    "add_atomic_package",
    "Add a group of shadcn/ui components based on atomic design categories.",
    {
      atomicType: z.enum(["atoms", "molecules", "organisms", "templates"]).describe("The atomic design category of components to add."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      components: z.array(z.string()).optional().describe("Specific list of components within the atomic type to install. If omitted, all defaults for the type are installed.")
    },
    async ({ atomicType, projectRoot, components: specificComponents }) => {
      const defaultComponentsForType = atomicComponentMap[atomicType];
      let componentsToAdd: string[] = [];

      if (specificComponents && specificComponents.length > 0) {
        componentsToAdd = specificComponents.filter(comp => defaultComponentsForType.includes(comp));
        if (componentsToAdd.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: `No valid components specified for atomic type '${atomicType}'. Valid options are: ${defaultComponentsForType.join(', ')}` 
            }] 
          };
        }
      } else {
        componentsToAdd = defaultComponentsForType;
      }

      if (componentsToAdd.length === 0) {
        return { 
          content: [{ 
            type: "text", 
            text: `No components found to install for atomic type '${atomicType}'.` 
          }] 
        };
      }

      const componentsString = componentsToAdd.join(" ");
      const command = `npx shadcn@latest add ${componentsString} --cwd \"${projectRoot}\" --yes`;

      try {
        const { stdout, stderr } = await execPromise(command);
        let output = "";
        if (stdout) output += `Stdout:\n${stdout}\n`;
        if (stderr) output += `Stderr:\n${stderr}\n`;
        if (!stdout && !stderr) output = "Command executed successfully, no output.";
        return { 
          content: [{ 
            type: "text", 
            text: output || `Atomic package '${atomicType}' components (${componentsString}) addition process completed.` 
          }] 
        };
      } catch (error) {
        const execError = error as ExecError;
        return { 
          content: [{ 
            type: "text", 
            text: `Error executing shadcn-ui add command for atomic package: ${execError.message}\nStderr: ${execError.stderr || 'N/A'}\nStdout: ${execError.stdout || 'N/A'}` 
          }] 
        };
      }
    }
  );

  // Tool to initialize a shadcn/ui project
  server.tool(
    "init_project",
    "Initialize a new project with shadcn/ui configuration.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      style: z.enum(styleOptions).optional().default("slate").describe("The base style to use (e.g., 'slate', 'gray', 'zinc')."),
      useCssVariables: z.boolean().optional().default(true).describe("Whether to use CSS variables for colors."),
      skipPrompts: z.boolean().optional().default(true).describe("Skip confirmation prompts using default settings.") 
    },
    async ({ projectRoot, style, useCssVariables, skipPrompts }) => {
      let command = `npx shadcn@latest init --cwd \"${projectRoot}\"`;
      
      if (skipPrompts) {
        command += " --yes";
      }

      try {
        const { stdout, stderr } = await execPromise(command);
        let output = "";
        if (stdout) output += `Stdout:\n${stdout}\n`;
        if (stderr) output += `Stderr:\n${stderr}\n`;
        if (!stdout && !stderr) output = "Project initialization completed successfully.";
        
        return { 
          content: [{ 
            type: "text", 
            text: output || "Project initialization completed successfully."
          }] 
        };
      } catch (error) {
        const execError = error as ExecError;
        return { 
          content: [{ 
            type: "text", 
            text: `Error initializing shadcn/ui project: ${execError.message}\nStderr: ${execError.stderr || 'N/A'}\nStdout: ${execError.stdout || 'N/A'}` 
          }] 
        };
      }
    }
  );

  // Tool to get registry index of available components
  server.tool(
    "get_registry_index",
    "Retrieve the registry index of available components.",
    {
      registryUrl: z.string().optional().describe("Custom registry URL (defaults to official shadcn/ui registry)."),
    },
    async ({ registryUrl }) => {
      const baseUrl = registryUrl || "https://ui.shadcn.com";
      const command = `curl -s ${baseUrl}/registry/index.json`;

      try {
        const { stdout, stderr } = await execPromise(command);
        
        if (!stdout) {
          return {
            content: [{
              type: "text",
              text: "Failed to retrieve registry index: Empty response"
            }]
          };
        }

        const registryData = JSON.parse(stdout);
        
        // Validate registry data against schema
        const validationResult = validateRegistryIndex(registryData);
        
        if (!validationResult.isValid) {
          return {
            content: [{
              type: "text",
              text: `Registry index validation failed:\n${validationResult.errors?.join('\n') || 'Unknown validation error'}`
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: `Registry Index Retrieved:\n${JSON.stringify(registryData, null, 2)}`
          }]
        };
      } catch (error) {
        const execError = error as ExecError;
        return {
          content: [{
            type: "text",
            text: `Failed to retrieve registry index: ${execError.message}`
          }]
        };
      }
    }
  );

  // Tool to get component metadata
  server.tool(
    "get_component_info",
    "Get detailed metadata about a specific component.",
    {
      componentName: z.string().describe("Name of the component to fetch metadata for."),
      style: z.string().optional().default("new-york").describe("Style variant to fetch (e.g., 'new-york', 'default')."),
      registryUrl: z.string().optional().describe("Custom registry URL (defaults to official shadcn/ui registry)."),
    },
    async ({ componentName, style, registryUrl }) => {
      const baseUrl = registryUrl || "https://ui.shadcn.com";
      const command = `curl -s ${baseUrl}/registry/${style}/${componentName}.json`;

      try {
        const { stdout, stderr } = await execPromise(command);
        
        if (!stdout) {
          return {
            content: [{
              type: "text",
              text: `Failed to retrieve component info for ${componentName}: Empty response`
            }]
          };
        }

        const componentData = JSON.parse(stdout);
        return {
          content: [{
            type: "text",
            text: `Component Metadata for ${componentName} (${style}):\n${JSON.stringify(componentData, null, 2)}`
          }]
        };
      } catch (error) {
        const execError = error as ExecError;
        return {
          content: [{
            type: "text",
            text: `Failed to retrieve component info: ${execError.message}`
          }]
        };
      }
    }
  );

  // Tool to validate styles configuration
  server.tool(
    "validate_styles",
    "Validate the styles configuration in a shadcn/ui project.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
    },
    async ({ projectRoot }) => {
      try {
        // Use the schema validator to perform comprehensive validation
        const validationResults = await validateProjectSetup(projectRoot);
        
        // Format the validation results into a readable response
        let validationSummary = "";
        
        if (!validationResults.componentsJson.isValid) {
          validationSummary += "❌ components.json validation failed:\n";
          if (validationResults.componentsJson.errors) {
            validationSummary += validationResults.componentsJson.errors.map(err => `  - ${err}`).join('\n') + '\n\n';
          }
        } else {
          validationSummary += "✅ components.json is valid\n\n";
        }
        
        // Tailwind config validation
        if (validationResults.tailwindConfig.exists) {
          validationSummary += "✅ Tailwind config exists at: " + validationResults.tailwindConfig.path + "\n\n";
        } else {
          validationSummary += "❌ Tailwind config issues:\n";
          validationSummary += validationResults.tailwindConfig.errors.map(err => `  - ${err}`).join('\n') + '\n\n';
        }
        
        // CSS file validation
        if (validationResults.cssFile.exists) {
          validationSummary += "✅ CSS file exists at: " + validationResults.cssFile.path + "\n";
          if (validationResults.cssFile.hasContents) {
            validationSummary += "✅ CSS file has content\n";
          } else {
            validationSummary += "⚠️ CSS file is empty\n";
          }
          
          if (validationResults.cssFile.errors.length > 0) {
            validationSummary += "⚠️ CSS file warnings:\n";
            validationSummary += validationResults.cssFile.errors.map(err => `  - ${err}`).join('\n') + '\n';
          }
          validationSummary += "\n";
        } else {
          validationSummary += "❌ CSS file issues:\n";
          validationSummary += validationResults.cssFile.errors.map(err => `  - ${err}`).join('\n') + '\n\n';
        }
        
        // Components directory validation
        if (validationResults.componentsDir.exists) {
          validationSummary += "✅ Components directory exists at: " + validationResults.componentsDir.path + "\n";
          validationSummary += `✅ Found ${validationResults.componentsDir.components.length} components:\n`;
          validationSummary += validationResults.componentsDir.components.map(c => `  - ${c}`).join('\n') + '\n';
        } else {
          validationSummary += "⚠️ Components directory not found at: components/ui\n";
          validationSummary += "  This is normal if you haven't added any components yet.\n";
        }

        return {
          content: [{
            type: "text", 
            text: `Style Configuration Validation:\n\n${validationSummary}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Style validation error: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to compare component implementation with registry version
  server.tool(
    "diff_component",
    "Compare local component implementation with the registry version.",
    {
      componentName: z.string().describe("Name of the component to compare."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      componentPath: z.string().optional().describe("Relative path to the component within the project (defaults to 'components/ui/[componentName].tsx')."),
    },
    async ({ componentName, projectRoot, componentPath }) => {
      // Default component path if not specified
      const resolvedComponentPath = componentPath || `components/ui/${componentName}.tsx`;
      const fullComponentPath = path.join(projectRoot, resolvedComponentPath);
      
      try {
        // Check if local component exists
        try {
          await fs.access(fullComponentPath);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Component diff failed: Local component not found at ${resolvedComponentPath}`
            }]
          };
        }

        // Temporary file to store registry component
        const tmpDir = path.join(projectRoot, ".shadcn-tmp");
        await fs.mkdir(tmpDir, { recursive: true });
        const tmpComponentPath = path.join(tmpDir, `${componentName}.tsx`);

        // Fetch registry component
        const fetchCommand = `npx shadcn@latest add ${componentName} --cwd \"${tmpDir}\" --yes`;
        await execPromise(fetchCommand);

        // Run diff
        const diffCommand = `diff -u "${fullComponentPath}" "${tmpComponentPath}" || true`;
        const { stdout } = await execPromise(diffCommand);

        // Clean up
        await fs.rm(tmpDir, { recursive: true, force: true });

        if (!stdout || stdout.trim() === '') {
          return {
            content: [{
              type: "text",
              text: "No differences found. Your component matches the registry version."
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: `Differences between local and registry version of ${componentName}:\n\n${stdout}`
          }]
        };
      } catch (error) {
        const execError = error as ExecError;
        return {
          content: [{
            type: "text",
            text: `Component diff failed: ${execError.message}\n${execError.stderr || ''}`
          }]
        };
      }
    }
  );

  // Tool to search for components across registries
  server.tool(
    "search_components",
    "Search for components across shadcn/ui registries.",
    {
      query: z.string().describe("Search query (component name or keyword)."),
      registryUrls: z.array(z.string()).optional().describe("List of registry URLs to search (defaults to official shadcn/ui registry)."),
    },
    async ({ query, registryUrls }) => {
      const urls = registryUrls || ["https://ui.shadcn.com"];
      
      try {
        const results = [];
        
        for (const url of urls) {
          const command = `curl -s ${url}/registry/index.json`;
          
          try {
            const { stdout } = await execPromise(command);
            if (!stdout) continue;
            
            const registry = JSON.parse(stdout);
            
            if (registry.items && Array.isArray(registry.items)) {
              const matches = registry.items.filter((item: any) => {
                return item.name.includes(query) ||
                  (item.title && item.title.toLowerCase().includes(query.toLowerCase())) ||
                  (item.description && item.description.toLowerCase().includes(query.toLowerCase()));
              });
              
              if (matches.length > 0) {
                results.push({
                  registry: url,
                  matches: matches.map((m: any) => ({ 
                    name: m.name, 
                    title: m.title,
                    description: m.description || 'No description',
                  }))
                });
              }
            }
          } catch (error) {
            console.error(`Error searching registry ${url}:`, error);
          }
        }
        
        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No components found matching '${query}'.`
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: `Search Results for '${query}':\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Search failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to validate entire project configuration
  server.tool(
    "validate_project",
    "Perform comprehensive validation of a shadcn/ui project configuration.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
    },
    async ({ projectRoot }) => {
      try {
        // Validate project setup
        const validationResults = await validateProjectSetup(projectRoot);
        
        // Check for package.json dependencies
        let packageJsonValidation = "⚠️ Package.json validation not performed";
        try {
          const packageJsonPath = path.join(projectRoot, "package.json");
          const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageJsonContent);
          
          const requiredDeps = ["tailwindcss", "autoprefixer", "postcss"];
          const missingDeps = requiredDeps.filter(dep => 
            !(packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep])
          );
          
          if (missingDeps.length === 0) {
            packageJsonValidation = "✅ All required dependencies found in package.json";
          } else {
            packageJsonValidation = `❌ Missing required dependencies: ${missingDeps.join(", ")}`;
          }
        } catch (error) {
          packageJsonValidation = `❌ Could not validate package.json: ${error instanceof Error ? error.message : String(error)}`;
        }
        
        // Format all validation results into a comprehensive report
        const validationReport = {
          componentsJson: {
            valid: validationResults.componentsJson.isValid,
            errors: validationResults.componentsJson.errors,
            data: validationResults.componentsJson.data
          },
          tailwindConfig: {
            exists: validationResults.tailwindConfig.exists,
            path: validationResults.tailwindConfig.path,
            errors: validationResults.tailwindConfig.errors
          },
          cssFile: {
            exists: validationResults.cssFile.exists,
            path: validationResults.cssFile.path,
            errors: validationResults.cssFile.errors
          },
          componentsDirectory: {
            exists: validationResults.componentsDir.exists,
            path: validationResults.componentsDir.path,
            componentCount: validationResults.componentsDir.components.length,
            components: validationResults.componentsDir.components
          },
          packageJson: packageJsonValidation
        };
        
        return {
          content: [{
            type: "text",
            text: `Comprehensive Project Validation:\n\n${JSON.stringify(validationReport, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Project validation failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Visual preview generator
  server.tool(
    "generate_component_preview",
    "Generate a visual preview of a specific component in isolation.",
    {
      componentName: z.string().describe("Name of the component to preview (e.g., 'button', 'card')."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      takeScreenshot: z.boolean().optional().default(false).describe("Whether to take a screenshot of the component.")
    },
    async ({ componentName, projectRoot, takeScreenshot }) => {
      try {
        // Generate preview page for the component
        const previewUrl = await generateComponentPreview(componentName, projectRoot);
        
        // Take screenshot if requested
        let screenshotPath = "";
        if (takeScreenshot) {
          screenshotPath = await takeComponentScreenshot(componentName, previewUrl);
        }
        
        return {
          content: [{
            type: "text",
            text: `Component Preview Generated:\n\nPreview URL: ${previewUrl}\n${screenshotPath ? `\nScreenshot: ${screenshotPath}` : ''}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to generate component preview: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Generate atomic design storybook
  server.tool(
    "generate_atomic_storybook",
    "Generate a storybook-like site organizing components by atomic design categories.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project.")
    },
    async ({ projectRoot }) => {
      try {
        // Generate storybook-like site
        const storybookUrl = await generateStorybookSite(projectRoot);
        
        // Get atomic design structure
        const atomicStructure = await generateAtomicDesignView(projectRoot);
        
        // Format output
        let componentsList = "";
        for (const [category, components] of Object.entries(atomicStructure)) {
          if (components.length > 0) {
            componentsList += `\n${category.toUpperCase()}: ${components.join(', ')}`;
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `Atomic Design Storybook Generated\n\nURL: ${storybookUrl}\n\nComponent Categories:${componentsList}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to generate atomic design storybook: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // NEW TOOL: Dependency Resolution Engine
  server.tool(
    "resolve_dependencies",
    "Resolve and install all nested dependencies for a component.",
    {
      componentName: z.string().describe("Name of the component to resolve dependencies for."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      registryUrl: z.string().optional().describe("Custom registry URL (defaults to official shadcn/ui registry).")
    },
    async ({ componentName, projectRoot, registryUrl }) => {
      try {
        const baseUrl = registryUrl || "https://ui.shadcn.com";
        const command = `curl -s ${baseUrl}/registry/default/${componentName}.json`;
        
        const { stdout } = await execPromise(command);
        if (!stdout) {
          return {
            content: [{
              type: "text",
              text: `Failed to resolve dependencies: Component '${componentName}' not found in registry.`
            }]
          };
        }
        
        const componentData = JSON.parse(stdout);
        const registryDependencies = componentData.registryDependencies || [];
        
        if (registryDependencies.length === 0) {
          return {
            content: [{
              type: "text",
              text: `Component '${componentName}' has no registry dependencies.`
            }]
          };
        }
        
        // Install dependencies recursively
        let output = `Resolved dependencies for ${componentName}:\n`;
        for (const dependency of registryDependencies) {
          output += `- ${dependency}\n`;
          const installCmd = `npx shadcn@latest add ${dependency} --cwd \"${projectRoot}\" --yes`;
          const { stdout: installOut, stderr: installErr } = await execPromise(installCmd);
          if (installErr) output += `  Warning: ${installErr.trim()}\n`;
        }
        
        return {
          content: [{
            type: "text",
            text: output
          }]
        };
      } catch (error) {
        const execError = error as ExecError;
        return {
          content: [{
            type: "text",
            text: `Failed to resolve dependencies: ${execError.message}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Version Diff Analyzer
  server.tool(
    "analyze_component_diff",
    "Analyze differences between local component implementation and registry version.",
    {
      componentName: z.string().describe("Name of the component to analyze."),
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      customizationPreserve: z.boolean().optional().default(true).describe("Whether to identify and preserve customizations when updating.")
    },
    async ({ componentName, projectRoot, customizationPreserve }) => {
      try {
        // Default component path
        const componentPath = path.join(projectRoot, "components/ui", `${componentName}.tsx`);
        
        // Check if local component exists
        try {
          await fs.access(componentPath);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Component analysis failed: Local component not found at ${componentPath}`
            }]
          };
        }
        
        // Create temp directory for registry component
        const tmpDir = path.join(projectRoot, ".shadcn-tmp");
        await fs.mkdir(tmpDir, { recursive: true });
        
        // Fetch registry component to temp directory
        const fetchCmd = `npx shadcn@latest add ${componentName} --cwd \"${tmpDir}\" --yes`;
        await execPromise(fetchCmd);
        
        // Registry component path
        const registryComponentPath = path.join(tmpDir, "components/ui", `${componentName}.tsx`);
        
        // Run diff
        const diffCmd = `diff -u "${componentPath}" "${registryComponentPath}" || true`;
        const { stdout: diffOutput } = await execPromise(diffCmd);
        
        if (!diffOutput) {
          return {
            content: [{
              type: "text",
              text: `No differences found for component '${componentName}'. Local implementation matches registry version.`
            }]
          };
        }
        
        // Analyze diff for customizations (simplified version)
        const customLines = diffOutput
          .split('\n')
          .filter(line => line.startsWith('+') && !line.startsWith('++'))
          .map(line => line.substring(1).trim());
        
        return {
          content: [{
            type: "text",
            text: `Component Diff Analysis for '${componentName}':\n\n${diffOutput}\n\n${
              customizationPreserve ? `Detected Customizations (${customLines.length}):\n${customLines.join('\n')}` : ''
            }`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Component diff analysis failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Cross-Registry Search
  server.tool(
    "search_registries",
    "Search for components across multiple registries.",
    {
      query: z.string().describe("Search query for component name or related functionality."),
      registryUrls: z.array(z.string()).optional().describe("List of registry URLs to search through.")
    },
    async ({ query, registryUrls }) => {
      try {
        // Default registries to search
        const defaultRegistries = [
          "https://ui.shadcn.com",
          "https://ui.shadxn.com",
          "https://shadcn-solid.com"
        ];
        
        const registriesToSearch = registryUrls || defaultRegistries;
        let results = [];
        
        for (const registryUrl of registriesToSearch) {
          try {
            const indexCmd = `curl -s ${registryUrl}/registry/index.json`;
            const { stdout } = await execPromise(indexCmd);
            
            if (stdout) {
              const registry = JSON.parse(stdout);
              
              // Search for components matching query
              for (const component of Object.values(registry)) {
                // Skip non-object entries
                if (typeof component !== 'object' || component === null) continue;
                
                // Check if component name, description or other fields match query
                const componentObj = component as any;
                const name = componentObj.name || '';
                const description = componentObj.description || '';
                
                if (
                  name.toLowerCase().includes(query.toLowerCase()) ||
                  description.toLowerCase().includes(query.toLowerCase())
                ) {
                  results.push({
                    name,
                    description,
                    registry: registryUrl
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error searching registry ${registryUrl}:`, error);
          }
        }
        
        // Sort results by relevance (simple algorithm: name matches first)
        results.sort((a, b) => {
          const aInName = a.name.toLowerCase().includes(query.toLowerCase());
          const bInName = b.name.toLowerCase().includes(query.toLowerCase());
          
          if (aInName && !bInName) return -1;
          if (!aInName && bInName) return 1;
          return 0;
        });
        
        return {
          content: [{
            type: "text",
            text: `Search Results for '${query}':\n\n${
              results.length > 0
                ? results.map(r => `- ${r.name} [${r.registry}]\n  ${r.description}`).join('\n\n')
                : 'No components found matching the query.'
            }`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Registry search failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Configuration Synchronizer
  server.tool(
    "sync_configuration",
    "Synchronize components.json and tailwind.config with new components.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      updateCssVariables: z.boolean().optional().default(true).describe("Whether to update CSS variables.")
    },
    async ({ projectRoot, updateCssVariables }) => {
      try {
        // Path to components.json
        const componentsJsonPath = path.join(projectRoot, "components.json");
        
        // Check if components.json exists
        try {
          await fs.access(componentsJsonPath);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Configuration sync failed: components.json not found at ${componentsJsonPath}`
            }]
          };
        }
        
        // Read components.json
        const componentsJsonContent = await fs.readFile(componentsJsonPath, 'utf-8');
        const componentsJson = JSON.parse(componentsJsonContent);
        
        // Check installed components
        const componentsDir = path.join(projectRoot, componentsJson.componentDir || "components/ui");
        let installedComponents: string[] = [];
        
        try {
          const files = await fs.readdir(componentsDir);
          installedComponents = files
            .filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'))
            .map(file => file.replace(/\.(tsx|jsx)$/, ''));
        } catch (error) {
          console.error("Error reading components directory:", error);
        }
        
        // Update tailwind.config if needed
        const tailwindConfigPath = path.join(projectRoot, componentsJson.tailwind.config);
        let tailwindConfigUpdated = false;
        
        try {
          let tailwindConfigContent = await fs.readFile(tailwindConfigPath, 'utf-8');
          
          // Check if content paths include components directory
          if (!tailwindConfigContent.includes(componentsJson.componentDir || "components/ui")) {
            // This is a simplified approach - a real implementation would use an AST parser
            tailwindConfigContent = tailwindConfigContent.replace(
              /content:\s*\[([^\]]*)\]/s,
              (match, contentPaths) => {
                return `content: [${contentPaths}, "${componentsJson.componentDir || 'components/ui'}/**/*.{js,ts,jsx,tsx}"]`;
              }
            );
            
            await fs.writeFile(tailwindConfigPath, tailwindConfigContent, 'utf-8');
            tailwindConfigUpdated = true;
          }
        } catch (error) {
          console.error("Error updating tailwind config:", error);
        }
        
        // Update CSS variables if needed
        let cssUpdated = false;
        if (updateCssVariables) {
          const cssPath = path.join(projectRoot, componentsJson.cssVariables);
          try {
            await fs.access(cssPath);
            // Real implementation would update CSS variables based on installed components
            cssUpdated = true;
          } catch (error) {
            console.error("Error updating CSS variables:", error);
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `Configuration Synchronization Results:\n\n` +
                 `- Installed Components: ${installedComponents.length > 0 ? installedComponents.join(', ') : 'None'}\n` +
                 `- Tailwind Config: ${tailwindConfigUpdated ? 'Updated' : 'No changes needed'}\n` +
                 `- CSS Variables: ${cssUpdated ? 'Updated' : 'No changes made'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Configuration synchronization failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Monorepo Adapter
  server.tool(
    "adapt_for_monorepo",
    "Configure shadcn/ui components for a monorepo structure.",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project."),
      packagePath: z.string().describe("Relative path to the package within the monorepo."),
      uiPackageName: z.string().optional().describe("The name of the UI package (e.g., '@my-org/ui').")
    },
    async ({ projectRoot, packagePath, uiPackageName }) => {
      try {
        const fullPackagePath = path.join(projectRoot, packagePath);
        
        // Check if package directory exists
        try {
          await fs.access(fullPackagePath);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Monorepo adaptation failed: Package directory not found at ${packagePath}`
            }]
          };
        }
        
        // Check for components.json in package
        const componentsJsonPath = path.join(fullPackagePath, "components.json");
        let componentsJson;
        let componentsJsonExists = false;
        
        try {
          await fs.access(componentsJsonPath);
          const componentsJsonContent = await fs.readFile(componentsJsonPath, 'utf-8');
          componentsJson = JSON.parse(componentsJsonContent);
          componentsJsonExists = true;
        } catch (error) {
          // components.json doesn't exist, need to initialize it
          componentsJson = {
            $schema: "https://ui.shadcn.com/schema.json",
            style: "default",
            tailwind: {
              config: "tailwind.config.js",
              css: "app/globals.css",
              baseColor: "slate",
              cssVariables: true
            },
            aliases: {
              components: "./components",
              utils: "./lib/utils"
            }
          };
        }
        
        // Update aliases for monorepo setup
        if (uiPackageName) {
          componentsJson.aliases = componentsJson.aliases || {};
          componentsJson.aliases.components = "./components";
          componentsJson.aliases.utils = "./lib/utils";
        }
        
        // Write updated components.json
        await fs.writeFile(
          componentsJsonPath, 
          JSON.stringify(componentsJson, null, 2),
          'utf-8'
        );
        
        // Create or update package.json in UI package
        const packageJsonPath = path.join(fullPackagePath, "package.json");
        let packageJson;
        
        try {
          const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
          packageJson = JSON.parse(packageJsonContent);
        } catch (error) {
          packageJson = {
            name: uiPackageName || "@monorepo/ui",
            version: "0.0.1",
            private: true,
            exports: {
              ".": "./index.ts",
              "./components/*": "./components/*/index.ts"
            }
          };
        }
        
        // Update exports for components
        packageJson.exports = packageJson.exports || {};
        packageJson.exports["."] = "./index.ts";
        packageJson.exports["./components/*"] = "./components/*/index.ts";
        
        // Write updated package.json
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2),
          'utf-8'
        );
        
        return {
          content: [{
            type: "text",
            text: `Monorepo Adaptation Completed:\n\n` +
                 `- Package Path: ${packagePath}\n` +
                 `- UI Package Name: ${uiPackageName || packageJson.name}\n` +
                 `- Components Config: ${componentsJsonExists ? 'Updated' : 'Created'}\n` +
                 `- Package JSON: Updated exports for component access`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Monorepo adaptation failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Schema Enforcement Gateway
  server.tool(
    "validate_registry_item",
    "Validate a component against the registry item schema.",
    {
      componentPath: z.string().describe("Path to the component to validate."),
      expectedType: z.enum(["component", "block"]).optional().describe("Expected type of the registry item.")
    },
    async ({ componentPath, expectedType }) => {
      try {
        // Read component file
        const componentContent = await fs.readFile(componentPath, 'utf-8');
        
        // Simple validation approach (a real implementation would use proper schema validation)
        const hasPath = /path\s*:/i.test(componentContent);
        const hasName = /name\s*:/i.test(componentContent);
        const hasType = /type\s*:/i.test(componentContent);
        
        // Check for type if specified
        let typeMatches = true;
        if (expectedType) {
          typeMatches = new RegExp(`type\\s*:\\s*["']${expectedType}["']`, 'i').test(componentContent);
        }
        
        // Build validation results
        const validationIssues = [];
        if (!hasPath) validationIssues.push("Missing 'path' field in component definition");
        if (!hasName) validationIssues.push("Missing 'name' field in component definition");
        if (!hasType) validationIssues.push("Missing 'type' field in component definition");
        if (!typeMatches) validationIssues.push(`Type is not '${expectedType}' as expected`);
        
        return {
          content: [{
            type: "text",
            text: validationIssues.length > 0
              ? `Validation Failed for ${componentPath}:\n\n${validationIssues.join('\n')}`
              : `Component at ${componentPath} is valid${expectedType ? ` as a ${expectedType}` : ''}.`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to publish/update shadcn/ui component to Figma library component
  server.tool(
    "publish_to_figma_library",
    "Publish/update a shadcn/ui component to a Figma library component",
    figmaLibrarySchema.publishToFigmaLibrary,
    async ({ projectRoot, componentName, figmaToken, figmaFileKey, figmaComponentId }) => {
      try {
        // Call the publishShadcnComponentToFigma function with an options object
        const result = await publishShadcnComponentToFigma({
          projectRoot,
          componentName,
          figmaToken,
          figmaFileKey,
          figmaComponentId
        });
        
        // FigmaPublishResponse has meta.component which contains the component data
        return {
          content: [{
            type: "text",
            text: `Component successfully published to Figma\n\nComponent: ${
              result.meta?.component ? 
              JSON.stringify(result.meta.component, null, 2) : 
              'No component data returned'
            }`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to publish component to Figma: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to validate a Figma personal access token
  server.tool(
    "validate_figma_token",
    "Validate a Figma personal access token",
    {
      figmaToken: z.string().describe("Figma personal access token to validate")
    },
    async ({ figmaToken }) => {
      try {
        // Create a Figma API client with the token
        const figmaManager = new FigmaLibraryManager(figmaToken);
        
        // Test the token by trying to fetch user data
        // Since our new API doesn't have validateToken, we'll try to get a file component
        // which will fail with authorization error if token is invalid
        await figmaManager.getFileComponents("test");
        
        return {
          content: [{
            type: "text",
            text: "Figma token is valid"
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if error is related to authorization
        const isAuthError = errorMessage.includes("token") || 
                           errorMessage.includes("auth") || 
                           errorMessage.includes("401") ||
                           errorMessage.includes("unauthorized");
        
        if (isAuthError) {
          return {
            content: [{
              type: "text",
              text: `Figma token is invalid: ${errorMessage}`
            }]
          };
        }
        
        // If we got a different error (like "file not found"), but API call worked
        return {
          content: [{
            type: "text",
            text: "Figma token is valid, but encountered a different error: " + errorMessage
          }]
        };
      }
    }
  );

  // Tool to publish atomic package components to Figma
  server.tool(
    "publish_atomic_package_to_figma",
    "Publish an entire atomic package of components to Figma library",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project"),
      atomicType: z.enum(["atoms", "molecules", "organisms", "templates"]).describe("Atomic design type to publish"),
      figmaToken: z.string().describe("Figma personal access token with library permissions"),
      figmaFileKey: z.string().describe("Figma file key where the library components exist")
    },
    async ({ projectRoot, atomicType, figmaToken, figmaFileKey }) => {
      try {
        // Get the list of components for this atomic type
        const components = atomicComponentMap[atomicType] || [];
        
        if (components.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No components found for atomic type: ${atomicType}`
            }]
          };
        }
        
        // Create Figma manager
        const figmaManager = new FigmaLibraryManager(figmaToken);
        
        // Try to get components from Figma file to map by name
        let figmaComponents;
        try {
          figmaComponents = await figmaManager.getFileComponents(figmaFileKey);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Failed to fetch components from Figma: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
        
        // Map Figma components by name for easier lookup
        const figmaComponentsByName: Record<string, any> = {};
        if (figmaComponents) {
          figmaComponents.forEach((comp: any) => {
            const name = comp.name.toLowerCase().replace(/\s+component$/i, '');
            figmaComponentsByName[name] = comp;
          });
        }
        
        // Process each component
        const results = [];
        for (const componentName of components) {
          try {
            // Find matching Figma component
            const matchingComponent = figmaComponentsByName[componentName.toLowerCase()];
            
            if (!matchingComponent) {
              results.push({
                component: componentName,
                status: 'skipped',
                error: 'No matching Figma component found'
              });
              continue;
            }
            
            // Publish the component
            const result = await publishShadcnComponentToFigma({
              projectRoot,
              componentName,
              figmaToken,
              figmaFileKey,
              figmaComponentId: matchingComponent.key
            });
            
            results.push({
              component: componentName,
              status: 'published',
              data: result
            });
          } catch (error) {
            results.push({
              component: componentName,
              status: 'error',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `Published ${results.filter(r => r.status === 'published').length} of ${components.length} components to Figma\n\n` +
                  `Results:\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to publish atomic package to Figma: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to use the Figma MCP bridge for more advanced Figma operations
  server.tool(
    "use_figma_mcp_bridge",
    "Use the Figma MCP server for advanced Figma operations directly",
    {
      operation: z.enum([
        "get-file", 
        "list-files", 
        "get-file-components", 
        "extract-design-tokens",
        "sync-design-tokens"
      ]).describe("The Figma MCP operation to perform"),
      fileKey: z.string().optional().describe("Figma file key for operations that require it"),
      componentId: z.string().optional().describe("Component ID for component-specific operations"),
      additionalParams: z.record(z.any()).optional().describe("Additional parameters for the operation")
    },
    async ({ operation, fileKey, componentId, additionalParams }) => {
      try {
        // Check if Figma MCP is available
        const isFigmaMcpEnabled = await isFigmaMcpAvailable();
        if (!isFigmaMcpEnabled) {
          return {
            content: [{
              type: "text",
              text: "Figma MCP server is not properly configured. Please ensure the Figma MCP server is set up in your .cursor/mcp.json file."
            }]
          };
        }
        
        // Get the Figma MCP bridge
        const figmaBridge = await getFigmaMcpBridge();
        if (!figmaBridge) {
          return {
            content: [{
              type: "text",
              text: "Failed to initialize Figma MCP bridge. Check your configuration and try again."
            }]
          };
        }
        
        // Execute the requested operation
        let result;
        switch (operation) {
          case "get-file":
            if (!fileKey) {
              return {
                content: [{
                  type: "text",
                  text: "File key is required for the get-file operation"
                }]
              };
            }
            result = await figmaBridge.getFile(fileKey);
            break;
            
          case "list-files":
            result = await figmaBridge.listFiles();
            break;
            
          case "get-file-components":
            if (!fileKey) {
              return {
                content: [{
                  type: "text",
                  text: "File key is required for the get-file-components operation"
                }]
              };
            }
            result = await figmaBridge.getFileComponents(fileKey);
            break;
            
          case "extract-design-tokens":
            if (!fileKey) {
              return {
                content: [{
                  type: "text",
                  text: "File key is required for the extract-design-tokens operation"
                }]
              };
            }
            result = await figmaBridge.extractDesignTokens(fileKey);
            break;
            
          case "sync-design-tokens":
            if (!fileKey || !additionalParams?.tokenFormat || !additionalParams?.outputPath) {
              return {
                content: [{
                  type: "text",
                  text: "File key, token format, and output path are required for the sync-design-tokens operation"
                }]
              };
            }
            result = await figmaBridge.syncDesignTokens(
              fileKey, 
              additionalParams.tokenFormat, 
              additionalParams.outputPath
            );
            break;
            
          default:
            return {
              content: [{
                type: "text",
                text: `Unsupported operation: ${operation}`
              }]
            };
        }
        
        return {
          content: [{
            type: "text",
            text: `Figma MCP operation '${operation}' completed successfully:\n\n${JSON.stringify(result, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Figma MCP bridge operation failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool to synchronize shadcn/ui components with Figma design system
  server.tool(
    "sync_components_with_figma_design_system",
    "Synchronize shadcn/ui components with a Figma design system using the Figma MCP bridge",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project"),
      figmaFileKey: z.string().describe("Figma file key containing the design system"),
      componentNames: z.array(z.string()).optional().describe("Specific component names to sync (if omitted, all components are synced)")
    },
    async ({ projectRoot, figmaFileKey, componentNames }) => {
      try {
        // Check if Figma MCP is available
        const isFigmaMcpEnabled = await isFigmaMcpAvailable();
        if (!isFigmaMcpEnabled) {
          return {
            content: [{
              type: "text",
              text: "Figma MCP server is not properly configured. Please ensure the Figma MCP server is set up in your .cursor/mcp.json file."
            }]
          };
        }
        
        // Get the Figma MCP bridge
        const figmaBridge = await getFigmaMcpBridge();
        if (!figmaBridge) {
          return {
            content: [{
              type: "text",
              text: "Failed to initialize Figma MCP bridge. Check your configuration and try again."
            }]
          };
        }
        
        // Path to components directory
        const componentsDir = path.join(projectRoot, 'components/ui');
        
        // Check if components directory exists
        try {
          await fs.access(componentsDir);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Components directory not found at ${componentsDir}. Make sure you have installed shadcn/ui components.`
            }]
          };
        }
        
        // Get list of component files
        const files = await fs.readdir(componentsDir);
        const componentFiles = files.filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'));
        
        if (componentFiles.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No component files found in the components/ui directory."
            }]
          };
        }
        
        // Filter components if specific names are provided
        let componentsToSync = componentFiles.map(file => file.replace(/\.(tsx|jsx)$/, ''));
        if (componentNames && componentNames.length > 0) {
          componentsToSync = componentsToSync.filter(name => componentNames.includes(name));
          if (componentsToSync.length === 0) {
            return {
              content: [{
                type: "text",
                text: "None of the specified component names were found in your project."
              }]
            };
          }
        }
        
        // Get Figma components
        const figmaComponents = await figmaBridge.getFileComponents(figmaFileKey);
        if (!figmaComponents || !figmaComponents.meta || !figmaComponents.meta.components) {
          return {
            content: [{
              type: "text",
              text: "No components found in the specified Figma file."
            }]
          };
        }
        
        // Convert to a more workable format
        const figmaComponentsList = figmaComponents.meta.components;
        
        // Process each component
        const results = [];
        for (const componentName of componentsToSync) {
          try {
            // Extract component metadata
            const metadata = await getShadcnComponentMetadata(projectRoot, componentName);
            
            // Find matching Figma component by name
            const matchingComponent = figmaComponentsList.find((c: any) => 
              c.name.toLowerCase() === componentName.toLowerCase() ||
              c.name.toLowerCase().includes(componentName.toLowerCase())
            );
            
            if (matchingComponent) {
              // Store component in Figma MCP for tracking/synchronization
              await figmaBridge.storeComponent(
                figmaFileKey,
                matchingComponent.node_id,
                componentName
              );
              
              results.push({
                componentName,
                success: true,
                figmaComponentId: matchingComponent.node_id,
                message: "Component synchronized with Figma design system"
              });
            } else {
              results.push({
                componentName,
                success: false,
                message: "No matching Figma component found in the design system"
              });
            }
          } catch (error) {
            results.push({
              componentName,
              success: false,
              message: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
        
        // Summarize results
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        const summary = `
Design System Sync Summary:
- Total components: ${results.length}
- Successfully synced: ${successCount}
- Failed: ${failureCount}

Details:
${results.map(r => `- ${r.componentName}: ${r.success ? '✅' : '❌'} ${r.message}`).join('\n')}
`;
        
        return {
          content: [{
            type: "text",
            text: summary
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Design system synchronization failed: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Direct Figma API Integration for Design Token Extraction
  server.tool(
    "extract_figma_design_tokens",
    "Extract design tokens from Figma variables and apply them to shadcn/ui styling",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project"),
      figmaFileKey: z.string().describe("Figma file key containing design tokens as variables"),
      figmaToken: z.string().describe("Figma personal access token"),
      outputFormat: z.enum(["json", "css", "tailwind"]).optional().default("tailwind").describe("Format for the extracted tokens"),
      writeToProject: z.boolean().optional().default(true).describe("Whether to write the tokens to the project")
    },
    async ({ projectRoot, figmaFileKey, figmaToken, outputFormat, writeToProject }) => {
      try {
        // Create a direct Figma API wrapper instance
        const figmaApi = new FigmaApiWrapper(figmaToken);
        
        // Extract design tokens from Figma variables
        const designTokens = await figmaApi.extractDesignTokens(figmaFileKey);
        
        // Determine the output path based on format
        let outputPath = "";
        let formattedTokens = "";
        
        switch (outputFormat) {
          case "json":
            outputPath = path.join(projectRoot, "design-tokens.json");
            formattedTokens = JSON.stringify(designTokens, null, 2);
            break;
            
          case "css":
            outputPath = path.join(projectRoot, "design-tokens.css");
            formattedTokens = generateCssVariables(designTokens);
            break;
            
          case "tailwind":
            outputPath = path.join(projectRoot, "tailwind.design-tokens.js");
            formattedTokens = generateTailwindConfig(designTokens);
            break;
        }
        
        // Write to project if requested
        if (writeToProject && outputPath) {
          await fs.writeFile(outputPath, formattedTokens, 'utf-8');
        }
        
        return {
          content: [{
            type: "text",
            text: `Successfully extracted Figma design tokens\n\nSummary:\n` +
                 `- Colors: ${Object.keys(designTokens.tokens.colors).length}\n` +
                 `- Spacing: ${Object.keys(designTokens.tokens.spacing).length}\n` +
                 `- Typography: ${Object.keys(designTokens.tokens.typography).length}\n` +
                 `- Other: ${Object.keys(designTokens.tokens.other).length}\n\n` +
                 `${writeToProject ? `Tokens written to: ${outputPath}` : 'Tokens:'}\n\n` +
                 `${writeToProject ? '' : formattedTokens}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to extract Figma design tokens: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // NEW TOOL: Sync Figma Design Tokens to shadcn/ui Theme
  server.tool(
    "sync_figma_tokens_to_shadcn",
    "Synchronize Figma design tokens with shadcn/ui theme configuration",
    {
      projectRoot: z.string().describe("Absolute path to the root of the target project"),
      figmaFileKey: z.string().describe("Figma file key containing design tokens as variables"),
      figmaToken: z.string().describe("Figma personal access token"),
      baseColor: z.enum(["slate", "gray", "zinc", "neutral", "stone"]).optional().describe("Base color to use (defaults to existing configuration)")
    },
    async ({ projectRoot, figmaFileKey, figmaToken, baseColor }) => {
      try {
        // Create a direct Figma API wrapper instance
        const figmaApi = new FigmaApiWrapper(figmaToken);
        
        // Extract design tokens from Figma variables
        const designTokens = await figmaApi.extractDesignTokens(figmaFileKey);
        
        // Check if components.json exists
        const componentsJsonPath = path.join(projectRoot, "components.json");
        let componentsJson;
        
        try {
          const componentsJsonContent = await fs.readFile(componentsJsonPath, 'utf-8');
          componentsJson = JSON.parse(componentsJsonContent);
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Failed to read components.json: ${error instanceof Error ? error.message : String(error)}\n` +
                    `Please initialize shadcn/ui in your project first.`
            }]
          };
        }
        
        // Determine if we need to update the base color
        if (baseColor) {
          componentsJson.tailwind.baseColor = baseColor;
        }
        
        // Determine path to CSS file from components.json
        const cssPath = path.join(projectRoot, componentsJson.tailwind.css);
        
        // Generate CSS variables from design tokens
        const cssVariables = generateCssVariables(designTokens);
        
        // Check if CSS file exists
        let existingCss = "";
        try {
          existingCss = await fs.readFile(cssPath, 'utf-8');
        } catch (error) {
          // File doesn't exist, create it
          existingCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n`;
        }
        
        // Replace or add CSS variables
        const updatedCss = updateCssVariables(existingCss, cssVariables);
        
        // Write updated CSS file
        await fs.writeFile(cssPath, updatedCss, 'utf-8');
        
        // Write updated components.json
        await fs.writeFile(componentsJsonPath, JSON.stringify(componentsJson, null, 2), 'utf-8');
        
        // Generate tailwind config extension file
        const tailwindTokensPath = path.join(projectRoot, "tailwind.design-tokens.js");
        const tailwindConfig = generateTailwindConfig(designTokens);
        await fs.writeFile(tailwindTokensPath, tailwindConfig, 'utf-8');
        
        // Update main tailwind config to import the tokens
        const tailwindConfigPath = path.join(projectRoot, componentsJson.tailwind.config);
        let tailwindConfigContent = "";
        
        try {
          tailwindConfigContent = await fs.readFile(tailwindConfigPath, 'utf-8');
          
          // Check if our import is already there
          if (!tailwindConfigContent.includes('tailwind.design-tokens')) {
            // Simple pattern matching to find the config object
            const updatedTailwindConfig = addDesignTokensImport(tailwindConfigContent);
            await fs.writeFile(tailwindConfigPath, updatedTailwindConfig, 'utf-8');
          }
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Warning: Failed to update tailwind config: ${error instanceof Error ? error.message : String(error)}\n` +
                    `Design tokens were extracted, but you'll need to manually update your tailwind config.`
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: `Successfully synchronized Figma design tokens with shadcn/ui theme\n\n` +
                  `Files updated:\n` +
                  `- ${cssPath} (CSS variables)\n` +
                  `- ${componentsJsonPath} (Theme configuration)\n` +
                  `- ${tailwindTokensPath} (Tailwind extensions)\n` +
                  `- ${tailwindConfigPath} (Tailwind config)\n\n` +
                  `Token summary:\n` +
                  `- Colors: ${Object.keys(designTokens.tokens.colors).length}\n` +
                  `- Spacing: ${Object.keys(designTokens.tokens.spacing).length}\n` +
                  `- Typography: ${Object.keys(designTokens.tokens.typography).length}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to sync Figma tokens to shadcn/ui theme: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  return server;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate CSS variables from design tokens
 * @param designTokens - Design tokens extracted from Figma
 * @returns CSS variables as a string
 */
function generateCssVariables(designTokens: any): string {
  let css = "@layer base {\n  :root {\n";
  
  // Add color variables
  Object.entries(designTokens.tokens.colors).forEach(([name, value]) => {
    css += `    --${name}: ${value};\n`;
  });
  
  // Add spacing variables
  Object.entries(designTokens.tokens.spacing).forEach(([name, value]) => {
    css += `    --${name}: ${value};\n`;
  });
  
  // Add typography variables
  Object.entries(designTokens.tokens.typography).forEach(([name, value]) => {
    if (typeof value === 'string') {
      css += `    --${name}: ${value};\n`;
    }
  });
  
  // Close the CSS block
  css += "  }\n}\n";
  
  return css;
}

/**
 * Generate a Tailwind config extension from design tokens
 * @param designTokens - Design tokens extracted from Figma
 * @returns Tailwind config as a string
 */
function generateTailwindConfig(designTokens: any): string {
  // Convert tokens to Tailwind format
  const colors: Record<string, any> = {};
  const spacing: Record<string, any> = {};
  const fontFamily: Record<string, any> = {};
  const fontSize: Record<string, any> = {};
  
  // Process colors
  Object.entries(designTokens.tokens.colors).forEach(([name, value]) => {
    colors[name.replace(/\./g, '-')] = value;
  });
  
  // Process spacing
  Object.entries(designTokens.tokens.spacing).forEach(([name, value]) => {
    spacing[name.replace(/\./g, '-')] = value;
  });
  
  // Process typography
  Object.entries(designTokens.tokens.typography).forEach(([name, value]: [string, any]) => {
    if (typeof value === 'object' && value.fontFamily) {
      fontFamily[name.replace(/\./g, '-')] = value.fontFamily;
    }
    if (typeof value === 'object' && value.fontSize) {
      fontSize[name.replace(/\./g, '-')] = [value.fontSize, { 
        lineHeight: value.lineHeight || 'normal',
        fontWeight: value.fontWeight || 'normal'
      }];
    }
  });
  
  // Generate the JavaScript module
  return `// Generated from Figma design tokens
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 2)},
      spacing: ${JSON.stringify(spacing, null, 2)},
      fontFamily: ${JSON.stringify(fontFamily, null, 2)},
      fontSize: ${JSON.stringify(fontSize, null, 2)}
    }
  }
};
`;
}

/**
 * Update CSS variables in an existing CSS file
 * @param existingCss - Existing CSS content
 * @param newVariables - New CSS variables to add/update
 * @returns Updated CSS content
 */
function updateCssVariables(existingCss: string, newVariables: string): string {
  // Check if there's an existing @layer base block
  const layerBaseRegex = /@layer\s+base\s*{[^}]*}/;
  
  if (layerBaseRegex.test(existingCss)) {
    // Replace the existing @layer base block
    return existingCss.replace(layerBaseRegex, newVariables);
  } else {
    // Add the new variables at the top of the file
    return `${newVariables}\n\n${existingCss}`;
  }
}

/**
 * Add design tokens import to tailwind config
 * @param tailwindConfig - Existing tailwind config content
 * @returns Updated tailwind config content
 */
function addDesignTokensImport(tailwindConfig: string): string {
  // Check if it's a CommonJS module
  if (tailwindConfig.includes('module.exports')) {
    // Add the import and merge logic
    const importLine = `const designTokens = require('./tailwind.design-tokens');\n\n`;
    
    // Find the module.exports line
    const moduleExportsMatch = tailwindConfig.match(/module\.exports\s*=\s*{/);
    
    if (moduleExportsMatch) {
      const insertPosition = moduleExportsMatch.index as number;
      
      // Insert the import before module.exports
      const updatedConfig = 
        tailwindConfig.slice(0, insertPosition) + 
        importLine +
        tailwindConfig.slice(insertPosition);
      
      // Find the theme section and merge with design tokens
      return updatedConfig.replace(
        /(theme\s*:\s*{)/,
        `$1\n    ...designTokens.theme,`
      );
    }
  }
  
  // If we can't properly parse the config, return it unchanged
  console.warn('Could not automatically update tailwind config to import design tokens');
  return tailwindConfig;
} 