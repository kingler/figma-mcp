#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import winston from 'winston';
import config from './config.js';

// Logger setup
class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

// State management
interface BeliefState {
  belief: string;
  value: any;
  timestamp: number;
}

interface DesireState {
  goal: string;
  priority: number;
  context?: string;
  timestamp: number;
}

interface IntentionState {
  desire: string;
  selectedOption: string;
  constraints?: string[];
  timestamp: number;
}

class StateManager {
  private beliefs: Map<string, BeliefState>;
  private desires: Map<string, DesireState>;
  private intentions: Map<string, IntentionState>;
  private logger: Logger;

  constructor(logger: Logger) {
    this.beliefs = new Map();
    this.desires = new Map();
    this.intentions = new Map();
    this.logger = logger;
  }

  addBelief(belief: string, value: any): void {
    this.beliefs.set(belief, {
      belief,
      value,
      timestamp: Date.now()
    });
    this.logger.info(`Belief added: ${belief}`, { value });
  }

  removeBelief(belief: string): void {
    this.beliefs.delete(belief);
    this.logger.info(`Belief removed: ${belief}`);
  }

  addDesire(goal: string, priority: number, context?: string): void {
    this.desires.set(goal, {
      goal,
      priority,
      context,
      timestamp: Date.now()
    });
    this.logger.info(`Desire added: ${goal}`, { priority, context });
  }

  addIntention(desire: string, selectedOption: string, constraints?: string[]): void {
    this.intentions.set(desire, {
      desire,
      selectedOption,
      constraints,
      timestamp: Date.now()
    });
    this.logger.info(`Intention added: ${desire}`, { selectedOption, constraints });
  }

  getBelief(belief: string): BeliefState | undefined {
    return this.beliefs.get(belief);
  }

  getDesire(goal: string): DesireState | undefined {
    return this.desires.get(goal);
  }

  getIntention(desire: string): IntentionState | undefined {
    return this.intentions.get(desire);
  }
}

// Command parameter schemas with inferred types
const BeliefManagementCommandSchema = z.object({
  belief: z.string().describe('The belief to manage'),
  action: z.enum(['add', 'remove', 'update']).describe('The action to perform on the belief'),
  value: z.any().optional().describe('The value of the belief (for add and update actions)'),
});

type BeliefManagementCommand = z.infer<typeof BeliefManagementCommandSchema>;

const DesireFormationCommandSchema = z.object({
  goal: z.string().describe('The goal to form a desire for'),
  priority: z.number().min(1).max(10).describe('The priority of the desire (1-10)'),
  context: z.string().optional().describe('Additional context for the desire'),
});

const IntentionSelectionCommandSchema = z.object({
  desire: z.string().describe('The desire to select an intention for'),
  options: z.array(z.string()).min(1).describe('The available options for the intention'),
  constraints: z.array(z.string()).optional().describe('Constraints on the intention selection'),
});

// Workflow schemas
const SdlcWorkflowSchema = z.object({
  phase: z.enum(['requirements', 'design', 'implementation', 'testing', 'deployment']).describe('The SDLC phase'),
  artifacts: z.array(z.string()).describe('The artifacts produced in this phase'),
  status: z.enum(['not_started', 'in_progress', 'completed']).describe('The status of the phase'),
});

const AgentWorkflowSchema = z.object({
  agent: z.string().describe('The agent executing the workflow'),
  tasks: z.array(z.string()).describe('The tasks assigned to the agent'),
  status: z.enum(['not_started', 'in_progress', 'completed']).describe('The status of the workflow'),
});

export class NeoOrchestratorServer {
  private server: Server;
  private logger: Logger;
  private stateManager: StateManager;

  constructor() {
    this.logger = new Logger();
    this.stateManager = new StateManager(this.logger);
    
    this.server = new Server(
      {
        name: config.SERVER_NAME,
        version: config.SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Error handling
    this.server.onerror = (error) => {
      this.logger.error('[MCP Error]', { error: error.message, stack: error.stack });
    };
    
    process.on('SIGINT', async () => {
      this.logger.info('Shutting down server...', { env: config.NODE_ENV });
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'belief_management',
          description: 'Manage beliefs in the BDI reasoning layer',
          inputSchema: BeliefManagementCommandSchema,
        },
        {
          name: 'desire_formation',
          description: 'Form desires based on goals and objectives',
          inputSchema: DesireFormationCommandSchema,
        },
        {
          name: 'intention_selection',
          description: 'Select intentions to fulfill desires',
          inputSchema: IntentionSelectionCommandSchema,
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'belief_management':
          return this.handleBeliefManagement(request.params.arguments);
        case 'desire_formation':
          return this.handleDesireFormation(request.params.arguments);
        case 'intention_selection':
          return this.handleIntentionSelection(request.params.arguments);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'neo://workflows/sdlc',
          name: 'SDLC Workflow',
          description: 'Software Development Life Cycle workflow',
          mimeType: 'application/json',
        },
        {
          uri: 'neo://workflows/agent',
          name: 'Agent Workflow',
          description: 'Agent-specific workflow',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        {
          uriTemplate: 'neo://workflows/sdlc/{phase}',
          name: 'SDLC Phase Workflow',
          description: 'Workflow for a specific SDLC phase',
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'neo://workflows/agent/{agent}',
          name: 'Agent-specific Workflow',
          description: 'Workflow for a specific agent',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri === 'neo://workflows/sdlc') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                phases: ['requirements', 'design', 'implementation', 'testing', 'deployment'],
                currentPhase: 'implementation',
                status: 'in_progress',
              }, null, 2),
            },
          ],
        };
      } else if (uri === 'neo://workflows/agent') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                agents: ['architect', 'developer', 'tester'],
                workflows: {
                  architect: { status: 'completed' },
                  developer: { status: 'in_progress' },
                  tester: { status: 'not_started' },
                },
              }, null, 2),
            },
          ],
        };
      }
      
      // Handle templated resources
      const sdlcMatch = uri.match(/^neo:\/\/workflows\/sdlc\/(.+)$/);
      if (sdlcMatch) {
        const phase = sdlcMatch[1];
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                phase,
                artifacts: [`${phase}_document`, `${phase}_checklist`],
                status: 'in_progress',
              }, null, 2),
            },
          ],
        };
      }
      
      const agentMatch = uri.match(/^neo:\/\/workflows\/agent\/(.+)$/);
      if (agentMatch) {
        const agent = agentMatch[1];
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                agent,
                tasks: [`task_1_for_${agent}`, `task_2_for_${agent}`],
                status: 'in_progress',
              }, null, 2),
            },
          ],
        };
      }
      
      throw new McpError(ErrorCode.InvalidRequest, `Invalid URI: ${uri}`);
    });
  }

  private async handleBeliefManagement(args: unknown) {
    try {
      const params = BeliefManagementCommandSchema.parse(args);
      
      switch (params.action) {
        case 'add':
        case 'update':
          this.stateManager.addBelief(params.belief, params.value);
          break;
        case 'remove':
          this.stateManager.removeBelief(params.belief);
          break;
      }
      
      const belief = this.stateManager.getBelief(params.belief);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Belief '${params.belief}' ${params.action}ed successfully`,
              belief: belief,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error('Invalid parameters', { error: error.message });
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
      }
      throw error;
    }
  }

  private async handleDesireFormation(args: unknown) {
    try {
      const params = DesireFormationCommandSchema.parse(args);
      
      this.stateManager.addDesire(params.goal, params.priority, params.context);
      const desire = this.stateManager.getDesire(params.goal);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Desire for goal '${params.goal}' formed successfully`,
              desire: desire,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error('Invalid parameters', { error: error.message });
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
      }
      throw error;
    }
  }

  private async handleIntentionSelection(args: unknown) {
    try {
      const params = IntentionSelectionCommandSchema.parse(args);
      
      // Select the most appropriate option based on constraints
      const selectedOption = this.selectBestOption(params.options, params.constraints);
      this.stateManager.addIntention(params.desire, selectedOption, params.constraints);
      
      const intention = this.stateManager.getIntention(params.desire);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Intention for desire '${params.desire}' selected successfully`,
              intention: intention,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error('Invalid parameters', { error: error.message });
        throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
      }
      throw error;
    }
  }

  private selectBestOption(options: string[], constraints?: string[]): string {
    if (!constraints || constraints.length === 0) {
      return options[0];
    }

    // Simple scoring system - choose option that matches most constraints
    const scores = options.map(option => ({
      option,
      score: constraints.filter(constraint => 
        option.toLowerCase().includes(constraint.toLowerCase())
      ).length
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0].option;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Neo Orchestrator MCP server running on stdio');
  }
}

const server = new NeoOrchestratorServer();
server.run().catch((error) => {
  const logger = new Logger();
  logger.error('Server failed to start', { error: error.message, stack: error.stack });
});