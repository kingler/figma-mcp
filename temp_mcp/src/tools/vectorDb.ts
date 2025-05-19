import { z } from "zod";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../env/keys";
import * as path from "path";

export const vectorDbToolName = "mcp_vector-db";
export const vectorDbToolDescription = "Initialize and manage vector databases for project context and embeddings.";

export const VectorDbToolSchema = z.object({
  action: z.enum([
    "init",      // Initialize vector database
    "update",    // Update embeddings
    "query",     // Query vector database
    "analyze"    // Analyze embeddings
  ]).describe("Vector database action to perform"),
  projectPath: z.string().describe("Path to the project root"),
  options: z.object({
    embeddingModel: z.string().optional().default("all-MiniLM-L6-v2"),
    dimension: z.number().optional().default(384),
    collection: z.string().optional().default("project_context"),
    queryText: z.string().optional(),
    topK: z.number().optional().default(5)
  }).optional()
});

export async function runVectorDbTool(args: z.infer<typeof VectorDbToolSchema>) {
  const { action, projectPath, options = {} } = args;
  
  try {
    switch (action) {
      case "init":
        return await initializeVectorDb(projectPath, options);
      case "update":
        return await updateVectorDb(projectPath, options);
      case "query":
        return await queryVectorDb(projectPath, options);
      case "analyze":
        return await analyzeVectorDb(projectPath, options);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Vector database operation failed: ${errorMessage}`
    };
  }
}

async function initializeVectorDb(projectPath: string, options: any): Promise<any> {
  const { initVectorDb } = require("../scripts/init_vector_db.py");
  const contextPath = path.join(projectPath, ".context");
  
  // Initialize vector database
  const result = await initVectorDb({
    contextPath,
    embeddingModel: options.embeddingModel,
    dimension: options.dimension,
    collection: options.collection
  });
  
  return {
    success: true,
    message: "Vector database initialized successfully",
    contextPath,
    ...result
  };
}

async function updateVectorDb(projectPath: string, options: any): Promise<any> {
  // First analyze what's changed in the project
  const changes = await analyzeProjectChanges(projectPath);
  
  if (changes.significantChanges) {
    // If significant changes, update embeddings
    const { updateEmbeddings } = require("../scripts/init_vector_db.py");
    const contextPath = path.join(projectPath, ".context");
    
    const result = await updateEmbeddings({
      contextPath,
      collection: options.collection,
      changes: changes.changes
    });
    
    return {
      success: true,
      message: "Vector database updated successfully",
      updates: result
    };
  }
  
  return {
    success: true,
    message: "No significant changes to update",
    changes
  };
}

async function queryVectorDb(projectPath: string, options: any): Promise<any> {
  if (!options.queryText) {
    throw new Error("Query text is required for vector database queries");
  }
  
  const { queryVectorDb } = require("../scripts/init_vector_db.py");
  const contextPath = path.join(projectPath, ".context");
  
  const results = await queryVectorDb({
    contextPath,
    collection: options.collection,
    queryText: options.queryText,
    topK: options.topK
  });
  
  return {
    success: true,
    message: "Vector database query completed successfully",
    results
  };
}

async function analyzeVectorDb(projectPath: string, options: any): Promise<any> {
  // Use OpenAI to analyze the vector database state and embeddings
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const contextPath = path.join(projectPath, ".context");
  const { getVectorDbStats } = require("../scripts/init_vector_db.py");
  
  const stats = await getVectorDbStats({
    contextPath,
    collection: options.collection
  });

  const systemPrompt = `You are an expert in vector databases and embeddings. 
  Analyze the provided vector database statistics and provide insights about the embeddings quality and potential improvements.`;

  const response = await openai.chat.completions.create({
    model: "o3-mini-2025-01-31",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(stats) }
    ],
  });

  return {
    success: true,
    message: "Vector database analysis completed",
    analysis: response.choices[0]?.message?.content || "No analysis generated",
    stats
  };
}

async function analyzeProjectChanges(projectPath: string): Promise<any> {
  // Implement change detection logic
  return {
    significantChanges: true,
    changes: []
  };
} 