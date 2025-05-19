import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Neo4jManager, Thought } from './neo4j-manager.js';

interface SequentialThinkingArgs {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}

class SequentialThinkingServer {
  private server: Server;
  private neo4j: Neo4jManager;

  constructor() {
    this.server = new Server(
      {
        name: 'sequential-thinking-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.neo4j = new Neo4jManager();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sequential_thinking',
          description: 'Facilitates a detailed, step-by-step thinking process for problem-solving and analysis',
          inputSchema: {
            type: 'object',
            properties: {
              thought: {
                type: 'string',
                description: 'The current thinking step',
              },
              nextThoughtNeeded: {
                type: 'boolean',
                description: 'Whether another thought step is needed',
              },
              thoughtNumber: {
                type: 'integer',
                description: 'Current thought number',
                minimum: 1,
              },
              totalThoughts: {
                type: 'integer',
                description: 'Estimated total thoughts needed',
                minimum: 1,
              },
              isRevision: {
                type: 'boolean',
                description: 'Whether this revises previous thinking',
              },
              revisesThought: {
                type: 'integer',
                description: 'Which thought is being reconsidered',
              },
              branchFromThought: {
                type: 'integer',
                description: 'Branching point thought number',
              },
              branchId: {
                type: 'string',
                description: 'Branch identifier',
              },
              needsMoreThoughts: {
                type: 'boolean',
                description: 'If more thoughts are needed',
              },
            },
            required: ['thought', 'nextThoughtNeeded', 'thoughtNumber', 'totalThoughts'],
          },
        },
      ],
    }));

    // Handle sequential thinking tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'sequential_thinking') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!request.params.arguments || typeof request.params.arguments !== 'object') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Arguments must be provided as an object'
        );
      }

      // Validate required properties exist
      const args = request.params.arguments as Record<string, unknown>;
      if (!args.thought || typeof args.thought !== 'string' ||
          !args.thoughtNumber || typeof args.thoughtNumber !== 'number' ||
          !args.totalThoughts || typeof args.totalThoughts !== 'number' ||
          typeof args.nextThoughtNeeded !== 'boolean') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing or invalid required parameters: thought, thoughtNumber, totalThoughts, nextThoughtNeeded'
        );
      }

      const validatedArgs: SequentialThinkingArgs = {
        thought: args.thought,
        thoughtNumber: args.thoughtNumber,
        totalThoughts: args.totalThoughts,
        nextThoughtNeeded: args.nextThoughtNeeded,
        isRevision: args.isRevision as boolean | undefined,
        revisesThought: args.revisesThought as number | undefined,
        branchFromThought: args.branchFromThought as number | undefined,
        branchId: args.branchId as string | undefined,
        needsMoreThoughts: args.needsMoreThoughts as boolean | undefined,
      };
      const {
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        isRevision,
        revisesThought,
        branchFromThought,
        branchId,
        needsMoreThoughts,
      } = validatedArgs;

      try {
        // Validate inputs
        if (thoughtNumber > totalThoughts && !needsMoreThoughts) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Thought number exceeds total thoughts without needsMoreThoughts flag'
          );
        }

        if (isRevision && !revisesThought) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Revision requires revisesThought parameter'
          );
        }

        if (branchId && !branchFromThought) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Branch requires branchFromThought parameter'
          );
        }

        // Validate thought sequence
        const isValidSequence = await this.neo4j.validateThoughtSequence(thoughtNumber, branchId);
        if (!isValidSequence) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid thought sequence - thoughts must be sequential'
          );
        }

        // Handle revision
        if (isRevision) {
          const originalThought = await this.neo4j.getThought(revisesThought!, branchId);
          if (!originalThought) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Cannot revise thought ${revisesThought} - not found`
            );
          }
        }

        // Handle branching
        if (branchId && branchFromThought) {
          const branchPoint = await this.neo4j.getThought(branchFromThought);
          if (!branchPoint) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Cannot branch from thought ${branchFromThought} - not found`
            );
          }
        }

        // Store the thought
        await this.neo4j.addThought({
          content: thought,
          number: thoughtNumber,
          branchId,
          revisedFrom: isRevision ? revisesThought : undefined
        });

        // Get related knowledge
        const relatedKnowledge = await this.neo4j.getRelatedKnowledge(thought);

        // Return response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                thoughtStored: true,
                nextThoughtNeeded,
                currentThought: thoughtNumber,
                totalThoughts: needsMoreThoughts ? totalThoughts + 1 : totalThoughts,
                branchId: branchId || 'main',
                isRevision: Boolean(isRevision),
                revisedThought: revisesThought,
                relatedKnowledge
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('[Sequential Thinking Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Sequential Thinking MCP server running on stdio');

    process.on('SIGINT', async () => {
      await this.neo4j.close();
      await this.server.close();
      process.exit(0);
    });
  }
}

const server = new SequentialThinkingServer();
server.run().catch(console.error);
