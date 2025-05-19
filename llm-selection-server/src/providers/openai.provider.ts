import axios from 'axios';
import { config } from '../config/config.js';
import { LLMModel, ModelPerformanceMetrics, ModelCapability } from '../models/llm-model.js';
import { BaseLLMProvider } from './provider.interface.js';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  private modelsCache: LLMModel[] | null = null;
  private modelsCacheExpiry: Date | null = null;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  constructor() {
    super(
      'OpenAI',
      config.openai.baseUrl,
      config.openai.apiKey
    );
  }

  /**
   * Get all available models from OpenAI
   */
  async getModels(): Promise<LLMModel[]> {
    // Check cache first
    if (this.modelsCache && this.modelsCacheExpiry && this.modelsCacheExpiry > new Date()) {
      return this.modelsCache;
    }

    // If not configured, return predefined models
    if (!this.isConfigured()) {
      return this.getPredefinedModels();
    }

    try {
      // Fetch models from OpenAI API
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Organization': config.openai.orgId || ''
        }
      });

      // Filter and map to our model format
      const openaiModels = response.data.data;
      const mappedModels = this.mapOpenAIModels(openaiModels);

      // Update cache
      this.modelsCache = mappedModels;
      this.modelsCacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);

      return mappedModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      // Fallback to predefined models
      return this.getPredefinedModels();
    }
  }

  /**
   * Get performance metrics for a model
   * @param modelId The ID of the model to get metrics for
   */
  async getModelPerformanceMetrics(modelId: string): Promise<ModelPerformanceMetrics | null> {
    // For now, return hardcoded metrics
    // In a real implementation, this could fetch from a database or API
    const metrics: Record<string, ModelPerformanceMetrics> = {
      'gpt-4o': {
        modelId: 'gpt-4o',
        averageResponseTime: 1200,
        tokensPerSecond: 45,
        accuracyScore: 0.95,
        reasoningScore: 0.96,
        creativityScore: 0.92,
        codingScore: 0.94,
        instructionFollowingScore: 0.97,
        benchmarks: {
          'mmlu': 0.90,
          'hellaswag': 0.92,
          'truthfulqa': 0.89
        }
      },
      'gpt-4-turbo': {
        modelId: 'gpt-4-turbo',
        averageResponseTime: 1500,
        tokensPerSecond: 40,
        accuracyScore: 0.93,
        reasoningScore: 0.94,
        creativityScore: 0.90,
        codingScore: 0.92,
        instructionFollowingScore: 0.95,
        benchmarks: {
          'mmlu': 0.87,
          'hellaswag': 0.90,
          'truthfulqa': 0.86
        }
      },
      'gpt-4': {
        modelId: 'gpt-4',
        averageResponseTime: 2000,
        tokensPerSecond: 30,
        accuracyScore: 0.92,
        reasoningScore: 0.93,
        creativityScore: 0.89,
        codingScore: 0.91,
        instructionFollowingScore: 0.94,
        benchmarks: {
          'mmlu': 0.86,
          'hellaswag': 0.89,
          'truthfulqa': 0.85
        }
      },
      'gpt-3.5-turbo': {
        modelId: 'gpt-3.5-turbo',
        averageResponseTime: 800,
        tokensPerSecond: 60,
        accuracyScore: 0.85,
        reasoningScore: 0.82,
        creativityScore: 0.84,
        codingScore: 0.83,
        instructionFollowingScore: 0.86,
        benchmarks: {
          'mmlu': 0.70,
          'hellaswag': 0.85,
          'truthfulqa': 0.72
        }
      }
    };

    return metrics[modelId] || null;
  }

  /**
   * Calculate the number of tokens in a text for a specific model
   * @param text The text to calculate tokens for
   * @param modelId The ID of the model to use for calculation
   */
  async calculateTokens(text: string, modelId: string): Promise<number> {
    // In a real implementation, this would use a tokenizer like tiktoken
    // For now, use a simple approximation
    // GPT models use roughly 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Map OpenAI API models to our model format
   * @param openaiModels The models from the OpenAI API
   */
  private mapOpenAIModels(openaiModels: any[]): LLMModel[] {
    // Filter to only include relevant models
    const relevantModels = openaiModels.filter(model => {
      const id = model.id.toLowerCase();
      return (
        id.includes('gpt-4') || 
        id.includes('gpt-3.5') || 
        id.includes('dall-e') || 
        id.includes('whisper') ||
        id.includes('text-embedding')
      );
    });

    // Map to our model format
    return relevantModels.map(model => this.mapOpenAIModel(model));
  }

  /**
   * Map a single OpenAI API model to our model format
   * @param openaiModel The model from the OpenAI API
   */
  private mapOpenAIModel(openaiModel: any): LLMModel {
    const id = openaiModel.id.toLowerCase();
    
    // Find the predefined model if it exists
    const predefinedModel = this.getPredefinedModels().find(m => m.id === id);
    
    if (predefinedModel) {
      return {
        ...predefinedModel,
        apiEndpoint: `${this.baseUrl}/chat/completions`
      };
    }

    // Otherwise, create a new model with default values
    const capabilities: string[] = [];
    
    if (id.includes('gpt')) {
      capabilities.push(ModelCapability.TextGeneration);
      capabilities.push(ModelCapability.Reasoning);
    }
    
    if (id.includes('gpt-4') || id.includes('gpt-3.5')) {
      capabilities.push(ModelCapability.CodeGeneration);
      capabilities.push(ModelCapability.CreativeWriting);
      capabilities.push(ModelCapability.FunctionCalling);
    }
    
    if (id.includes('dall-e')) {
      capabilities.push(ModelCapability.Vision);
    }
    
    if (id.includes('whisper')) {
      capabilities.push(ModelCapability.Audio);
    }
    
    if (id.includes('embedding')) {
      capabilities.push(ModelCapability.Embedding);
    }

    return {
      id: openaiModel.id,
      name: openaiModel.id,
      provider: 'OpenAI',
      capabilities,
      costPer1KTokens: {
        input: 0.01,  // Default values
        output: 0.03
      },
      contextWindow: id.includes('gpt-4-turbo') ? 128000 : 
                     id.includes('gpt-4') ? 8192 : 
                     id.includes('gpt-3.5') ? 16385 : 
                     4096,
      strengths: [],
      weaknesses: [],
      bestFor: [],
      apiEndpoint: `${this.baseUrl}/chat/completions`
    };
  }

  /**
   * Get predefined models for OpenAI
   */
  private getPredefinedModels(): LLMModel[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.TextGeneration,
          ModelCapability.CodeGeneration,
          ModelCapability.Reasoning,
          ModelCapability.CreativeWriting,
          ModelCapability.Vision,
          ModelCapability.FunctionCalling,
          ModelCapability.ToolUse
        ],
        costPer1KTokens: {
          input: 0.005,
          output: 0.015
        },
        contextWindow: 128000,
        strengths: [
          'Multimodal capabilities',
          'Improved reasoning',
          'Faster response time',
          'Strong coding abilities',
          'Tool use capabilities'
        ],
        weaknesses: [
          'Expensive compared to GPT-3.5',
          'May hallucinate under certain conditions'
        ],
        bestFor: [
          'Complex reasoning tasks',
          'Multimodal applications',
          'Advanced coding',
          'Tool use scenarios'
        ],
        releaseDate: new Date('2024-05-13'),
        performanceRating: 9.5,
        modelFamily: 'GPT-4',
        apiEndpoint: `${this.baseUrl}/chat/completions`
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.TextGeneration,
          ModelCapability.CodeGeneration,
          ModelCapability.Reasoning,
          ModelCapability.CreativeWriting,
          ModelCapability.Vision,
          ModelCapability.FunctionCalling,
          ModelCapability.ToolUse
        ],
        costPer1KTokens: {
          input: 0.01,
          output: 0.03
        },
        contextWindow: 128000,
        strengths: [
          'High reasoning capability',
          'Large context window',
          'Strong coding abilities',
          'Tool use capabilities'
        ],
        weaknesses: [
          'Expensive',
          'Can be slower than smaller models'
        ],
        bestFor: [
          'Complex reasoning tasks',
          'Long context processing',
          'Advanced coding'
        ],
        releaseDate: new Date('2023-11-06'),
        performanceRating: 9.0,
        modelFamily: 'GPT-4',
        apiEndpoint: `${this.baseUrl}/chat/completions`
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.TextGeneration,
          ModelCapability.CodeGeneration,
          ModelCapability.Reasoning,
          ModelCapability.CreativeWriting,
          ModelCapability.FunctionCalling
        ],
        costPer1KTokens: {
          input: 0.03,
          output: 0.06
        },
        contextWindow: 8192,
        strengths: [
          'High reasoning capability',
          'Strong coding abilities',
          'Good at following instructions'
        ],
        weaknesses: [
          'Very expensive',
          'Smaller context window than Turbo',
          'Can be slower'
        ],
        bestFor: [
          'High-precision tasks',
          'Complex reasoning',
          'Tasks requiring careful instruction following'
        ],
        releaseDate: new Date('2023-03-14'),
        performanceRating: 8.8,
        modelFamily: 'GPT-4',
        apiEndpoint: `${this.baseUrl}/chat/completions`
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.TextGeneration,
          ModelCapability.CodeGeneration,
          ModelCapability.Reasoning,
          ModelCapability.FunctionCalling
        ],
        costPer1KTokens: {
          input: 0.0015,
          output: 0.002
        },
        contextWindow: 16385,
        strengths: [
          'Fast response time',
          'Cost-effective',
          'Good general capabilities'
        ],
        weaknesses: [
          'Less reasoning capability than GPT-4',
          'Can miss nuance in complex instructions'
        ],
        bestFor: [
          'Simple to moderate tasks',
          'Cost-sensitive applications',
          'When speed is important'
        ],
        releaseDate: new Date('2022-11-30'),
        performanceRating: 7.5,
        modelFamily: 'GPT-3.5',
        apiEndpoint: `${this.baseUrl}/chat/completions`
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.Embedding
        ],
        costPer1KTokens: {
          input: 0.00013,
          output: 0
        },
        contextWindow: 8191,
        strengths: [
          'High-quality embeddings',
          'Good for semantic search',
          'Supports multiple languages'
        ],
        weaknesses: [
          'More expensive than small embedding model',
          'Overkill for simple use cases'
        ],
        bestFor: [
          'Semantic search',
          'Document retrieval',
          'Content recommendation'
        ],
        releaseDate: new Date('2024-01-25'),
        performanceRating: 8.5,
        modelFamily: 'Embedding',
        apiEndpoint: `${this.baseUrl}/embeddings`
      },
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.Embedding
        ],
        costPer1KTokens: {
          input: 0.00002,
          output: 0
        },
        contextWindow: 8191,
        strengths: [
          'Very cost-effective',
          'Good performance for most use cases',
          'Fast processing'
        ],
        weaknesses: [
          'Lower dimensionality than large model',
          'Slightly lower quality than large model'
        ],
        bestFor: [
          'Cost-sensitive embedding applications',
          'High-volume embedding generation',
          'Simple semantic search'
        ],
        releaseDate: new Date('2024-01-25'),
        performanceRating: 7.8,
        modelFamily: 'Embedding',
        apiEndpoint: `${this.baseUrl}/embeddings`
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'OpenAI',
        capabilities: [
          ModelCapability.Vision
        ],
        costPer1KTokens: {
          input: 0,  // DALL-E pricing is per image, not per token
          output: 0
        },
        contextWindow: 4096,  // Prompt length
        strengths: [
          'High-quality image generation',
          'Good at following detailed instructions',
          'Understands complex concepts'
        ],
        weaknesses: [
          'Expensive per image',
          'Limited to image generation'
        ],
        bestFor: [
          'Image generation',
          'Creative visual content',
          'Design ideation'
        ],
        releaseDate: new Date('2023-10-03'),
        performanceRating: 9.0,
        modelFamily: 'DALL-E',
        apiEndpoint: `${this.baseUrl}/images/generations`
      }
    ];
  }
}