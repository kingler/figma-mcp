#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config/config.js';
import { modelSelectionService } from './services/model-selection.service.js';
import { providerRegistry } from './providers/provider-registry.js';
import { ModelSelectionCriteria } from './models/llm-model.js';

// Define tools
const LLM_SELECTION_TOOLS: Tool[] = [
  {
    name: 'list_models',
    description: 'List all available LLM models with their capabilities and costs',
    inputSchema: {
      type: 'object',
      properties: {
        capability: {
          type: 'string',
          description: 'Filter models by capability (e.g., "reasoning", "vision", "code-generation")'
        },
        provider: {
          type: 'string',
          description: 'Filter models by provider (e.g., "OpenAI", "Anthropic", "Google")'
        },
        max_cost: {
          type: 'number',
          description: 'Maximum cost per 1K output tokens'
        }
      }
    }
  },
  {
    name: 'select_model',
    description: 'Select the optimal LLM model for a specific task based on requirements',
    inputSchema: {
      type: 'object',
      properties: {
        task_description: {
          type: 'string',
          description: 'Description of the task to be performed'
        },
        required_capabilities: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'List of capabilities required for the task'
        },
        context_length: {
          type: 'number',
          description: 'Estimated context length needed for the task (in tokens)'
        },
        priority: {
          type: 'string',
          enum: ['cost', 'performance', 'balanced'],
          description: 'Priority for model selection: cost-saving, performance, or balanced approach'
        },
        max_budget: {
          type: 'number',
          description: 'Maximum budget for the task (in USD)'
        },
        specialized_domain: {
          type: 'string',
          description: 'Specialized domain for the task (e.g., "medical", "legal", "finance")'
        },
        preferred_provider: {
          type: 'string',
          description: 'Preferred provider (e.g., "OpenAI", "Anthropic", "Google")'
        },
        requires_fine_tuning: {
          type: 'boolean',
          description: 'Whether the task requires a fine-tuned model'
        },
        min_performance_rating: {
          type: 'number',
          description: 'Minimum performance rating (1-10 scale)'
        }
      },
      required: ['task_description', 'priority']
    }
  },
  {
    name: 'estimate_cost',
    description: 'Estimate the cost of using a specific LLM model for a task',
    inputSchema: {
      type: 'object',
      properties: {
        model_id: {
          type: 'string',
          description: 'ID of the LLM model'
        },
        input_tokens: {
          type: 'number',
          description: 'Estimated number of input tokens'
        },
        output_tokens: {
          type: 'number',
          description: 'Estimated number of output tokens'
        },
        num_requests: {
          type: 'number',
          description: 'Number of requests/calls to the model',
          default: 1
        }
      },
      required: ['model_id', 'input_tokens', 'output_tokens']
    }
  },
  {
    name: 'calculate_tokens',
    description: 'Calculate the number of tokens in a text for a specific model',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to calculate tokens for'
        },
        model_id: {
          type: 'string',
          description: 'ID of the LLM model to use for calculation'
        }
      },
      required: ['text', 'model_id']
    }
  },
  {
    name: 'get_available_providers',
    description: 'Get a list of available LLM providers',
    inputSchema: {
      type: 'object',
      properties: {
        configured_only: {
          type: 'boolean',
          description: 'Whether to return only configured providers',
          default: true
        }
      }
    }
  }
];

// Create server
const server = new Server(
  {
    name: 'llm-selection-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: LLM_SELECTION_TOOLS,
}));

// Type definitions for tool arguments
interface ListModelsArgs {
  capability?: string;
  provider?: string;
  max_cost?: number;
}

interface SelectModelArgs {
  task_description: string;
  required_capabilities?: string[];
  context_length?: number;
  priority: 'cost' | 'performance' | 'balanced';
  max_budget?: number;
  specialized_domain?: string;
  preferred_provider?: string;
  requires_fine_tuning?: boolean;
  min_performance_rating?: number;
}

interface EstimateCostArgs {
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  num_requests?: number;
}

interface CalculateTokensArgs {
  text: string;
  model_id: string;
}

interface GetAvailableProvidersArgs {
  configured_only?: boolean;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_models': {
        // Type assertion with safety checks
        const typedArgs: ListModelsArgs = args ? args as ListModelsArgs : {};
        
        // Use the model selection service
        const models = await modelSelectionService.listModels(
          typedArgs.capability,
          typedArgs.provider,
          typedArgs.max_cost
        );

        // Format the response
        const modelsList = models.map(model => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          capabilities: model.capabilities.join(', '),
          cost: `$${model.costPer1KTokens.input} / $${model.costPer1KTokens.output} per 1K tokens (input/output)`,
          context_window: `${model.contextWindow} tokens`,
          best_for: model.bestFor.join(', '),
          strengths: model.strengths.join(', '),
          weaknesses: model.weaknesses.join(', '),
          release_date: model.releaseDate ? model.releaseDate.toISOString().split('T')[0] : undefined,
          performance_rating: model.performanceRating,
          model_family: model.modelFamily,
          model_size: model.modelSize,
          quantization: model.quantization,
          specialized_domains: model.specializedDomains?.join(', '),
          finetuned: model.finetuned
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(modelsList, null, 2)
            }
          ]
        };
      }

      case 'select_model': {
        // Validate required fields before type assertion
        if (!args || typeof args !== 'object') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Arguments must be provided as an object'
          );
        }

        const argsObj = args as Record<string, unknown>;
        
        if (!argsObj.task_description || !argsObj.priority) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Task description and priority are required'
          );
        }

        // Now safe to cast
        const typedArgs: SelectModelArgs = {
          task_description: String(argsObj.task_description),
          priority: argsObj.priority as 'cost' | 'performance' | 'balanced',
          required_capabilities: Array.isArray(argsObj.required_capabilities) 
            ? argsObj.required_capabilities.map(String)
            : undefined,
          context_length: typeof argsObj.context_length === 'number' 
            ? argsObj.context_length 
            : undefined,
          max_budget: typeof argsObj.max_budget === 'number' 
            ? argsObj.max_budget 
            : undefined,
          specialized_domain: typeof argsObj.specialized_domain === 'string'
            ? argsObj.specialized_domain
            : undefined,
          preferred_provider: typeof argsObj.preferred_provider === 'string'
            ? argsObj.preferred_provider
            : undefined,
          requires_fine_tuning: typeof argsObj.requires_fine_tuning === 'boolean'
            ? argsObj.requires_fine_tuning
            : undefined,
          min_performance_rating: typeof argsObj.min_performance_rating === 'number'
            ? argsObj.min_performance_rating
            : undefined
        };
        
        // Convert to ModelSelectionCriteria
        const criteria: ModelSelectionCriteria = {
          taskDescription: typedArgs.task_description,
          requiredCapabilities: typedArgs.required_capabilities,
          contextLength: typedArgs.context_length,
          priority: typedArgs.priority,
          maxBudget: typedArgs.max_budget,
          specializedDomain: typedArgs.specialized_domain,
          preferredProvider: typedArgs.preferred_provider,
          requiresFineTuning: typedArgs.requires_fine_tuning,
          minPerformanceRating: typedArgs.min_performance_rating
        };

        // Use the model selection service
        const { selectedModel, estimatedCost, budgetWarning } = await modelSelectionService.selectModel(criteria);

        // Format the response
        const response = {
          selected_model: {
            id: selectedModel.id,
            name: selectedModel.name,
            provider: selectedModel.provider,
            cost: `$${selectedModel.costPer1KTokens.input} / $${selectedModel.costPer1KTokens.output} per 1K tokens (input/output)`,
            context_window: `${selectedModel.contextWindow} tokens`,
            strengths: selectedModel.strengths.join(', '),
            best_for: selectedModel.bestFor.join(', '),
            capabilities: selectedModel.capabilities.join(', '),
            performance_rating: selectedModel.performanceRating,
            model_family: selectedModel.modelFamily,
            model_size: selectedModel.modelSize
          },
          task_description: typedArgs.task_description,
          priority: typedArgs.priority,
          estimated_cost: estimatedCost ? `$${estimatedCost.toFixed(4)}` : 'Not calculated',
          budget_warning: budgetWarning,
          selection_criteria: {
            required_capabilities: typedArgs.required_capabilities,
            context_length: typedArgs.context_length,
            max_budget: typedArgs.max_budget,
            specialized_domain: typedArgs.specialized_domain,
            preferred_provider: typedArgs.preferred_provider,
            requires_fine_tuning: typedArgs.requires_fine_tuning,
            min_performance_rating: typedArgs.min_performance_rating
          }
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case 'estimate_cost': {
        // Validate required fields before type assertion
        if (!args || typeof args !== 'object') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Arguments must be provided as an object'
          );
        }

        const argsObj = args as Record<string, unknown>;
        
        if (!argsObj.model_id || argsObj.input_tokens === undefined || argsObj.output_tokens === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Model ID, input tokens, and output tokens are required'
          );
        }

        // Now safe to cast
        const typedArgs: EstimateCostArgs = {
          model_id: String(argsObj.model_id),
          input_tokens: Number(argsObj.input_tokens),
          output_tokens: Number(argsObj.output_tokens),
          num_requests: typeof argsObj.num_requests === 'number' ? argsObj.num_requests : 1
        };

        // Use the model selection service
        const costEstimate = await modelSelectionService.estimateCost(
          typedArgs.model_id,
          typedArgs.input_tokens,
          typedArgs.output_tokens,
          typedArgs.num_requests
        );

        // Format the response
        const response = {
          model: {
            id: costEstimate.modelId,
            name: (await providerRegistry.getModelById(costEstimate.modelId))?.name || costEstimate.modelId
          },
          cost_breakdown: {
            input_cost: `$${costEstimate.inputCost.toFixed(4)} (${costEstimate.inputTokens} tokens)`,
            output_cost: `$${costEstimate.outputCost.toFixed(4)} (${costEstimate.outputTokens} tokens)`,
            total_cost: `$${costEstimate.totalCost.toFixed(4)}`,
            num_requests: costEstimate.numRequests
          },
          alternatives: costEstimate.alternatives?.map(alt => ({
            id: alt.modelId,
            name: (alt as any).name || alt.modelId,
            total_cost: `$${alt.totalCost.toFixed(4)}`,
            savings: `$${alt.savings.toFixed(4)} (${alt.savingsPercentage.toFixed(1)}%)`
          }))
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case 'calculate_tokens': {
        // Validate required fields before type assertion
        if (!args || typeof args !== 'object') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Arguments must be provided as an object'
          );
        }

        const argsObj = args as Record<string, unknown>;
        
        if (!argsObj.text || !argsObj.model_id) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Text and model ID are required'
          );
        }

        // Now safe to cast
        const typedArgs: CalculateTokensArgs = {
          text: String(argsObj.text),
          model_id: String(argsObj.model_id)
        };

        // Use the model selection service
        const tokenCount = await modelSelectionService.calculateTokens(
          typedArgs.text,
          typedArgs.model_id
        );

        // Format the response
        const response = {
          text_length: typedArgs.text.length,
          token_count: tokenCount,
          model_id: typedArgs.model_id,
          model_name: (await providerRegistry.getModelById(typedArgs.model_id))?.name || typedArgs.model_id,
          characters_per_token: (typedArgs.text.length / tokenCount).toFixed(2)
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case 'get_available_providers': {
        // Type assertion with safety checks
        const typedArgs: GetAvailableProvidersArgs = args ? args as GetAvailableProvidersArgs : {};
        
        // Default to configured only
        const configuredOnly = typedArgs.configured_only !== false;
        
        // Get providers
        const providers = configuredOnly
          ? providerRegistry.getConfiguredProviders()
          : providerRegistry.getAllProviders();
        
        // Format the response
        const providersList = providers.map(provider => ({
          name: provider.getName(),
          base_url: provider.getBaseUrl(),
          configured: provider.isConfigured()
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(providersList, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : String(error)
    );
  }
});

// Error handling
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

// Run server
async function runServer() {
  console.error('Starting LLM Selection MCP Server...');
  
  // Log configured providers
  const configuredProviders = providerRegistry.getConfiguredProviders();
  console.error(`Configured providers: ${configuredProviders.map(p => p.getName()).join(', ') || 'None'}`);
  
  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LLM Selection MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});