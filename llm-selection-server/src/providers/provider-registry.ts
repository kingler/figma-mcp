import { config } from '../config/config.js';
import { LLMProvider } from './provider.interface.js';
import { OpenAIProvider } from './openai.provider.js';

/**
 * Registry for LLM providers
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, LLMProvider> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.registerProviders();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register all providers
   */
  private registerProviders(): void {
    // Register OpenAI provider if configured
    if (config.openai.apiKey) {
      this.providers.set('openai', new OpenAIProvider());
    }

    // TODO: Register other providers as they are implemented
    // if (config.anthropic.apiKey) {
    //   this.providers.set('anthropic', new AnthropicProvider());
    // }
    // 
    // if (config.deepseek.apiKey) {
    //   this.providers.set('deepseek', new DeepSeekProvider());
    // }
    // 
    // etc.
  }

  /**
   * Get a provider by name
   * @param name The name of the provider
   */
  public getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Get all registered providers
   */
  public getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all configured providers
   */
  public getConfiguredProviders(): LLMProvider[] {
    return this.getAllProviders().filter(provider => provider.isConfigured());
  }

  /**
   * Check if a provider is registered
   * @param name The name of the provider
   */
  public hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }

  /**
   * Register a new provider
   * @param name The name of the provider
   * @param provider The provider instance
   */
  public registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  /**
   * Unregister a provider
   * @param name The name of the provider
   */
  public unregisterProvider(name: string): boolean {
    return this.providers.delete(name.toLowerCase());
  }

  /**
   * Get a model by ID from any provider
   * @param modelId The ID of the model
   */
  public async getModelById(modelId: string): Promise<any | null> {
    for (const provider of this.getAllProviders()) {
      const model = await provider.getModel(modelId);
      if (model) {
        return model;
      }
    }
    return null;
  }

  /**
   * Get all available models from all providers
   */
  public async getAllModels(): Promise<any[]> {
    const allModels: any[] = [];
    
    for (const provider of this.getAllProviders()) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Error fetching models from ${provider.getName()}:`, error);
      }
    }
    
    return allModels;
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();