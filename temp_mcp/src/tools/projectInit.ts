import { z } from "zod";

export const projectInitToolName = "mcp_project-init";
export const projectInitToolDescription = "Initialize a new project with specified template and configuration.";

export const ProjectInitToolSchema = z.object({
  projectName: z.string().describe("Name of the project"),
  template: z.enum(["webapp", "website", "native_mobile_app"]).describe("Project template type"),
  path: z.string().optional().describe("Project output path"),
  options: z.object({
    typescript: z.boolean().optional(),
    tailwind: z.boolean().optional(),
    eslint: z.boolean().optional(),
    shadcn: z.boolean().optional()
  }).optional()
});

export async function runProjectInitTool(args: z.infer<typeof ProjectInitToolSchema>) {
  const { projectName, template, path = "./", options = {} } = args;
  
  try {
    // Create project structure based on template
    const projectPath = `${path}/${projectName}`;
    
    // Initialize project based on template
    switch (template) {
      case "webapp":
        // Initialize Next.js webapp with shadcn
        await executeCommand(`npx create-next-app@latest ${projectPath} --typescript --tailwind --eslint`);
        if (options.shadcn) {
          await executeCommand(`cd ${projectPath} && npx shadcn-ui@latest init`);
        }
        break;
        
      case "website":
        // Initialize static website
        await executeCommand(`npx create-next-app@latest ${projectPath} --typescript --tailwind --eslint`);
        break;
        
      case "native_mobile_app":
        // Initialize React Native app
        await executeCommand(`npx react-native init ${projectName} --template react-native-template-typescript`);
        break;
    }
    
    // Initialize git repository
    await executeCommand(`cd ${projectPath} && git init`);
    
    // Create project documentation structure
    await createDocStructure(projectPath);
    
    return {
      success: true,
      message: `Project ${projectName} initialized successfully with ${template} template`,
      projectPath
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to initialize project: ${errorMessage}`
    };
  }
}

async function executeCommand(command: string): Promise<void> {
  const { exec } = require("child_process");
  return new Promise((resolve, reject) => {
    exec(command, (error: Error, stdout: string, stderr: string) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function createDocStructure(projectPath: string): Promise<void> {
  const fs = require("fs").promises;
  const docStructure = [
    "docs/requirements",
    "docs/design",
    "docs/architecture",
    "docs/api",
    ".context",
    ".context/diagrams",
    ".context/docs",
    ".context/knowledge_graph"
  ];
  
  for (const dir of docStructure) {
    await fs.mkdir(`${projectPath}/${dir}`, { recursive: true });
  }
} 