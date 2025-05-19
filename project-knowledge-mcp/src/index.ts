#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Neo4jSchemaManager } from './neo4j-schema.js';

// Export knowledge types
export * from './types/knowledge.js';

interface AddDirectoryArgs {
  path: string;
  name: string;
  description?: string;
}

interface AddComponentArgs {
  name: string;
  type: string;
  directory: string;
}

interface AddConventionArgs {
  type: string;
  name: string;
  rule: string;
}

interface AddAgentArgs {
  id: string;
  name: string;
  type: string;
}

interface AddResponsibilityArgs {
  agentId: string;
  name: string;
  tasks: string[];
}

interface AddMetricArgs {
  agentId: string;
  name: string;
  type: string;
  value: number;
}

interface LinkComponentArgs {
  componentName: string;
  conventionType: string;
}

interface GetStructureArgs {
  agentId?: string;
}

class ProjectKnowledgeServer {
  private server: Server;
  private neo4j: Neo4jSchemaManager;

  constructor() {
    this.server = new Server(
      {
        name: 'project-knowledge-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.neo4j = new Neo4jSchemaManager();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'initialize_schema',
          description: 'Initialize the Neo4j schema for project knowledge',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'add_directory',
          description: 'Add a directory to the project structure',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path' },
              name: { type: 'string', description: 'Directory name' },
              description: { type: 'string', description: 'Directory description' }
            },
            required: ['path', 'name']
          }
        },
        {
          name: 'add_component',
          description: 'Add a component to a directory',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Component name' },
              type: { type: 'string', description: 'Component type' },
              directory: { type: 'string', description: 'Parent directory path' }
            },
            required: ['name', 'type', 'directory']
          }
        },
        {
          name: 'add_convention',
          description: 'Add a convention rule',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Convention type' },
              name: { type: 'string', description: 'Convention name' },
              rule: { type: 'string', description: 'Convention rule' }
            },
            required: ['type', 'name', 'rule']
          }
        },
        {
          name: 'add_agent',
          description: 'Add an agent to the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Agent ID' },
              name: { type: 'string', description: 'Agent name' },
              type: { type: 'string', description: 'Agent type' }
            },
            required: ['id', 'name', 'type']
          }
        },
        {
          name: 'add_responsibility',
          description: 'Add a responsibility to an agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID' },
              name: { type: 'string', description: 'Responsibility name' },
              tasks: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of tasks'
              }
            },
            required: ['agentId', 'name', 'tasks']
          }
        },
        {
          name: 'add_metric',
          description: 'Add a metric for an agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Agent ID' },
              name: { type: 'string', description: 'Metric name' },
              type: { type: 'string', description: 'Metric type' },
              value: { type: 'number', description: 'Metric value' }
            },
            required: ['agentId', 'name', 'type', 'value']
          }
        },
        {
          name: 'link_component_convention',
          description: 'Link a component to a convention',
          inputSchema: {
            type: 'object',
            properties: {
              componentName: { type: 'string', description: 'Component name' },
              conventionType: { type: 'string', description: 'Convention type' }
            },
            required: ['componentName', 'conventionType']
          }
        },
        {
          name: 'get_structure',
          description: 'Get project structure or agent knowledge',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'Optional agent ID to get specific agent knowledge' }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'initialize_schema': {
            await this.neo4j.initializeSchema();
            return {
              content: [{ type: 'text', text: 'Schema initialized successfully' }]
            };
          }

          case 'add_directory': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.path || typeof rawArgs.path !== 'string' ||
                !rawArgs.name || typeof rawArgs.name !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid directory parameters');
            }
            const args: AddDirectoryArgs = {
              path: rawArgs.path,
              name: rawArgs.name,
              description: typeof rawArgs.description === 'string' ? rawArgs.description : undefined
            };
            await this.neo4j.addDirectory(args.path, args.name, args.description);
            return {
              content: [{ type: 'text', text: 'Directory added successfully' }]
            };
          }

          case 'add_component': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.name || typeof rawArgs.name !== 'string' ||
                !rawArgs.type || typeof rawArgs.type !== 'string' ||
                !rawArgs.directory || typeof rawArgs.directory !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid component parameters');
            }
            const args: AddComponentArgs = {
              name: rawArgs.name,
              type: rawArgs.type,
              directory: rawArgs.directory
            };
            await this.neo4j.addComponent(args.name, args.type, args.directory);
            return {
              content: [{ type: 'text', text: 'Component added successfully' }]
            };
          }

          case 'add_convention': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.type || typeof rawArgs.type !== 'string' ||
                !rawArgs.name || typeof rawArgs.name !== 'string' ||
                !rawArgs.rule || typeof rawArgs.rule !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid convention parameters');
            }
            const args: AddConventionArgs = {
              type: rawArgs.type,
              name: rawArgs.name,
              rule: rawArgs.rule
            };
            await this.neo4j.addConventionRule(args.type, args.name, args.rule);
            return {
              content: [{ type: 'text', text: 'Convention rule added successfully' }]
            };
          }

          case 'add_agent': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.id || typeof rawArgs.id !== 'string' ||
                !rawArgs.name || typeof rawArgs.name !== 'string' ||
                !rawArgs.type || typeof rawArgs.type !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid agent parameters');
            }
            const args: AddAgentArgs = {
              id: rawArgs.id,
              name: rawArgs.name,
              type: rawArgs.type
            };
            await this.neo4j.addAgent(args.id, args.name, args.type);
            return {
              content: [{ type: 'text', text: 'Agent added successfully' }]
            };
          }

          case 'add_responsibility': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.agentId || typeof rawArgs.agentId !== 'string' ||
                !rawArgs.name || typeof rawArgs.name !== 'string' ||
                !Array.isArray(rawArgs.tasks)) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid responsibility parameters');
            }
            const args: AddResponsibilityArgs = {
              agentId: rawArgs.agentId,
              name: rawArgs.name,
              tasks: rawArgs.tasks.map(task => String(task))
            };
            await this.neo4j.addResponsibility(args.agentId, args.name, args.tasks);
            return {
              content: [{ type: 'text', text: 'Responsibility added successfully' }]
            };
          }

          case 'add_metric': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.agentId || typeof rawArgs.agentId !== 'string' ||
                !rawArgs.name || typeof rawArgs.name !== 'string' ||
                !rawArgs.type || typeof rawArgs.type !== 'string' ||
                typeof rawArgs.value !== 'number') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid metric parameters');
            }
            const args: AddMetricArgs = {
              agentId: rawArgs.agentId,
              name: rawArgs.name,
              type: rawArgs.type,
              value: rawArgs.value
            };
            await this.neo4j.addMetric(args.agentId, args.name, args.type, args.value);
            return {
              content: [{ type: 'text', text: 'Metric added successfully' }]
            };
          }

          case 'link_component_convention': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            if (!rawArgs?.componentName || typeof rawArgs.componentName !== 'string' ||
                !rawArgs.conventionType || typeof rawArgs.conventionType !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid link parameters');
            }
            const args: LinkComponentArgs = {
              componentName: rawArgs.componentName,
              conventionType: rawArgs.conventionType
            };
            await this.neo4j.linkComponentToConvention(args.componentName, args.conventionType);
            return {
              content: [{ type: 'text', text: 'Component linked to convention successfully' }]
            };
          }

          case 'get_structure': {
            const rawArgs = request.params.arguments as Record<string, unknown>;
            const args: GetStructureArgs = {
              agentId: typeof rawArgs?.agentId === 'string' ? rawArgs.agentId : undefined
            };
            const result = args.agentId ?
              await this.neo4j.getAgentKnowledge(args.agentId) :
              await this.neo4j.getProjectStructure();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Project Knowledge Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });

    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Project Knowledge MCP Server running on stdio');

    process.on('SIGINT', async () => {
      await this.neo4j.close();
      await this.server.close();
      process.exit(0);
    });
  }
}

const server = new ProjectKnowledgeServer();
server.run().catch(console.error);
