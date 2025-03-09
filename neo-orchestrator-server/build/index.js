#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
// Command parameter schemas
const BeliefManagementCommandSchema = z.object({
    belief: z.string().describe('The belief to manage'),
    action: z.enum(['add', 'remove', 'update']).describe('The action to perform on the belief'),
    value: z.any().optional().describe('The value of the belief (for add and update actions)'),
});
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
class NeoOrchestratorServer {
    constructor() {
        this.server = new Server({
            name: 'neo-orchestrator-server',
            version: '0.1.0',
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupResourceHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
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
    setupResourceHandlers() {
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
            }
            else if (uri === 'neo://workflows/agent') {
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
    async handleBeliefManagement(args) {
        try {
            const params = BeliefManagementCommandSchema.parse(args);
            // In a real implementation, this would interact with the belief management system
            // For now, we'll just return a success message
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Belief '${params.belief}' ${params.action}ed successfully`,
                            belief: params.belief,
                            action: params.action,
                            value: params.value,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
            }
            throw error;
        }
    }
    async handleDesireFormation(args) {
        try {
            const params = DesireFormationCommandSchema.parse(args);
            // In a real implementation, this would interact with the desire formation system
            // For now, we'll just return a success message
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Desire for goal '${params.goal}' formed successfully`,
                            goal: params.goal,
                            priority: params.priority,
                            context: params.context,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
            }
            throw error;
        }
    }
    async handleIntentionSelection(args) {
        try {
            const params = IntentionSelectionCommandSchema.parse(args);
            // In a real implementation, this would interact with the intention selection system
            // For now, we'll just return a success message with a selected intention
            const selectedOption = params.options[0]; // Just select the first option for now
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Intention for desire '${params.desire}' selected successfully`,
                            desire: params.desire,
                            selectedIntention: selectedOption,
                            options: params.options,
                            constraints: params.constraints,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
            }
            throw error;
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Neo Orchestrator MCP server running on stdio');
    }
}
const server = new NeoOrchestratorServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map