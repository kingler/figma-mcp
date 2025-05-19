import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMOptions } from './types.js';

export class AnthropicProvider implements LLMProvider {
  private client: any;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'claude-3-opus-20240229') {
    // Use provided API key or environment variable
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Generate text using Anthropic
   * @param prompt The prompt to send to Anthropic
   * @param options Additional options for the LLM
   * @returns The generated text
   */
  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 2000;
    const stopSequences = options?.stopSequences;
    const systemMessage = options?.systemMessage || 'You are a helpful assistant specialized in software testing and quality assurance.';

    try {
      const response = await this.client.messages.create({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: systemMessage,
        temperature,
        max_tokens: maxTokens,
        stop_sequences: stopSequences,
      });

      return response.content[0]?.text || '';
    } catch (error) {
      console.error('Error generating text with Anthropic:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }

  /**
   * Generate structured data using Anthropic
   * @param prompt The prompt to send to Anthropic
   * @param schema The JSON schema for the expected response
   * @param options Additional options for the LLM
   * @returns The generated structured data
   */
  async generateStructuredData<T>(prompt: string, schema: object, options?: LLMOptions): Promise<T> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 2000;
    const systemMessage = options?.systemMessage || 'You are a helpful assistant specialized in software testing and quality assurance.';

    try {
      // Add schema instructions to the prompt
      const schemaPrompt = `
${prompt}

Your response must be a valid JSON object that conforms to the following schema:
${JSON.stringify(schema, null, 2)}

Respond ONLY with the JSON object, no other text.`;

      const response = await this.client.messages.create({
        model,
        messages: [
          { role: 'user', content: schemaPrompt }
        ],
        system: systemMessage,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.content[0]?.text || '{}';
      
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse JSON response: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error generating structured data with Anthropic:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }
}
