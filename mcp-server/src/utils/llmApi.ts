import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as mime from 'mime-types';

// Load environment variables
const loadEnvironment = async () => {
  const envFiles = ['.env.local', '.env', '.env.example'];
  let envLoaded = false;

  console.error('Current working directory:', process.cwd());
  console.error('Looking for environment files:', envFiles);

  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    try {
      const exists = await fs.access(envPath).then(() => true).catch(() => false);
      if (exists) {
        console.error(`Found ${envFile}, loading variables...`);
        dotenv.config({ path: envPath });
        envLoaded = true;
        console.error(`Loaded environment variables from ${envFile}`);
        
        // Print loaded keys (but not values for security)
        const content = await fs.readFile(envPath, 'utf-8');
        const keys = content
          .split('\n')
          .filter(line => line.includes('=') && !line.startsWith('#'))
          .map(line => line.split('=')[0].trim());
        console.error(`Keys loaded from ${envFile}:`, keys);
      }
    } catch (error) {
      console.error(`Error loading ${envFile}:`, error);
    }
  }

  if (!envLoaded) {
    console.error('Warning: No .env files found. Using system environment variables only.');
    console.error('Available system environment variables:', Object.keys(process.env));
  }
};

// Load environment at module import
loadEnvironment();

interface ImageData {
  base64: string;
  mimeType: string;
}

const encodeImageFile = async (imagePath: string): Promise<ImageData> => {
  const mimeType = mime.lookup(imagePath) || 'image/png';
  const imageBuffer = await fs.readFile(imagePath);
  const base64 = imageBuffer.toString('base64');
  return { base64, mimeType };
};

type LLMProvider = 'openai' | 'azure' | 'deepseek' | 'anthropic' | 'gemini' | 'local';

interface LLMClient {
  chat: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
}

const createLLMClient = (provider: LLMProvider): LLMClient => {
  switch (provider) {
    case 'openai':
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY not found in environment variables');
      return new OpenAI({ apiKey });

    case 'azure':
      const azureKey = process.env.AZURE_OPENAI_API_KEY;
      if (!azureKey) throw new Error('AZURE_OPENAI_API_KEY not found in environment variables');
      return new OpenAI({
        apiKey: azureKey,
        baseURL: 'https://msopenai.openai.azure.com',
        defaultHeaders: { 'api-key': azureKey },
        defaultQuery: { 'api-version': '2024-08-01-preview' }
      });

    case 'deepseek':
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not found in environment variables');
      return new OpenAI({
        apiKey: deepseekKey,
        baseURL: 'https://api.deepseek.com/v1'
      });

    case 'anthropic':
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not found in environment variables');
      return new Anthropic({ apiKey: anthropicKey }) as unknown as LLMClient;

    case 'local':
      return new OpenAI({
        baseURL: 'http://192.168.180.137:8006/v1',
        apiKey: 'not-needed'
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

interface QueryLLMOptions {
  prompt: string;
  client?: LLMClient;
  model?: string;
  provider?: LLMProvider;
  imagePath?: string;
}

const queryLLM = async ({
  prompt,
  client,
  model,
  provider = 'openai',
  imagePath
}: QueryLLMOptions): Promise<string | null> => {
  try {
    if (!client) {
      client = createLLMClient(provider);
    }

    // Set default model based on provider
    if (!model) {
      switch (provider) {
        case 'openai':
          model = 'gpt-4o';
          break;
        case 'azure':
          model = process.env.AZURE_OPENAI_MODEL_DEPLOYMENT || 'gpt-4o-ms';
          break;
        case 'deepseek':
          model = 'deepseek-chat';
          break;
        case 'anthropic':
          model = 'claude-3-sonnet-20240229';
          break;
        case 'gemini':
          model = 'gemini-pro';
          break;
        case 'local':
          model = 'Qwen/Qwen2.5-32B-Instruct-AWQ';
          break;
      }
    }

    const messages: any[] = [{ role: 'user', content: [] }];

    // Add text content
    messages[0].content.push({
      type: 'text',
      text: prompt
    });

    // Add image content if provided
    if (imagePath) {
      const { base64, mimeType } = await encodeImageFile(imagePath);
      if (provider === 'openai') {
        messages[0].content = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ];
      } else if (provider === 'anthropic') {
        messages[0].content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: base64
          }
        });
      }
    }

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      ...(model === 'o1' && {
        response_format: { type: 'text' },
        reasoning_effort: 'low'
      })
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error querying LLM:', error);
    return null;
  }
};

export { queryLLM, createLLMClient, type LLMProvider, type QueryLLMOptions }; 