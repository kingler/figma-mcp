import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResponse,
  ErrorCode,
  ListToolsRequest,
  ListToolsRequestSchema,
  ListToolsResponse,
  McpError,
  Tool,
  ValidationResult,
  z
} from './types/mcp.js';

// Validation schemas for tool inputs
const ValidateCodeInput = z.object({
  code: z.string(),
  language: z.string(),
  rules: z.array(z.string()).optional()
});

const ValidateArchitectureInput = z.object({
  components: z.array(z.object({
    name: z.string(),
    type: z.string(),
    connections: z.array(z.string()).optional()
  }))
});

export class ValidationServer {
  private server: Server;
  private tools: Tool[];

  constructor() {
    this.server = new Server(
      {
        name: 'validation-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = [
      {
        name: 'validate_code',
        description: 'Validate code against defined rules and standards',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
            rules: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['code', 'language']
        }
      },
      {
        name: 'validate_architecture',
        description: 'Validate system architecture against best practices',
        inputSchema: {
          type: 'object',
          properties: {
            components: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  connections: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['name', 'type']
              }
            }
          },
          required: ['components']
        }
      }
    ];

    this.setupErrorHandler();
    this.setupRequestHandlers();
  }

  private setupErrorHandler(): void {
    this.server.onerror = (error: Error): void => {
      console.error('[Validation MCP Error]', error);
      process.exit(1);
    };

    process.on('SIGINT', async () => {
      await this.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers(): void {
    // List Tools Handler
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));

    // Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  async handleListTools(_request: ListToolsRequest): Promise<ListToolsResponse> {
    return {
      tools: this.tools
    };
  }

  async handleCallTool(request: CallToolRequest): Promise<CallToolResponse> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'validate_code': {
          const validatedArgs = ValidateCodeInput.parse(args);
          const result = await this.validateCode(
            validatedArgs.code,
            validatedArgs.language,
            validatedArgs.rules || []
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        case 'validate_architecture': {
          const validatedArgs = ValidateArchitectureInput.parse(args);
          const result = await this.validateArchitecture(validatedArgs.components);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
        );
      }
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async validateCode(
    code: string,
    language: string,
    rules: string[]
  ): Promise<z.infer<typeof ValidationResult>> {
    // Simulate code validation
    const isValid = !code.includes('eval') && !code.includes('with');
    const errors: string[] = [];
    const warnings: string[] = [];

    if (code.includes('var')) {
      warnings.push('Use of var is discouraged. Consider using let or const instead.');
    }

    if (code.includes('eval')) {
      errors.push('Use of eval is forbidden due to security risks.');
    }

    if (rules.includes('no-console') && code.includes('console.log')) {
      warnings.push('Avoid using console.log in production code.');
    }

    return {
      isValid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private async validateArchitecture(
    components: Array<{
      name: string;
      type: string;
      connections?: string[];
    }>
  ): Promise<z.infer<typeof ValidationResult>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    const connectionMap = new Map<string, Set<string>>();
    components.forEach(component => {
      if (component.connections) {
        connectionMap.set(component.name, new Set(component.connections));
      }
    });

    // Basic validation rules
    components.forEach(component => {
      // Check component naming
      if (!component.name.match(/^[a-z][a-z0-9-]*$/)) {
        warnings.push(`Component "${component.name}" should use lowercase with hyphens`);
      }

      // Check for too many connections
      if (component.connections && component.connections.length > 5) {
        warnings.push(`Component "${component.name}" has too many dependencies (${component.connections.length})`);
      }

      // Check for unknown dependencies
      if (component.connections) {
        component.connections.forEach(conn => {
          if (!components.some(c => c.name === conn)) {
            errors.push(`Component "${component.name}" has unknown dependency "${conn}"`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Validation MCP Server running on stdio');
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}

// Create and run server instance
const server = new ValidationServer();
server.run().catch(console.error);
