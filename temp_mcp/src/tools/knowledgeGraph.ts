import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const knowledgeGraphToolName = "mcp_knowledge-graph";
export const knowledgeGraphToolDescription = "Generate and manage project knowledge graphs for different project types.";

export const KnowledgeGraphToolSchema = z.object({
  action: z.enum([
    "generate",  // Generate new knowledge graph
    "update",    // Update existing graph
    "visualize", // Create visualization
    "analyze"    // Analyze graph
  ]).describe("Knowledge graph action to perform"),
  projectPath: z.string().describe("Path to the project root"),
  projectType: z.enum([
    "python",
    "react",
    "vue",
    "generic"
  ]).describe("Type of project for specialized analysis"),
  options: z.object({
    includeTests: z.boolean().optional().default(true),
    maxDepth: z.number().optional().default(3),
    outputFormat: z.enum(["json", "svg", "html"]).optional().default("json"),
    outputPath: z.string().optional()
  }).optional()
});

export async function runKnowledgeGraphTool(args: z.infer<typeof KnowledgeGraphToolSchema>) {
  const { action, projectPath, projectType, options = {} } = args;
  
  try {
    switch (action) {
      case "generate":
        return await generateKnowledgeGraph(projectPath, projectType, options);
      case "update":
        return await updateKnowledgeGraph(projectPath, projectType, options);
      case "visualize":
        return await visualizeKnowledgeGraph(projectPath, options);
      case "analyze":
        return await analyzeKnowledgeGraph(projectPath, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Knowledge graph operation failed: ${errorMessage}`
    };
  }
}

async function generateKnowledgeGraph(
  projectPath: string,
  projectType: string,
  options: any
): Promise<any> {
  const fs = require("fs").promises;
  const outputPath = options.outputPath || path.join(projectPath, ".context", "knowledge_graph");
  
  // Create output directory if it doesn't exist
  await fs.mkdir(outputPath, { recursive: true });
  
  // Select appropriate graph generator based on project type
  switch (projectType) {
    case "python":
      return await generatePythonGraph(projectPath, outputPath, options);
    case "react":
      return await generateReactGraph(projectPath, outputPath, options);
    case "vue":
      return await generateVueGraph(projectPath, outputPath, options);
    default:
      return await generateGenericGraph(projectPath, outputPath, options);
  }
}

async function generatePythonGraph(projectPath: string, outputPath: string, options: any): Promise<any> {
  const { spawn } = require("child_process");
  const scriptPath = path.join(__dirname, "../scripts/python_dependency_graph.py");
  
  return new Promise((resolve, reject) => {
    const process = spawn("python", [
      scriptPath,
      "--project-path", projectPath,
      "--output-path", outputPath,
      "--include-tests", options.includeTests ? "true" : "false",
      "--max-depth", options.maxDepth.toString()
    ]);
    
    let output = "";
    process.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    process.on("close", (code: number) => {
      if (code === 0) {
        resolve({
          success: true,
          message: "Python knowledge graph generated successfully",
          outputPath,
          data: JSON.parse(output)
        });
      } else {
        reject(new Error(`Python graph generation failed with code ${code}`));
      }
    });
  });
}

async function generateReactGraph(projectPath: string, outputPath: string, options: any): Promise<any> {
  const { generateDependencyGraph } = require("../scripts/react_dependency_graph.js");
  const graph = await generateDependencyGraph(projectPath, {
    includeTests: options.includeTests,
    maxDepth: options.maxDepth
  });
  
  // Save graph to file
  const fs = require("fs").promises;
  await fs.writeFile(
    path.join(outputPath, "react-dependency-graph.json"),
    JSON.stringify(graph, null, 2)
  );
  
  return {
    success: true,
    message: "React knowledge graph generated successfully",
    outputPath,
    data: graph
  };
}

async function generateVueGraph(projectPath: string, outputPath: string, options: any): Promise<any> {
  const { generateDependencyGraph } = require("../scripts/vue_dependency_graph.js");
  const graph = await generateDependencyGraph(projectPath, {
    includeTests: options.includeTests,
    maxDepth: options.maxDepth
  });
  
  // Save graph to file
  const fs = require("fs").promises;
  await fs.writeFile(
    path.join(outputPath, "vue-dependency-graph.json"),
    JSON.stringify(graph, null, 2)
  );
  
  return {
    success: true,
    message: "Vue knowledge graph generated successfully",
    outputPath,
    data: graph
  };
}

async function generateGenericGraph(projectPath: string, outputPath: string, options: any): Promise<any> {
  const { generateKnowledgeGraph } = require("../scripts/generate_knowledge_graph.js");
  const graph = await generateKnowledgeGraph(projectPath, {
    includeTests: options.includeTests,
    maxDepth: options.maxDepth
  });
  
  // Save graph to file
  const fs = require("fs").promises;
  await fs.writeFile(
    path.join(outputPath, "project-knowledge-graph.json"),
    JSON.stringify(graph, null, 2)
  );
  
  return {
    success: true,
    message: "Generic knowledge graph generated successfully",
    outputPath,
    data: graph
  };
}

async function visualizeKnowledgeGraph(projectPath: string, options: any): Promise<any> {
  const { visualizeGraph } = require("../scripts/visualize_graph.js");
  const outputPath = options.outputPath || path.join(projectPath, ".context", "knowledge_graph", "visualization");
  
  const visualization = await visualizeGraph(projectPath, {
    format: options.outputFormat,
    outputPath
  });
  
  return {
    success: true,
    message: "Knowledge graph visualization generated successfully",
    outputPath,
    data: visualization
  };
}

async function analyzeKnowledgeGraph(projectPath: string, options: any): Promise<any> {
  // Use OpenAI to analyze the graph and provide insights
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const graphPath = path.join(projectPath, ".context", "knowledge_graph", "project-knowledge-graph.json");
  const fs = require("fs").promises;
  const graphData = JSON.parse(await fs.readFile(graphPath, "utf8"));

  const systemPrompt = `You are an expert software architect analyzing a project's knowledge graph. 
  Provide insights about the project structure, dependencies, and potential improvements.`;

  const response = await openai.chat.completions.create({
    model: "o3-mini-2025-01-31",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(graphData) }
    ],
  });

  return {
    success: true,
    message: "Knowledge graph analysis completed",
    analysis: response.choices[0]?.message?.content || "No analysis generated",
    graphData
  };
}

async function updateKnowledgeGraph(projectPath: string, projectType: string, options: any): Promise<any> {
  // First analyze what's changed
  const changes = await analyzeProjectChanges(projectPath);
  
  // If significant changes, regenerate the graph
  if (changes.significantChanges) {
    return await generateKnowledgeGraph(projectPath, projectType, options);
  }
  
  // Otherwise, perform incremental update
  return await performIncrementalUpdate(projectPath, changes, options);
}

async function analyzeProjectChanges(projectPath: string): Promise<any> {
  // Implement change detection logic
  return {
    significantChanges: true,
    changes: []
  };
}

async function performIncrementalUpdate(projectPath: string, changes: any, options: any): Promise<any> {
  // Implement incremental update logic
  return {
    success: true,
    message: "Knowledge graph updated incrementally",
    changes
  };
} 