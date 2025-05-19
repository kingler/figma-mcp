import { LLMModel, ModelPerformanceMetrics } from '../models/llm-model.js';

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Get the name of the provider
   */
  getName(): string;

  /**
   * Get all available models from this provider
   */
  getModels(): Promise<LLMModel[]>;

  /**
   * Check if a model is available from this provider
   * @param modelId The ID of the model to check
   */
  isModelAvailable(modelId: string): Promise<boolean>;

  /**
   * Get a specific model by ID
   * @param modelId The ID of the model to get
   */
  getModel(modelId: string): Promise<LLMModel | null>;

  /**
   * Get performance metrics for a model
   * @param modelId The ID of the model to get metrics for
   */
  getModelPerformanceMetrics(modelId: string): Promise<ModelPerformanceMetrics | null>;

  /**
   * Check if the provider is configured (has API keys, etc.)
   */
  isConfigured(): boolean;

  /**
   * Get the base URL for the provider's API
   */
  getBaseUrl(): string;

  /**
   * Get the API key for the provider
   */
  getApiKey(): string;

  /**
   * Calculate the number of tokens in a text for a specific model
   * @param text The text to calculate tokens for
   * @param modelId The ID of the model to use for calculation
   */
  calculateTokens(text: string, modelId: string): Promise<number>;
}

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  protected name: string;
  protected baseUrl: string;
  protected apiKey: string;
  protected models: Map<string, LLMModel> = new Map();

  constructor(name: string, baseUrl: string, apiKey: string) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  getName(): string {
    return this.name;
  }

  abstract getModels(): Promise<LLMModel[]>;

  async isModelAvailable(modelId: string): Promise<boolean> {
    const models = await this.getModels();
    return models.some(model => model.id === modelId);
  }

  async getModel(modelId: string): Promise<LLMModel | null> {
    const models = await this.getModels();
    return models.find(model => model.id === modelId) || null;
  }

  abstract getModelPerformanceMetrics(modelId: string): Promise<ModelPerformanceMetrics | null>;

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  abstract calculateTokens(text: string, modelId: string): Promise<number>;
}