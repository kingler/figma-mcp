#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request
} from '@modelcontextprotocol/sdk/types.js';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type UserFlowType = 'onboarding' | 'conversion' | 'retention' | 'support';
type ResearchType = 'survey' | 'interview' | 'usability' | 'analytics';

interface DesignUserFlowArgs {
  type: UserFlowType;
  steps: {
    name: string;
    description: string;
    interactions: string[];
  }[];
  constraints?: Record<string, unknown>;
}

interface ConductResearchArgs {
  type: ResearchType;
  target: {
    users: number;
    demographics?: Record<string, unknown>;
  };
  questions: string[];
  metrics?: string[];
}

interface AnalyzeUsabilityArgs {
  interface: string;
  tasks: {
    name: string;
    steps: string[];
    success_criteria: string[];
  }[];
  participants?: number;
}

interface GeneratePersonaArgs {
  data: {
    demographics: Record<string, unknown>;
    behaviors: string[];
    goals: string[];
    painPoints: string[];
  };
  context?: string;
}

const USER_FLOW_TYPES = ['onboarding', 'conversion', 'retention', 'support'] as const;
const RESEARCH_TYPES = ['survey', 'interview', 'usability', 'analytics'] as const;

function validateDesignUserFlowArgs(args: unknown): args is DesignUserFlowArgs {
  const a = args as Partial<DesignUserFlowArgs>;
  return typeof a.type === 'string' &&
    USER_FLOW_TYPES.includes(a.type as UserFlowType) &&
    Array.isArray(a.steps) &&
    a.steps.every(s =>
      typeof s.name === 'string' &&
      typeof s.description === 'string' &&
      Array.isArray(s.interactions) &&
      s.interactions.every(i => typeof i === 'string')
    ) &&
    (a.constraints === undefined || typeof a.constraints === 'object');
}

function validateConductResearchArgs(args: unknown): args is ConductResearchArgs {
  const a = args as Partial<ConductResearchArgs>;
  return typeof a.type === 'string' &&
    RESEARCH_TYPES.includes(a.type as ResearchType) &&
    typeof a.target === 'object' &&
    typeof a.target.users === 'number' &&
    (a.target.demographics === undefined || typeof a.target.demographics === 'object') &&
    Array.isArray(a.questions) &&
    a.questions.every(q => typeof q === 'string') &&
    (a.metrics === undefined || (Array.isArray(a.metrics) && a.metrics.every(m => typeof m === 'string')));
}

function validateAnalyzeUsabilityArgs(args: unknown): args is AnalyzeUsabilityArgs {
  const a = args as Partial<AnalyzeUsabilityArgs>;
  return typeof a.interface === 'string' &&
    Array.isArray(a.tasks) &&
    a.tasks.every(t =>
      typeof t.name === 'string' &&
      Array.isArray(t.steps) &&
      t.steps.every(s => typeof s === 'string') &&
      Array.isArray(t.success_criteria) &&
      t.success_criteria.every(c => typeof c === 'string')
    ) &&
    (a.participants === undefined || typeof a.participants === 'number');
}

function validateGeneratePersonaArgs(args: unknown): args is GeneratePersonaArgs {
  const a = args as Partial<GeneratePersonaArgs>;
  return typeof a.data === 'object' &&
    typeof a.data.demographics === 'object' &&
    Array.isArray(a.data.behaviors) &&
    a.data.behaviors.every(b => typeof b === 'string') &&
    Array.isArray(a.data.goals) &&
    a.data.goals.every(g => typeof g === 'string') &&
    Array.isArray(a.data.painPoints) &&
    a.data.painPoints.every(p => typeof p === 'string') &&
    (a.context === undefined || typeof a.context === 'string');
}

class UXDesignerServer {
  private server: Server;
  private userFlows: Map<string, object>;
  private research: Map<string, object>;
  private personas: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'ux-designer-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.userFlows = new Map();
    this.research = new Map();
    this.personas = new Map();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'design_user_flow',
          description: 'Design user flow and interactions',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['onboarding', 'conversion', 'retention', 'support'],
                description: 'Flow type'
              },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    interactions: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['name', 'description', 'interactions']
                },
                description: 'Flow steps'
              },
              constraints: {
                type: 'object',
                description: 'Design constraints'
              }
            },
            required: ['type', 'steps']
          }
        },
        {
          name: 'conduct_research',
          description: 'Conduct UX research',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['survey', 'interview', 'usability', 'analytics'],
                description: 'Research type'
              },
              target: {
                type: 'object',
                properties: {
                  users: { type: 'number' },
                  demographics: { type: 'object' }
                },
                required: ['users']
              },
              questions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Research questions'
              },
              metrics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Success metrics'
              }
            },
            required: ['type', 'target', 'questions']
          }
        },
        {
          name: 'analyze_usability',
          description: 'Analyze interface usability',
          inputSchema: {
            type: 'object',
            properties: {
              interface: { type: 'string', description: 'Interface to analyze' },
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    steps: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    success_criteria: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['name', 'steps', 'success_criteria']
                },
                description: 'Usability tasks'
              },
              participants: {
                type: 'number',
                description: 'Number of participants'
              }
            },
            required: ['interface', 'tasks']
          }
        },
        {
          name: 'generate_persona',
          description: 'Generate user persona',
          inputSchema: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  demographics: { type: 'object' },
                  behaviors: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  goals: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  painPoints: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['demographics', 'behaviors', 'goals', 'painPoints']
              },
              context: { type: 'string', description: 'Usage context' }
            },
            required: ['data']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          case 'design_user_flow': {
            if (!validateDesignUserFlowArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid design_user_flow arguments');
            }
            
            const flow = await this.designUserFlow(
              request.params.arguments.type,
              request.params.arguments.steps,
              request.params.arguments.constraints
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(flow, null, 2)
                }
              ]
            };
          }

          case 'conduct_research': {
            if (!validateConductResearchArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid conduct_research arguments');
            }

            const research = await this.conductResearch(
              request.params.arguments.type,
              request.params.arguments.target,
              request.params.arguments.questions,
              request.params.arguments.metrics
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(research, null, 2)
                }
              ]
            };
          }

          case 'analyze_usability': {
            if (!validateAnalyzeUsabilityArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid analyze_usability arguments');
            }

            const analysis = await this.analyzeUsability(
              request.params.arguments.interface,
              request.params.arguments.tasks,
              request.params.arguments.participants
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(analysis, null, 2)
                }
              ]
            };
          }

          case 'generate_persona': {
            if (!validateGeneratePersonaArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_persona arguments');
            }

            const persona = await this.generatePersona(
              request.params.arguments.data,
              request.params.arguments.context
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(persona, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[UX Design Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async designUserFlow(
    type: UserFlowType,
    steps: {
      name: string;
      description: string;
      interactions: string[];
    }[],
    constraints?: Record<string, unknown>
  ): Promise<object> {
    const flowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate user flow design
    const flow = {
      id: flowId,
      type,
      steps: steps.map((step, index) => ({
        ...step,
        id: `step-${index + 1}`,
        metrics: {
          completion_rate: Math.random(),
          time_spent: Math.floor(Math.random() * 60) + 10,
          error_rate: Math.random() * 0.1
        }
      })),
      constraints: constraints || {},
      analysis: {
        complexity: steps.length * Math.random(),
        efficiency: Math.random(),
        satisfaction: Math.random()
      },
      recommendations: [
        'Simplify step transitions',
        'Add progress indicators',
        'Improve error handling'
      ],
      metadata: {
        designer: 'ux-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.userFlows.set(flowId, flow);
    return flow;
  }

  private async conductResearch(
    type: ResearchType,
    target: {
      users: number;
      demographics?: Record<string, unknown>;
    },
    questions: string[],
    metrics?: string[]
  ): Promise<object> {
    const researchId = `research-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate research execution
    const research = {
      id: researchId,
      type,
      target,
      questions: questions.map(q => ({
        question: q,
        responses: Array.from({ length: target.users }, () => ({
          answer: `Simulated response for "${q}"`,
          sentiment: Math.random(),
          keywords: ['key1', 'key2', 'key3']
        }))
      })),
      metrics: metrics?.reduce((acc, metric) => ({
        ...acc,
        [metric]: {
          value: Math.random() * 100,
          trend: 'increasing',
          confidence: Math.random()
        }
      }), {}),
      insights: [
        {
          finding: 'Primary user need identified',
          confidence: Math.random(),
          impact: 'high',
          recommendations: [
            'Implement feature X',
            'Modify workflow Y'
          ]
        },
        {
          finding: 'Common pain point discovered',
          confidence: Math.random(),
          impact: 'medium',
          recommendations: [
            'Simplify process Z',
            'Add help documentation'
          ]
        }
      ],
      metadata: {
        researcher: 'ux-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.research.set(researchId, research);
    return research;
  }

  private async analyzeUsability(
    interface_name: string,
    tasks: {
      name: string;
      steps: string[];
      success_criteria: string[];
    }[],
    participants?: number
  ): Promise<object> {
    const numParticipants = participants || 5;
    
    // Simulate usability analysis
    return {
      interface: interface_name,
      participants: numParticipants,
      tasks: tasks.map(task => ({
        ...task,
        metrics: {
          success_rate: Math.random(),
          completion_time: Math.random() * 100,
          error_rate: Math.random() * 0.2,
          satisfaction: Math.random() * 5
        },
        observations: [
          'Users struggled with navigation',
          'Form validation was unclear',
          'Help documentation was helpful'
        ],
        heatmap: {
          clicks: Array.from({ length: 5 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            intensity: Math.random()
          }))
        }
      })),
      summary: {
        overall_usability: Math.random() * 100,
        key_issues: [
          {
            severity: 'high',
            description: 'Navigation structure is confusing',
            affected_tasks: ['task1', 'task2']
          },
          {
            severity: 'medium',
            description: 'Error messages need improvement',
            affected_tasks: ['task3']
          }
        ],
        recommendations: [
          'Redesign navigation menu',
          'Improve error messaging',
          'Add tooltips for complex features'
        ]
      },
      metadata: {
        analyzer: 'ux-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private async generatePersona(
    data: {
      demographics: Record<string, unknown>;
      behaviors: string[];
      goals: string[];
      painPoints: string[];
    },
    context?: string
  ): Promise<object> {
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate persona generation
    const persona = {
      id: personaId,
      name: `Persona ${personaId.slice(-4)}`,
      context: context || 'General usage',
      demographics: data.demographics,
      profile: {
        behaviors: data.behaviors.map(b => ({
          behavior: b,
          frequency: Math.random(),
          motivation: `Motivation for ${b}`
        })),
        goals: data.goals.map(g => ({
          goal: g,
          priority: Math.random(),
          timeline: ['short-term', 'medium-term', 'long-term'][
            Math.floor(Math.random() * 3)
          ]
        })),
        painPoints: data.painPoints.map(p => ({
          issue: p,
          severity: Math.random(),
          frequency: Math.random(),
          impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        }))
      },
      journey: {
        touchpoints: [
          'Discovery',
          'Evaluation',
          'Purchase',
          'Onboarding',
          'Usage',
          'Support'
        ].map(stage => ({
          stage,
          emotions: Array.from({ length: 3 }, () => Math.random()),
          painPoints: [`${stage} pain point 1`, `${stage} pain point 2`],
          opportunities: [`${stage} opportunity 1`, `${stage} opportunity 2`]
        }))
      },
      recommendations: {
        features: [
          'Feature recommendation 1',
          'Feature recommendation 2',
          'Feature recommendation 3'
        ],
        improvements: [
          'UX improvement 1',
          'UX improvement 2',
          'UX improvement 3'
        ],
        priorities: [
          'Short-term priority 1',
          'Medium-term priority 1',
          'Long-term priority 1'
        ]
      },
      metadata: {
        generator: 'ux-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.personas.set(personaId, persona);
    return persona;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('UX Designer MCP Server running on stdio');
  }
}

const server = new UXDesignerServer();
server.run().catch(console.error);