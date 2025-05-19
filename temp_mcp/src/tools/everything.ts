import { z } from "zod";
import { createServer } from "./everything/everything.js";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";

export const everythingToolName = "everything";
export const everythingToolDescription = "Search and manage files using Everything search engine";

interface SearchResult {
  path: string;
  type: string;
  size: number;
  modified: string;
}

const SearchResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string()
  }))
});

export const EverythingToolSchema = z.object({
  query: z.string().describe("Search query"),
  path: z.string().optional().describe("Path to search in"),
  regex: z.boolean().optional().default(false).describe("Use regex pattern matching"),
  caseSensitive: z.boolean().optional().default(false).describe("Use case-sensitive search"),
  maxResults: z.number().optional().default(100).describe("Maximum number of results")
});

export async function runEverythingTool(args: z.infer<typeof EverythingToolSchema>) {
  try {
    const { server, cleanup } = createServer();
    
    // Execute search using server's request handler
    const request: ServerRequest = {
      method: "tools/call",
      params: {
        name: "search",
        arguments: args
      }
    };
    
    const rawResponse = await server.request(request);
    const response = SearchResponseSchema.parse(rawResponse);
    
    // Cleanup
    await cleanup();
    
    return {
      content: response.content,
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
} 