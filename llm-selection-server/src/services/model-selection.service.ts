import { LLMModel, ModelSelectionCriteria, CostEstimate, ModelCapability } from '../models/llm-model.js';
import { providerRegistry } from '../providers/provider-registry.js';

/**
 * Service for LLM model selection and cost estimation
 */
export class ModelSelectionService {
  private static instance: ModelSelectionService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ModelSelectionService {
    if (!ModelSelectionService.instance) {
      ModelSelectionService.instance = new ModelSelectionService();
    }
    return ModelSelectionService.instance;
  }

  /**
   * List all available models, optionally filtered by criteria
   * @param capability Optional capability to filter by
   * @param provider Optional provider to filter by
   * @param maxCost Optional maximum cost per 1K output tokens
   */
  public async listModels(
    capability?: string,
    provider?: string,
    maxCost?: number
  ): Promise<LLMModel[]> {
    let models = await providerRegistry.getAllModels();

    // Apply filters if provided
    if (capability) {
      models = models.filter(model => 
        model.capabilities.includes(capability)
      );
    }

    if (provider) {
      models = models.filter(model => 
        model.provider.toLowerCase() === provider.toLowerCase()
      );
    }

    if (maxCost !== undefined) {
      models = models.filter(model => 
        model.costPer1KTokens.output <= maxCost
      );
    }

    return models;
  }

  /**
   * Select the optimal model based on criteria
   * @param criteria The selection criteria
   */
  public async selectModel(criteria: ModelSelectionCriteria): Promise<{
    selectedModel: LLMModel;
    estimatedCost: number | null;
    budgetWarning: string | null;
  }> {
    // Get all models
    let candidateModels = await providerRegistry.getAllModels();
    
    // Filter by required capabilities
    if (criteria.requiredCapabilities && criteria.requiredCapabilities.length > 0) {
      candidateModels = candidateModels.filter(model => 
        criteria.requiredCapabilities!.every(cap => model.capabilities.includes(cap))
      );
    }

    // Filter by context length if specified
    if (criteria.contextLength) {
      candidateModels = candidateModels.filter(model => 
        model.contextWindow >= criteria.contextLength!
      );
    }

    // Filter by specialized domain if specified
    if (criteria.specializedDomain) {
      candidateModels = candidateModels.filter(model => 
        model.specializedDomains?.includes(criteria.specializedDomain!) || 
        !model.specializedDomains // Include models without specialized domains
      );
    }

    // Filter by preferred provider if specified
    if (criteria.preferredProvider) {
      // First try to find models from the preferred provider
      const preferredModels = candidateModels.filter(model => 
        model.provider.toLowerCase() === criteria.preferredProvider!.toLowerCase()
      );
      
      // If there are models from the preferred provider, use only those
      if (preferredModels.length > 0) {
        candidateModels = preferredModels;
      }
      // Otherwise, keep all models (fall back to any provider)
    }

    // Filter by fine-tuning requirement if specified
    if (criteria.requiresFineTuning) {
      candidateModels = candidateModels.filter(model => 
        model.finetuned === true
      );
    }

    // Filter by minimum performance rating if specified
    if (criteria.minPerformanceRating) {
      candidateModels = candidateModels.filter(model => 
        (model.performanceRating || 0) >= criteria.minPerformanceRating!
      );
    }

    // If no models match the criteria
    if (candidateModels.length === 0) {
      throw new Error('No models match the specified criteria. Consider relaxing some requirements.');
    }

    // Score and rank models based on priority
    let selectedModel: LLMModel;
    
    if (criteria.priority === 'cost') {
      // Sort by cost (cheapest first)
      candidateModels.sort((a, b) => a.costPer1KTokens.output - b.costPer1KTokens.output);
      selectedModel = candidateModels[0];
    } else if (criteria.priority === 'performance') {
      // Sort by performance rating if available, otherwise use cost as a proxy
      candidateModels.sort((a, b) => {
        const aRating = a.performanceRating || a.costPer1KTokens.output * 100;
        const bRating = b.performanceRating || b.costPer1KTokens.output * 100;
        return bRating - aRating;
      });
      selectedModel = candidateModels[0];
    } else {
      // Balanced approach: consider multiple factors
      candidateModels.sort((a, b) => {
        // Start with base scores
        let aScore = 0;
        let bScore = 0;
        
        // Context window (higher is better)
        aScore += a.contextWindow / 10000;
        bScore += b.contextWindow / 10000;
        
        // Cost (lower is better)
        aScore -= a.costPer1KTokens.output * 10;
        bScore -= b.costPer1KTokens.output * 10;
        
        // Performance rating (higher is better)
        aScore += (a.performanceRating || 0) * 2;
        bScore += (b.performanceRating || 0) * 2;
        
        // Recency (newer is better)
        if (a.releaseDate && b.releaseDate) {
          aScore += a.releaseDate.getTime() / 1000000000;
          bScore += b.releaseDate.getTime() / 1000000000;
        }
        
        // Specialized capabilities
        const specialCapabilities = [
          ModelCapability.Vision,
          ModelCapability.FunctionCalling,
          ModelCapability.ToolUse,
          ModelCapability.LongContext
        ];
        
        for (const cap of specialCapabilities) {
          if (a.capabilities.includes(cap)) aScore += 1;
          if (b.capabilities.includes(cap)) bScore += 1;
        }
        
        return bScore - aScore;
      });
      selectedModel = candidateModels[0];
    }

    // Calculate estimated cost if budget is a concern
    let estimatedCost: number | null = null;
    let budgetWarning: string | null = null;
    
    if (criteria.maxBudget) {
      // Rough estimate based on task description length and typical output ratio
      const estimatedInputTokens = criteria.taskDescription.length / 4; // Rough approximation
      const estimatedOutputTokens = estimatedInputTokens * 2; // Assuming output is twice as long as input
      
      const totalCost = (
        (estimatedInputTokens / 1000) * selectedModel.costPer1KTokens.input +
        (estimatedOutputTokens / 1000) * selectedModel.costPer1KTokens.output
      );
      
      estimatedCost = totalCost;
      
      if (totalCost > criteria.maxBudget) {
        budgetWarning = `Warning: Estimated cost ($${totalCost.toFixed(4)}) exceeds specified budget ($${criteria.maxBudget})`;
      }
    }

    return {
      selectedModel,
      estimatedCost,
      budgetWarning
    };
  }

  /**
   * Estimate the cost of using a model
   * @param modelId The ID of the model
   * @param inputTokens The number of input tokens
   * @param outputTokens The number of output tokens
   * @param numRequests The number of requests (default: 1)
   */
  public async estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    numRequests: number = 1
  ): Promise<CostEstimate> {
    // Get the model
    const model = await providerRegistry.getModelById(modelId);
    
    if (!model) {
      throw new Error(`Model with ID "${modelId}" not found`);
    }

    // Calculate costs
    const inputCost = (inputTokens / 1000) * model.costPer1KTokens.input * numRequests;
    const outputCost = (outputTokens / 1000) * model.costPer1KTokens.output * numRequests;
    const totalCost = inputCost + outputCost;

    // Get alternative models for comparison
    const allModels = await providerRegistry.getAllModels();
    const alternatives = allModels
      .filter(m => m.id !== modelId)
      .sort((a, b) => {
        const aCost = (inputTokens / 1000) * a.costPer1KTokens.input + 
                     (outputTokens / 1000) * a.costPer1KTokens.output;
        const bCost = (inputTokens / 1000) * b.costPer1KTokens.input + 
                     (outputTokens / 1000) * b.costPer1KTokens.output;
        return aCost - bCost;
      })
      .slice(0, 3)
      .map(m => {
        const altInputCost = (inputTokens / 1000) * m.costPer1KTokens.input * numRequests;
        const altOutputCost = (outputTokens / 1000) * m.costPer1KTokens.output * numRequests;
        const altTotalCost = altInputCost + altOutputCost;
        
        return {
          modelId: m.id,
          totalCost: altTotalCost,
          savings: totalCost - altTotalCost,
          savingsPercentage: ((1 - altTotalCost / totalCost) * 100)
        };
      });

    return {
      modelId,
      inputTokens,
      outputTokens,
      numRequests,
      inputCost,
      outputCost,
      totalCost,
      alternatives
    };
  }

  /**
   * Calculate the number of tokens in a text for a specific model
   * @param text The text to calculate tokens for
   * @param modelId The ID of the model to use for calculation
   */
  public async calculateTokens(text: string, modelId: string): Promise<number> {
    // Get the model
    const model = await providerRegistry.getModelById(modelId);
    
    if (!model) {
      throw new Error(`Model with ID "${modelId}" not found`);
    }

    // Get the provider for this model
    const provider = providerRegistry.getProvider(model.provider);
    
    if (!provider) {
      throw new Error(`Provider for model "${modelId}" not found`);
    }

    // Use the provider's token calculation method
    return provider.calculateTokens(text, modelId);
  }
}

// Export singleton instance
export const modelSelectionService = ModelSelectionService.getInstance();