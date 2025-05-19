/**
 * Types for LLM service
 */

export interface LLMProvider {
  /**
   * Generate text using the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Additional options for the LLM
   * @returns The generated text
   */
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  
  /**
   * Generate structured data using the LLM
   * @param prompt The prompt to send to the LLM
   * @param schema The JSON schema for the expected response
   * @param options Additional options for the LLM
   * @returns The generated structured data
   */
  generateStructuredData<T>(prompt: string, schema: object, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  /**
   * Temperature controls randomness: lower values make the model more deterministic
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Stop sequences to end generation
   */
  stopSequences?: string[];
  
  /**
   * Model to use (e.g., "gpt-4", "gpt-3.5-turbo")
   */
  model?: string;
  
  /**
   * System message to set the context for the LLM
   */
  systemMessage?: string;
}
