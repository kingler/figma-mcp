/**
 * Interface for LLM model information
 */
export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  costPer1KTokens: {
    input: number;
    output: number;
  };
  contextWindow: number;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  releaseDate?: Date;
  performanceRating?: number; // 1-10 scale
  specializedDomains?: string[];
  finetuned?: boolean;
  finetunedOn?: string;
  modelFamily?: string;
  modelSize?: string; // e.g., "7B", "70B", etc.
  quantization?: string; // e.g., "INT8", "INT4", etc.
  apiEndpoint?: string;
}

/**
 * Interface for model selection criteria
 */
export interface ModelSelectionCriteria {
  taskDescription: string;
  requiredCapabilities?: string[];
  contextLength?: number;
  priority: 'cost' | 'performance' | 'balanced';
  maxBudget?: number;
  specializedDomain?: string;
  preferredProvider?: string;
  requiresFineTuning?: boolean;
  minPerformanceRating?: number;
  maxResponseTime?: number;
}

/**
 * Interface for cost estimation
 */
export interface CostEstimate {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  numRequests: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  alternatives?: {
    modelId: string;
    totalCost: number;
    savings: number;
    savingsPercentage: number;
  }[];
}

/**
 * Interface for model performance metrics
 */
export interface ModelPerformanceMetrics {
  modelId: string;
  averageResponseTime: number; // in milliseconds
  tokensPerSecond: number;
  accuracyScore?: number; // 0-1 scale
  reasoningScore?: number; // 0-1 scale
  creativityScore?: number; // 0-1 scale
  codingScore?: number; // 0-1 scale
  instructionFollowingScore?: number; // 0-1 scale
  benchmarks?: {
    [benchmarkName: string]: number;
  };
}

/**
 * Enum for model capabilities
 */
export enum ModelCapability {
  TextGeneration = 'text-generation',
  CodeGeneration = 'code-generation',
  Reasoning = 'reasoning',
  CreativeWriting = 'creative-writing',
  Vision = 'vision',
  Audio = 'audio',
  Embedding = 'embedding',
  FineTuning = 'fine-tuning',
  FunctionCalling = 'function-calling',
  ToolUse = 'tool-use',
  Multilingual = 'multilingual',
  LongContext = 'long-context'
}

/**
 * Enum for model providers
 */
export enum ModelProvider {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  Google = 'Google',
  Meta = 'Meta',
  Mistral = 'Mistral',
  Cohere = 'Cohere',
  AI21 = 'AI21',
  Together = 'Together',
  Groq = 'Groq',
  Perplexity = 'Perplexity',
  Replicate = 'Replicate',
  DeepSeek = 'DeepSeek',
  OpenRouter = 'OpenRouter'
}