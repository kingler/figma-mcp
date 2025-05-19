import { LLMProvider } from './types.js';
import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';

export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'gemini' | 'deepseek';

export class LLMProviderFactory {
  /**
   * Create an LLM provider based on the provider type
   * @param providerType The type of provider to create
   * @param apiKey Optional API key for the provider
   * @param model Optional model to use
   * @returns An LLM provider instance
   */
  static createProvider(providerType: ProviderType, apiKey?: string, model?: string): LLMProvider {
    switch (providerType) {
      case 'openai':
        return new OpenAIProvider(apiKey, model);
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      case 'ollama':
        // TODO: Implement Ollama provider
        throw new Error('Ollama provider not implemented yet');
      case 'gemini':
        // TODO: Implement Google Gemini provider
        throw new Error('Google Gemini provider not implemented yet');
      case 'deepseek':
        // TODO: Implement DeepSeek provider
        throw new Error('DeepSeek provider not implemented yet');
      default:
        // Default to OpenAI
        return new OpenAIProvider(apiKey, model);
    }
  }

  /**
   * Get the default provider based on environment variables
   * @returns The default LLM provider
   */
  static getDefaultProvider(): LLMProvider {
    const providerType = process.env.DEFAULT_PROVIDER_TYPE as ProviderType || 'openai';
    const model = process.env.DEFAULT_MODEL;
    
    // Use the appropriate API key based on provider type
    let apiKey: string | undefined;
    switch (providerType) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      case 'ollama':
        apiKey = process.env.OLLAMA_API_KEY;
        break;
      case 'gemini':
        apiKey = process.env.GEMINI_API_KEY;
        break;
      case 'deepseek':
        apiKey = process.env.DEEPSEEK_API_KEY;
        break;
    }
    
    return this.createProvider(providerType, apiKey, model);
  }
}
