#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
  ,
  Request,
} from '@modelcontextprotocol/sdk/types.js';

interface Todo {
  id: string;
  title: string;
  description: string;
  complexity: number;
  codeExample?: string;
  isComplete: boolean;
}

class SoftwarePlanningServer {
  private server: Server;
  private currentGoal: string | null = null;
  private todos: Todo[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'software-planning-tool',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupPlanningTools();
    
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupPlanningTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'start_planning',
          description: 'Start a new planning session with a specific goal',
          inputSchema: {
            type: 'object',
            properties: {
              goal: {
                type: 'string',
                description: 'The software development goal to plan',
              },
            },
            required: ['goal'],
          },
        },
        {
          name: 'add_todo',
          description: 'Add a new todo item to the current plan',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the todo item',
              },
              description: {
                type: 'string',
                description: 'Detailed description',
              },
              complexity: {
                type: 'number',
                description: 'Complexity score (0-10)',
                minimum: 0,
                maximum: 10,
              },
              codeExample: {
                type: 'string',
                description: 'Optional code example',
              },
            },
            required: ['title', 'description', 'complexity'],
          },
        },
        {
          name: 'get_todos',
          description: 'Retrieve all todos in the current plan',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update_todo_status',
          description: 'Update the completion status of a todo item',
          inputSchema: {
            type: 'object',
            properties: {
              todoId: {
                type: 'string',
                description: 'ID of the todo item',
              },
              isComplete: {
                type: 'boolean',
                description: 'New completion status',
              },
            },
            required: ['todoId', 'isComplete'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: Request) => {
      if (!request.params) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Invalid request: missing params'
        );
      }

      switch (request.params.name) {
        case 'start_planning': {
          const { goal } = request.params.arguments as { goal: string };
          this.currentGoal = goal;
          this.todos = [];
          return {
            content: [
              {
                type: 'text',
                text: `Started planning session for goal: ${goal}`,
              },
            ],
          };
        }

        case 'add_todo': {
          if (!this.currentGoal) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'No active planning session. Call start_planning first.'
            );
          }

          const { title, description, complexity, codeExample } = request.params
            .arguments as {
            title: string;
            description: string;
            complexity: number;
            codeExample?: string;
          };

          const todo: Todo = {
            id: Math.random().toString(36).substring(2, 15),
            title,
            description,
            complexity,
            codeExample,
            isComplete: false,
          };

          this.todos.push(todo);
          return {
            content: [
              {
                type: 'text',
                text: `Added todo: ${title} (ID: ${todo.id})`,
              },
            ],
          };
        }

        case 'get_todos': {
          if (!this.currentGoal) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'No active planning session. Call start_planning first.'
            );
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    goal: this.currentGoal,
                    todos: this.todos,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'update_todo_status': {
          if (!this.currentGoal) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'No active planning session. Call start_planning first.'
            );
          }

          const { todoId, isComplete } = request.params.arguments as {
            todoId: string;
            isComplete: boolean;
          };

          const todo = this.todos.find((t) => t.id === todoId);
          if (!todo) {
            throw new McpError(ErrorCode.InvalidRequest, 'Todo not found');
          }

          todo.isComplete = isComplete;
          return {
            content: [
              {
                type: 'text',
                text: `Updated todo ${todoId} status to ${isComplete}`,
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Software Planning MCP server running on stdio');
  }
}

const server = new SoftwarePlanningServer();
server.run().catch(console.error);
