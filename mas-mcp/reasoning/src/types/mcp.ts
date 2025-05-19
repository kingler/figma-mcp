import { z } from 'zod';

export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

export class McpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export const Tool = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.string(),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional()
  })
});

export type Tool = z.infer<typeof Tool>;

export const ListToolsRequest = z.object({
  method: z.literal('list_tools'),
  params: z.object({}).strict()
});

export type ListToolsRequest = {
  method: 'list_tools';
  params: Record<string, never>;
};

export const ListToolsResponse = z.object({
  tools: z.array(Tool)
});

export type ListToolsResponse = z.infer<typeof ListToolsResponse>;

export const CallToolRequest = z.object({
  method: z.literal('call_tool'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.unknown()).optional()
  })
});

export type CallToolRequest = {
  method: 'call_tool';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
};

export const CallToolResponse = z.object({
  content: z.array(z.object({
    type: z.string(),
    text: z.string()
  })),
  isError: z.boolean().optional()
});

export type CallToolResponse = z.infer<typeof CallToolResponse>;

// Schema exports for request handlers
export const ListToolsRequestSchema = ListToolsRequest;
export const CallToolRequestSchema = CallToolRequest;

// Re-export zod
export { z };
