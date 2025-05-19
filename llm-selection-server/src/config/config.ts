import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface for the LLM Selection MCP Server
 */
export interface Config {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    orgId?: string;
    baseUrl: string;
  };

  // Anthropic Configuration
  anthropic: {
    apiKey: string;
    baseUrl: string;
  };

  // DeepSeek Configuration
  deepseek: {
    apiKey: string;
    baseUrl: string;
  };

  // Mistral Configuration
  mistral: {
    apiKey: string;
    baseUrl: string;
  };

  // Cohere Configuration
  cohere: {
    apiKey: string;
    baseUrl: string;
  };

  // Google AI Configuration
  google: {
    apiKey: string;
    baseUrl: string;
  };

  // Open Router Configuration
  openRouter: {
    apiKey: string;
    baseUrl: string;
  };

  // AI21 Configuration
  ai21: {
    apiKey: string;
    baseUrl: string;
  };

  // Together AI Configuration
  together: {
    apiKey: string;
    baseUrl: string;
  };

  // Groq Configuration
  groq: {
    apiKey: string;
    baseUrl: string;
  };

  // Perplexity Configuration
  perplexity: {
    apiKey: string;
    baseUrl: string;
  };

  // Replicate Configuration
  replicate: {
    apiKey: string;
    baseUrl: string;
  };

  // Rate Limiting Configuration
  rateLimit: {
    requests: number;
    period: number; // in seconds
  };

  // Cache Configuration
  cache: {
    enabled: boolean;
    ttl: number; // in seconds
  };
}

/**
 * Default configuration values
 */
const defaultConfig: Config = {
  openai: {
    apiKey: '',
    orgId: '',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
  },
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
  },
  mistral: {
    apiKey: '',
    baseUrl: 'https://api.mistral.ai/v1',
  },
  cohere: {
    apiKey: '',
    baseUrl: 'https://api.cohere.ai/v1',
  },
  google: {
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
  },
  openRouter: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  ai21: {
    apiKey: '',
    baseUrl: 'https://api.ai21.com/studio/v1',
  },
  together: {
    apiKey: '',
    baseUrl: 'https://api.together.xyz/v1',
  },
  groq: {
    apiKey: '',
    baseUrl: 'https://api.groq.com/v1',
  },
  perplexity: {
    apiKey: '',
    baseUrl: 'https://api.perplexity.ai',
  },
  replicate: {
    apiKey: '',
    baseUrl: 'https://api.replicate.com/v1',
  },
  rateLimit: {
    requests: 60,
    period: 60,
  },
  cache: {
    enabled: true,
    ttl: 3600,
  },
};

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const config: Config = { ...defaultConfig };

  // OpenAI Configuration
  if (process.env.OPENAI_API_KEY) {
    config.openai.apiKey = process.env.OPENAI_API_KEY;
  }
  if (process.env.OPENAI_ORG_ID) {
    config.openai.orgId = process.env.OPENAI_ORG_ID;
  }
  if (process.env.OPENAI_BASE_URL) {
    config.openai.baseUrl = process.env.OPENAI_BASE_URL;
  }

  // Anthropic Configuration
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.ANTHROPIC_BASE_URL) {
    config.anthropic.baseUrl = process.env.ANTHROPIC_BASE_URL;
  }

  // DeepSeek Configuration
  if (process.env.DEEPSEEK_API_KEY) {
    config.deepseek.apiKey = process.env.DEEPSEEK_API_KEY;
  }
  if (process.env.DEEPSEEK_BASE_URL) {
    config.deepseek.baseUrl = process.env.DEEPSEEK_BASE_URL;
  }

  // Mistral Configuration
  if (process.env.MISTRAL_API_KEY) {
    config.mistral.apiKey = process.env.MISTRAL_API_KEY;
  }
  if (process.env.MISTRAL_BASE_URL) {
    config.mistral.baseUrl = process.env.MISTRAL_BASE_URL;
  }

  // Cohere Configuration
  if (process.env.COHERE_API_KEY) {
    config.cohere.apiKey = process.env.COHERE_API_KEY;
  }
  if (process.env.COHERE_BASE_URL) {
    config.cohere.baseUrl = process.env.COHERE_BASE_URL;
  }

  // Google AI Configuration
  if (process.env.GOOGLE_API_KEY) {
    config.google.apiKey = process.env.GOOGLE_API_KEY;
  }
  if (process.env.GOOGLE_BASE_URL) {
    config.google.baseUrl = process.env.GOOGLE_BASE_URL;
  }

  // Open Router Configuration
  if (process.env.OPENROUTER_API_KEY) {
    config.openRouter.apiKey = process.env.OPENROUTER_API_KEY;
  }
  if (process.env.OPENROUTER_BASE_URL) {
    config.openRouter.baseUrl = process.env.OPENROUTER_BASE_URL;
  }

  // AI21 Configuration
  if (process.env.AI21_API_KEY) {
    config.ai21.apiKey = process.env.AI21_API_KEY;
  }
  if (process.env.AI21_BASE_URL) {
    config.ai21.baseUrl = process.env.AI21_BASE_URL;
  }

  // Together AI Configuration
  if (process.env.TOGETHER_API_KEY) {
    config.together.apiKey = process.env.TOGETHER_API_KEY;
  }
  if (process.env.TOGETHER_BASE_URL) {
    config.together.baseUrl = process.env.TOGETHER_BASE_URL;
  }

  // Groq Configuration
  if (process.env.GROQ_API_KEY) {
    config.groq.apiKey = process.env.GROQ_API_KEY;
  }
  if (process.env.GROQ_BASE_URL) {
    config.groq.baseUrl = process.env.GROQ_BASE_URL;
  }

  // Perplexity Configuration
  if (process.env.PERPLEXITY_API_KEY) {
    config.perplexity.apiKey = process.env.PERPLEXITY_API_KEY;
  }
  if (process.env.PERPLEXITY_BASE_URL) {
    config.perplexity.baseUrl = process.env.PERPLEXITY_BASE_URL;
  }

  // Replicate Configuration
  if (process.env.REPLICATE_API_KEY) {
    config.replicate.apiKey = process.env.REPLICATE_API_KEY;
  }
  if (process.env.REPLICATE_BASE_URL) {
    config.replicate.baseUrl = process.env.REPLICATE_BASE_URL;
  }

  // Rate Limiting Configuration
  if (process.env.RATE_LIMIT_REQUESTS) {
    config.rateLimit.requests = parseInt(process.env.RATE_LIMIT_REQUESTS, 10);
  }
  if (process.env.RATE_LIMIT_PERIOD) {
    config.rateLimit.period = parseInt(process.env.RATE_LIMIT_PERIOD, 10);
  }

  // Cache Configuration
  if (process.env.CACHE_ENABLED) {
    config.cache.enabled = process.env.CACHE_ENABLED.toLowerCase() === 'true';
  }
  if (process.env.CACHE_TTL) {
    config.cache.ttl = parseInt(process.env.CACHE_TTL, 10);
  }

  return config;
}

/**
 * Get the configuration
 */
export const config = loadConfig();

/**
 * Check if a provider is configured
 * @param provider The provider to check
 * @returns True if the provider is configured, false otherwise
 */
export function isProviderConfigured(provider: keyof Omit<Config, 'rateLimit' | 'cache'>): boolean {
  return !!(config[provider] && config[provider].apiKey);
}

/**
 * Get a list of configured providers
 * @returns An array of configured provider names
 */
export function getConfiguredProviders(): Array<keyof Omit<Config, 'rateLimit' | 'cache'>> {
  return Object.keys(config).filter(key => {
    return key !== 'rateLimit' && key !== 'cache' && isProviderConfigured(key as keyof Omit<Config, 'rateLimit' | 'cache'>);
  }) as Array<keyof Omit<Config, 'rateLimit' | 'cache'>>;
}

export default config;