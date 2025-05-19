import OpenAI from 'openai';
import { LLMProvider, LLMOptions } from './types.js';

export class OpenAIProvider implements LLMProvider {
  private client: any;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'gpt-4') {
    // Use provided API key or environment variable
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Generate text using OpenAI
   * @param prompt The prompt to send to OpenAI
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
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens,
        stop: stopSequences,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  /**
   * Generate structured data using OpenAI
   * @param prompt The prompt to send to OpenAI
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

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: schemaPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse JSON response: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error generating structured data with OpenAI:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }
}
