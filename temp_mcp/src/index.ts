import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Core Development Tools
import {
  rootFileGeneratorToolName,
  rootFileGeneratorToolDescription,
  RootFileGeneratorToolSchema,
  runRootFileGeneratorTool,
} from "./tools/rootFileGenerator.js";

import {
  techStackManagerToolName,
  techStackManagerToolDescription,
  TechStackManagerToolSchema,
  runTechStackManagerTool,
} from "./tools/techStackManager.js";

// Project Management Tools
import {
  projectInitToolName,
  projectInitToolDescription,
  ProjectInitToolSchema,
  runProjectInitTool,
} from "./tools/projectInit.js";

import {
  docGeneratorToolName,
  docGeneratorToolDescription,
  DocGeneratorToolSchema,
  runDocGeneratorTool,
} from "./tools/docGenerator.js";

import {
  contextManagerToolName,
  contextManagerToolDescription,
  ContextManagerToolSchema,
  runContextManagerTool,
} from "./tools/contextManager.js";

import {
  knowledgeGraphToolName,
  knowledgeGraphToolDescription,
  KnowledgeGraphToolSchema,
  runKnowledgeGraphTool,
} from "./tools/knowledgeGraph.js";

import {
  vectorDbToolName,
  vectorDbToolDescription,
  VectorDbToolSchema,
  runVectorDbTool,
} from "./tools/vectorDb.js";

// Design Tools
import {
  designSystemAgentToolName,
  designSystemAgentToolDescription,
  DesignSystemAgentToolSchema,
  runDesignSystemAgentTool,
} from "./tools/designSystemAgent.js";

import {
  componentLayoutAgentToolName,
  componentLayoutAgentToolDescription,
  ComponentLayoutAgentToolSchema,
  runComponentLayoutAgentTool,
} from "./tools/componentLayoutAgent.js";

import {
  designTokenGeneratorToolName,
  designTokenGeneratorToolDescription,
  DesignTokenGeneratorToolSchema,
  runDesignTokenGeneratorTool,
} from "./tools/designTokenGenerator.js";

import {
  svgComponentGeneratorToolName,
  svgComponentGeneratorToolDescription,
  SVGComponentGeneratorToolSchema,
  runSVGComponentGeneratorTool,
} from "./tools/svgComponentGenerator.js";

// Quality Assurance Tools
import {
  auditProcessorToolName,
  auditProcessorToolDescription,
  AuditProcessorToolSchema,
  runAuditProcessorTool,
} from "./tools/auditProcessor.js";

// Agent Tools
import {
  neoOrchestratorToolName,
  neoOrchestratorToolDescription,
  NeoOrchestratorToolSchema,
  runNeoOrchestratorTool,
} from "./tools/neoOrchestrator.js";

import {
  uxResearcherToolName,
  uxResearcherToolDescription,
  UXResearcherToolSchema,
  runUXResearcherTool,
} from "./tools/uxResearcher.js";

import {
  productOwnerToolName,
  productOwnerToolDescription,
  ProductOwnerToolSchema,
  runProductOwnerTool,
} from "./tools/productOwner.js";

// Additional Tools
import {
  braveSearchToolName,
  braveSearchToolDescription,
  BraveSearchToolSchema,
  runBraveSearchTool,
} from "./tools/braveSearch.js";

import {
  everythingToolName,
  everythingToolDescription,
  EverythingToolSchema,
  runEverythingTool,
} from "./tools/everything.js";

import {
  gdriveToolName,
  gdriveToolDescription,
  GDriveToolSchema,
  runGDriveTool,
} from "./tools/gdrive.js";

import {
  memoryToolName,
  memoryToolDescription,
  MemoryToolSchema,
  runMemoryTool,
} from "./tools/memory.js";

import {
  postgresToolName,
  postgresToolDescription,
  PostgresToolSchema,
  runPostgresTool,
} from "./tools/postgres.js";

import {
  puppeteerToolName,
  puppeteerToolDescription,
  PuppeteerToolSchema,
  runPuppeteerTool,
} from "./tools/puppeteer.js";

import {
  redisToolName,
  redisToolDescription,
  RedisToolSchema,
  runRedisTool,
} from "./tools/redis.js";

import {
  sequentialThinkingToolName,
  sequentialThinkingToolDescription,
  SequentialThinkingToolSchema,
  runSequentialThinkingTool,
} from "./tools/sequentialThinking.js";

// Add after imports and before server initialization

// Define tool handlers map
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  [rootFileGeneratorToolName]: async (args) => {
    const validated = RootFileGeneratorToolSchema.parse(args);
    return await runRootFileGeneratorTool(validated);
  },
  [techStackManagerToolName]: async (args) => {
    const validated = TechStackManagerToolSchema.parse(args);
    return await runTechStackManagerTool(validated);
  },
  [projectInitToolName]: async (args) => {
    const validated = ProjectInitToolSchema.parse(args);
    return await runProjectInitTool(validated);
  },
  // ... continue for all tools
};

/**
 * Neo SDLC Orchestration MCP Server
 * 
 * Provides tools for:
 * 1. Agent Tools
 *    - NeoOrchestrator: SDLC Orchestration Leader
 *    - MorpheusValidator: High-Level Validator & Decision Maker
 *    - UXResearcher: UX Research Specialist
 * 
 * 2. Core Development
 *    - Screenshot: UI/UX capture and analysis
 *    - Architect: System architecture and planning
 *    - CodeReview: Code quality and review
 * 
 * 3. Project Management
 *    - ProjectInit: Project setup and scaffolding
 *    - DocGenerator: Documentation generation
 * 
 * 4. Context Management
 *    - ContextManager: Project context handling
 *    - KnowledgeGraph: Dependency and relationship analysis
 *    - VectorDb: Semantic search and embeddings
 * 
 * 5. Quality Assurance
 *    - AuditProcessor: Code audit and quality checks
 */

// Add structured error handling
interface MCPError extends Error {
  code: number;
  data?: unknown;
}

class MCPToolError extends Error implements MCPError {
  code: number;
  data?: unknown;

  constructor(message: string, code: number = 500, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'MCPToolError';
  }
}

// Update server initialization with better error handling
const server = new Server(
  {
    name: "neo-sdlc-tools",
    version: "2.0.1",
  },
  {
    capabilities: {
      tools: {},
      resources: {}, // Add resources capability
    },
  }
);

// 2. Define the list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Core Development Tools
      {
        name: rootFileGeneratorToolName,
        description: rootFileGeneratorToolDescription,
        inputSchema: RootFileGeneratorToolSchema,
      },
      {
        name: techStackManagerToolName,
        description: techStackManagerToolDescription,
        inputSchema: TechStackManagerToolSchema,
      },
      // Project Management Tools
      {
        name: projectInitToolName,
        description: projectInitToolDescription,
        inputSchema: ProjectInitToolSchema,
      },
      {
        name: docGeneratorToolName,
        description: docGeneratorToolDescription,
        inputSchema: DocGeneratorToolSchema,
      },
      {
        name: contextManagerToolName,
        description: contextManagerToolDescription,
        inputSchema: ContextManagerToolSchema,
      },
      {
        name: knowledgeGraphToolName,
        description: knowledgeGraphToolDescription,
        inputSchema: KnowledgeGraphToolSchema,
      },
      {
        name: vectorDbToolName,
        description: vectorDbToolDescription,
        inputSchema: VectorDbToolSchema,
      },
      // Design Tools
      {
        name: designSystemAgentToolName,
        description: designSystemAgentToolDescription,
        inputSchema: DesignSystemAgentToolSchema,
      },
      {
        name: componentLayoutAgentToolName,
        description: componentLayoutAgentToolDescription,
        inputSchema: ComponentLayoutAgentToolSchema,
      },
      {
        name: designTokenGeneratorToolName,
        description: designTokenGeneratorToolDescription,
        inputSchema: DesignTokenGeneratorToolSchema,
      },
      {
        name: svgComponentGeneratorToolName,
        description: svgComponentGeneratorToolDescription,
        inputSchema: SVGComponentGeneratorToolSchema,
      },
      // Quality Assurance Tools
      {
        name: auditProcessorToolName,
        description: auditProcessorToolDescription,
        inputSchema: AuditProcessorToolSchema,
      },
      // Agent Tools
      {
        name: neoOrchestratorToolName,
        description: neoOrchestratorToolDescription,
        inputSchema: NeoOrchestratorToolSchema,
      },
      {
        name: uxResearcherToolName,
        description: uxResearcherToolDescription,
        inputSchema: UXResearcherToolSchema,
      },
      {
        name: productOwnerToolName,
        description: productOwnerToolDescription,
        inputSchema: ProductOwnerToolSchema,
      },
      // Additional Tools
      {
        name: braveSearchToolName,
        description: braveSearchToolDescription,
        inputSchema: BraveSearchToolSchema,
      },
      {
        name: everythingToolName,
        description: everythingToolDescription,
        inputSchema: EverythingToolSchema,
      },
      {
        name: gdriveToolName,
        description: gdriveToolDescription,
        inputSchema: GDriveToolSchema,
      },
      {
        name: memoryToolName,
        description: memoryToolDescription,
        inputSchema: MemoryToolSchema,
      },
      {
        name: postgresToolName,
        description: postgresToolDescription,
        inputSchema: PostgresToolSchema,
      },
      {
        name: puppeteerToolName,
        description: puppeteerToolDescription,
        inputSchema: PuppeteerToolSchema,
      },
      {
        name: redisToolName,
        description: redisToolDescription,
        inputSchema: RedisToolSchema,
      },
      {
        name: sequentialThinkingToolName,
        description: sequentialThinkingToolDescription,
        inputSchema: SequentialThinkingToolSchema,
      },
    ],
  };
});

// Add proper error handling middleware
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Validate tool exists
    if (!toolHandlers[name]) {
      throw new MCPToolError(`Unknown tool: ${name}`, 404);
    }

    // Add request logging
    console.error(`Processing tool request: ${name}`);

    // Add timeout handling
    const timeout = setTimeout(() => {
      throw new MCPToolError('Tool execution timed out', 408);
    }, 30000); // 30 second timeout

    try {
      const result = await toolHandlers[name](args);
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }

  } catch (error: unknown) {
    const mcpError = error instanceof MCPToolError ? error : new MCPToolError(
      error instanceof Error ? error.message : String(error)
    );

    console.error(`Tool execution failed:`, {
      tool: name,
      error: mcpError
    });

    return {
      content: [{
        type: "text",
        text: mcpError.message
      }],
      isError: true,
      errorCode: mcpError.code,
      errorData: mcpError.data
    };
  }
});

// Add after tool handlers setup

// Handle resource listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Array.from(searchResources.values()).map(r => ({
      uri: r.uri,
      mimeType: "application/json",
      name: r.title
    }))
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resource = searchResources.get(request.params.uri);
  if (!resource) {
    throw new MCPToolError(`Resource not found: ${request.params.uri}`, 404);
  }
  
  return {
    contents: [{
      uri: resource.uri,
      mimeType: "application/json",
      blob: JSON.stringify(resource)
    }]
  };
});

// Start the server
async function main() {
  try {
    // Initialize transport with proper error handling
    const transport = new StdioServerTransport();
    
    // Add connection event handlers
    transport.on('error', (error) => {
      console.error('Transport error:', error);
      process.exit(1);
    });

    transport.on('close', () => {
      console.error('Transport connection closed');
      process.exit(0);
    });

    // Connect with timeout
    const connectionTimeout = setTimeout(() => {
      console.error('Connection timeout');
      process.exit(1);
    }, 5000);

    await server.connect(transport);
    clearTimeout(connectionTimeout);

    console.error("Neo SDLC Tools MCP Server running on stdio");

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down...');
      server.disconnect().then(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down...');
      server.disconnect().then(() => process.exit(0));
    });

  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});