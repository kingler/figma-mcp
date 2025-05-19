#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import FirecrawlApp, {
  type ScrapeParams,
  type MapParams,
  type CrawlParams,
  type FirecrawlDocument,
} from '@mendable/firecrawl-js';
import PQueue from 'p-queue';

// Tool definitions
const SCRAPE_TOOL: Tool = {
  name: 'fire_crawl_scrape',
  description:
    'Scrape a single webpage with advanced options for content extraction. ' +
    'Supports various formats including markdown, HTML, and screenshots. ' +
    'Can execute custom actions like clicking or scrolling before scraping.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to scrape',
      },
      formats: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'markdown',
            'html',
            'rawHtml',
            'screenshot',
            'links',
            'screenshot@fullPage',
            'extract',
          ],
        },
        description: "Content formats to extract (default: ['markdown'])",
      },
      onlyMainContent: {
        type: 'boolean',
        description:
          'Extract only the main content, filtering out navigation, footers, etc.',
      },
      includeTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'HTML tags to specifically include in extraction',
      },
      excludeTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'HTML tags to exclude from extraction',
      },
      waitFor: {
        type: 'number',
        description: 'Time in milliseconds to wait for dynamic content to load',
      },
      timeout: {
        type: 'number',
        description:
          'Maximum time in milliseconds to wait for the page to load',
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'wait',
                'click',
                'screenshot',
                'write',
                'press',
                'scroll',
                'scrape',
                'executeJavascript',
              ],
              description: 'Type of action to perform',
            },
            selector: {
              type: 'string',
              description: 'CSS selector for the target element',
            },
            milliseconds: {
              type: 'number',
              description: 'Time to wait in milliseconds (for wait action)',
            },
            text: {
              type: 'string',
              description: 'Text to write (for write action)',
            },
            key: {
              type: 'string',
              description: 'Key to press (for press action)',
            },
            direction: {
              type: 'string',
              enum: ['up', 'down'],
              description: 'Scroll direction',
            },
            script: {
              type: 'string',
              description: 'JavaScript code to execute',
            },
            fullPage: {
              type: 'boolean',
              description: 'Take full page screenshot',
            },
          },
          required: ['type'],
        },
        description: 'List of actions to perform before scraping',
      },
      extract: {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            description: 'Schema for structured data extraction',
          },
          systemPrompt: {
            type: 'string',
            description: 'System prompt for LLM extraction',
          },
          prompt: {
            type: 'string',
            description: 'User prompt for LLM extraction',
          },
        },
        description: 'Configuration for structured data extraction',
      },
      mobile: {
        type: 'boolean',
        description: 'Use mobile viewport',
      },
      skipTlsVerification: {
        type: 'boolean',
        description: 'Skip TLS certificate verification',
      },
      removeBase64Images: {
        type: 'boolean',
        description: 'Remove base64 encoded images from output',
      },
      location: {
        type: 'object',
        properties: {
          country: {
            type: 'string',
            description: 'Country code for geolocation',
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Language codes for content',
          },
        },
        description: 'Location settings for scraping',
      },
    },
    required: ['url'],
  },
};

const MAP_TOOL: Tool = {
  name: 'fire_crawl_map',
  description:
    'Discover URLs from a starting point. Can use both sitemap.xml and HTML link discovery.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Starting URL for URL discovery',
      },
      search: {
        type: 'string',
        description: 'Optional search term to filter URLs',
      },
      ignoreSitemap: {
        type: 'boolean',
        description: 'Skip sitemap.xml discovery and only use HTML links',
      },
      sitemapOnly: {
        type: 'boolean',
        description: 'Only use sitemap.xml for discovery, ignore HTML links',
      },
      includeSubdomains: {
        type: 'boolean',
        description: 'Include URLs from subdomains in results',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of URLs to return',
      },
    },
    required: ['url'],
  },
};

const CRAWL_TOOL: Tool = {
  name: 'fire_crawl_crawl',
  description:
    'Start an asynchronous crawl of multiple pages from a starting URL. ' +
    'Supports depth control, path filtering, and webhook notifications.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Starting URL for the crawl',
      },
      excludePaths: {
        type: 'array',
        items: { type: 'string' },
        description: 'URL paths to exclude from crawling',
      },
      includePaths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Only crawl these URL paths',
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum link depth to crawl',
      },
      ignoreSitemap: {
        type: 'boolean',
        description: 'Skip sitemap.xml discovery',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of pages to crawl',
      },
      allowBackwardLinks: {
        type: 'boolean',
        description: 'Allow crawling links that point to parent directories',
      },
      allowExternalLinks: {
        type: 'boolean',
        description: 'Allow crawling links to external domains',
      },
      webhook: {
        oneOf: [
          {
            type: 'string',
            description: 'Webhook URL to notify when crawl is complete',
          },
          {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Webhook URL',
              },
              headers: {
                type: 'object',
                description: 'Custom headers for webhook requests',
              },
            },
            required: ['url'],
          },
        ],
      },
      deduplicateSimilarURLs: {
        type: 'boolean',
        description: 'Remove similar URLs during crawl',
      },
      ignoreQueryParameters: {
        type: 'boolean',
        description: 'Ignore query parameters when comparing URLs',
      },
      scrapeOptions: {
        type: 'object',
        properties: {
          formats: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'markdown',
                'html',
                'rawHtml',
                'screenshot',
                'links',
                'screenshot@fullPage',
                'extract',
              ],
            },
          },
          onlyMainContent: {
            type: 'boolean',
          },
          includeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          excludeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          waitFor: {
            type: 'number',
          },
        },
        description: 'Options for scraping each page',
      },
    },
    required: ['url'],
  },
};

const BATCH_SCRAPE_TOOL: Tool = {
  name: 'fire_crawl_batch_scrape',
  description:
    'Scrape multiple URLs in batch mode. Returns a job ID that can be used to check status.',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to scrape',
      },
      options: {
        type: 'object',
        properties: {
          formats: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'markdown',
                'html',
                'rawHtml',
                'screenshot',
                'links',
                'screenshot@fullPage',
                'extract',
              ],
            },
          },
          onlyMainContent: {
            type: 'boolean',
          },
          includeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          excludeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          waitFor: {
            type: 'number',
          },
        },
      },
    },
    required: ['urls'],
  },
};

const CHECK_BATCH_STATUS_TOOL: Tool = {
  name: 'fire_crawl_check_batch_status',
  description: 'Check the status of a batch scraping job.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Batch job ID to check',
      },
    },
    required: ['id'],
  },
};

const CHECK_CRAWL_STATUS_TOOL: Tool = {
  name: 'fire_crawl_check_crawl_status',
  description: 'Check the status of a crawl job.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Crawl job ID to check',
      },
    },
    required: ['id'],
  },
};

const SEARCH_TOOL: Tool = {
  name: 'fire_crawl_search',
  description:
    'Search and retrieve content from web pages with optional scraping. ' +
    'Returns SERP results by default (url, title, description) or full page content when scrapeOptions are provided.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
      },
      lang: {
        type: 'string',
        description: 'Language code for search results (default: en)',
      },
      country: {
        type: 'string',
        description: 'Country code for search results (default: us)',
      },
      tbs: {
        type: 'string',
        description: 'Time-based search filter',
      },
      filter: {
        type: 'string',
        description: 'Search filter',
      },
      location: {
        type: 'object',
        properties: {
          country: {
            type: 'string',
            description: 'Country code for geolocation',
          },
          languages: {
            type: 'array',
            items: { type: 'string' },
            description: 'Language codes for content',
          },
        },
        description: 'Location settings for search',
      },
      scrapeOptions: {
        type: 'object',
        properties: {
          formats: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['markdown', 'html', 'rawHtml'],
            },
            description: 'Content formats to extract from search results',
          },
          onlyMainContent: {
            type: 'boolean',
            description: 'Extract only the main content from results',
          },
          waitFor: {
            type: 'number',
            description: 'Time in milliseconds to wait for dynamic content',
          },
        },
        description: 'Options for scraping search results',
      },
    },
    required: ['query'],
  },
};

const EXTRACT_TOOL: Tool = {
  name: 'fire_crawl_extract',
  description:
    'Extract structured information from web pages using LLM. ' +
    'Supports both cloud AI and self-hosted LLM extraction.',
  inputSchema: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to extract information from',
      },
      prompt: {
        type: 'string',
        description: 'Prompt for the LLM extraction',
      },
      systemPrompt: {
        type: 'string',
        description: 'System prompt for LLM extraction',
      },
      schema: {
        type: 'object',
        description: 'JSON schema for structured data extraction',
      },
      allowExternalLinks: {
        type: 'boolean',
        description: 'Allow extraction from external links',
      },
      enableWebSearch: {
        type: 'boolean',
        description: 'Enable web search for additional context',
      },
      includeSubdomains: {
        type: 'boolean',
        description: 'Include subdomains in extraction',
      },
    },
    required: ['urls'],
  },
};

// Type definitions
interface BatchScrapeOptions {
  urls: string[];
  options?: Omit<ScrapeParams, 'url'>;
}

interface StatusCheckOptions {
  id: string;
}

interface SearchOptions {
  query: string;
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  filter?: string;
  location?: {
    country?: string;
    languages?: string[];
  };
  scrapeOptions?: {
    formats?: string[];
    onlyMainContent?: boolean;
    waitFor?: number;
  };
}

// Add after other interfaces
interface ExtractParams<T = any> {
  prompt?: string;
  systemPrompt?: string;
  schema?: T | object;
  allowExternalLinks?: boolean;
  enableWebSearch?: boolean;
  includeSubdomains?: boolean;
  origin?: string;
}

interface ExtractArgs {
  urls: string[];
  prompt?: string;
  systemPrompt?: string;
  schema?: object;
  allowExternalLinks?: boolean;
  enableWebSearch?: boolean;
  includeSubdomains?: boolean;
  origin?: string;
}

interface ExtractResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  warning?: string;
  creditsUsed?: number;
}

// Type guards
function isScrapeOptions(
  args: unknown
): args is ScrapeParams & { url: string } {
  return (
    typeof args === 'object' &&
    args !== null &&
    'url' in args &&
    typeof (args as { url: unknown }).url === 'string'
  );
}

function isMapOptions(args: unknown): args is MapParams & { url: string } {
  return (
    typeof args === 'object' &&
    args !== null &&
    'url' in args &&
    typeof (args as { url: unknown }).url === 'string'
  );
}

function isCrawlOptions(args: unknown): args is CrawlParams & { url: string } {
  return (
    typeof args === 'object' &&
    args !== null &&
    'url' in args &&
    typeof (args as { url: unknown }).url === 'string'
  );
}

function isBatchScrapeOptions(args: unknown): args is BatchScrapeOptions {
  return (
    typeof args === 'object' &&
    args !== null &&
    'urls' in args &&
    Array.isArray((args as { urls: unknown }).urls) &&
    (args as { urls: unknown[] }).urls.every((url) => typeof url === 'string')
  );
}

function isStatusCheckOptions(args: unknown): args is StatusCheckOptions {
  return (
    typeof args === 'object' &&
    args !== null &&
    'id' in args &&
    typeof (args as { id: unknown }).id === 'string'
  );
}

function isSearchOptions(args: unknown): args is SearchOptions {
  return (
    typeof args === 'object' &&
    args !== null &&
    'query' in args &&
    typeof (args as { query: unknown }).query === 'string'
  );
}

function isExtractOptions(args: unknown): args is ExtractArgs {
  if (typeof args !== 'object' || args === null) return false;
  const { urls } = args as { urls?: unknown };
  return (
    Array.isArray(urls) &&
    urls.every((url): url is string => typeof url === 'string')
  );
}

// Server implementation
const server = new Server(
  {
    name: 'fire-crawl',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  }
);

// Get optional API URL
const FIRE_CRAWL_API_URL = process.env.FIRE_CRAWL_API_URL;
const FIRE_CRAWL_API_KEY = process.env.FIRE_CRAWL_API_KEY;

// Check if API key is required (only for cloud service)
if (!FIRE_CRAWL_API_URL && !FIRE_CRAWL_API_KEY) {
  console.error(
    'Error: FIRE_CRAWL_API_KEY environment variable is required when using the cloud service'
  );
  process.exit(1);
}

// Initialize FireCrawl client with optional API URL
const client = new FirecrawlApp({
  apiKey: FIRE_CRAWL_API_KEY || '',
  ...(FIRE_CRAWL_API_URL ? { apiUrl: FIRE_CRAWL_API_URL } : {}),
});

// Configuration for retries and monitoring
const CONFIG = {
  retry: {
    maxAttempts: Number(process.env.FIRE_CRAWL_RETRY_MAX_ATTEMPTS) || 3,
    initialDelay: Number(process.env.FIRE_CRAWL_RETRY_INITIAL_DELAY) || 1000,
    maxDelay: Number(process.env.FIRE_CRAWL_RETRY_MAX_DELAY) || 10000,
    backoffFactor: Number(process.env.FIRE_CRAWL_RETRY_BACKOFF_FACTOR) || 2,
  },
  credit: {
    warningThreshold:
      Number(process.env.FIRE_CRAWL_CREDIT_WARNING_THRESHOLD) || 1000,
    criticalThreshold:
      Number(process.env.FIRE_CRAWL_CREDIT_CRITICAL_THRESHOLD) || 100,
  },
};

// Add credit tracking
interface CreditUsage {
  total: number;
  lastCheck: number;
}

const creditUsage: CreditUsage = {
  total: 0,
  lastCheck: Date.now(),
};

// Add utility function for delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Add retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes('rate limit') || error.message.includes('429'));

    if (isRateLimit && attempt < CONFIG.retry.maxAttempts) {
      const delayMs = Math.min(
        CONFIG.retry.initialDelay *
          Math.pow(CONFIG.retry.backoffFactor, attempt - 1),
        CONFIG.retry.maxDelay
      );

      server.sendLoggingMessage({
        level: 'warning',
        data: `Rate limit hit for ${context}. Attempt ${attempt}/${CONFIG.retry.maxAttempts}. Retrying in ${delayMs}ms`,
      });

      await delay(delayMs);
      return withRetry(operation, context, attempt + 1);
    }

    throw error;
  }
}

// Add credit monitoring
async function updateCreditUsage(creditsUsed: number): Promise<void> {
  creditUsage.total += creditsUsed;

  // Log credit usage
  server.sendLoggingMessage({
    level: 'info',
    data: `Credit usage: ${creditUsage.total} credits used total`,
  });

  // Check thresholds
  if (creditUsage.total >= CONFIG.credit.criticalThreshold) {
    server.sendLoggingMessage({
      level: 'error',
      data: `CRITICAL: Credit usage has reached ${creditUsage.total}`,
    });
  } else if (creditUsage.total >= CONFIG.credit.warningThreshold) {
    server.sendLoggingMessage({
      level: 'warning',
      data: `WARNING: Credit usage has reached ${creditUsage.total}`,
    });
  }
}

// Add before server implementation
interface QueuedBatchOperation {
  id: string;
  urls: string[];
  options?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
  };
  result?: any;
  error?: string;
}

// Initialize queue system
const batchQueue = new PQueue({ concurrency: 1 });
const batchOperations = new Map<string, QueuedBatchOperation>();
let operationCounter = 0;

async function processBatchOperation(
  operation: QueuedBatchOperation
): Promise<void> {
  try {
    operation.status = 'processing';
    let totalCreditsUsed = 0;

    // Use library's built-in batch processing
    const response = await withRetry(
      async () =>
        client.asyncBatchScrapeUrls(operation.urls, operation.options),
      `batch ${operation.id} processing`
    );

    if (!response.success) {
      throw new Error(response.error || 'Batch operation failed');
    }

    // Track credits if using cloud API
    if (!FIRE_CRAWL_API_URL && hasCredits(response)) {
      totalCreditsUsed += response.creditsUsed;
      await updateCreditUsage(response.creditsUsed);
    }

    operation.status = 'completed';
    operation.result = response;

    // Log final credit usage for the batch
    if (!FIRE_CRAWL_API_URL) {
      server.sendLoggingMessage({
        level: 'info',
        data: `Batch ${operation.id} completed. Total credits used: ${totalCreditsUsed}`,
      });
    }
  } catch (error) {
    operation.status = 'failed';
    operation.error = error instanceof Error ? error.message : String(error);

    server.sendLoggingMessage({
      level: 'error',
      data: `Batch ${operation.id} failed: ${operation.error}`,
    });
  }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    SCRAPE_TOOL,
    MAP_TOOL,
    CRAWL_TOOL,
    BATCH_SCRAPE_TOOL,
    CHECK_BATCH_STATUS_TOOL,
    CHECK_CRAWL_STATUS_TOOL,
    SEARCH_TOOL,
    EXTRACT_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  try {
    const { name, arguments: args } = request.params;

    // Log incoming request with timestamp
    server.sendLoggingMessage({
      level: 'info',
      data: `[${new Date().toISOString()}] Received request for tool: ${name}`,
    });

    if (!args) {
      throw new Error('No arguments provided');
    }

    switch (name) {
      case 'fire_crawl_scrape': {
        if (!isScrapeOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_scrape');
        }
        const { url, ...options } = args;
        try {
          const scrapeStartTime = Date.now();
          server.sendLoggingMessage({
            level: 'info',
            data: `Starting scrape for URL: ${url} with options: ${JSON.stringify(
              options
            )}`,
          });

          const response = await client.scrapeUrl(url, options);

          // Log performance metrics
          server.sendLoggingMessage({
            level: 'info',
            data: `Scrape completed in ${Date.now() - scrapeStartTime}ms`,
          });

          if ('success' in response && !response.success) {
            throw new Error(response.error || 'Scraping failed');
          }

          const content =
            'markdown' in response
              ? response.markdown || response.html || response.rawHtml
              : null;
          return {
            content: [
              { type: 'text', text: content || 'No content available' },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'fire_crawl_map': {
        if (!isMapOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_map');
        }
        const { url, ...options } = args;
        const response = await client.mapUrl(url, options);
        if ('error' in response) {
          throw new Error(response.error);
        }
        if (!response.links) {
          throw new Error('No links received from FireCrawl API');
        }
        return {
          content: [{ type: 'text', text: response.links.join('\n') }],
          isError: false,
        };
      }

      case 'fire_crawl_batch_scrape': {
        if (!isBatchScrapeOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_batch_scrape');
        }

        try {
          const operationId = `batch_${++operationCounter}`;
          const operation: QueuedBatchOperation = {
            id: operationId,
            urls: args.urls,
            options: args.options,
            status: 'pending',
            progress: {
              completed: 0,
              total: args.urls.length,
            },
          };

          batchOperations.set(operationId, operation);

          // Queue the operation
          batchQueue.add(() => processBatchOperation(operation));

          server.sendLoggingMessage({
            level: 'info',
            data: `Queued batch operation ${operationId} with ${args.urls.length} URLs`,
          });

          return {
            content: [
              {
                type: 'text',
                text: `Batch operation queued with ID: ${operationId}. Use fire_crawl_check_batch_status to check progress.`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : `Batch operation failed: ${JSON.stringify(error)}`;
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'fire_crawl_check_batch_status': {
        if (!isStatusCheckOptions(args)) {
          throw new Error(
            'Invalid arguments for fire_crawl_check_batch_status'
          );
        }

        const operation = batchOperations.get(args.id);
        if (!operation) {
          return {
            content: [
              {
                type: 'text',
                text: `No batch operation found with ID: ${args.id}`,
              },
            ],
            isError: true,
          };
        }

        const status = `Batch Status:
Status: ${operation.status}
Progress: ${operation.progress.completed}/${operation.progress.total}
${operation.error ? `Error: ${operation.error}` : ''}
${
  operation.result
    ? `Results: ${JSON.stringify(operation.result, null, 2)}`
    : ''
}`;

        return {
          content: [{ type: 'text', text: status }],
          isError: false,
        };
      }

      case 'fire_crawl_crawl': {
        if (!isCrawlOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_crawl');
        }
        const { url, ...options } = args;

        const response = await withRetry(
          async () => client.asyncCrawlUrl(url, options),
          'crawl operation'
        );

        if (!response.success) {
          throw new Error(response.error);
        }

        // Monitor credits for cloud API
        if (!FIRE_CRAWL_API_URL && hasCredits(response)) {
          await updateCreditUsage(response.creditsUsed);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Started crawl for ${url} with job ID: ${response.id}`,
            },
          ],
          isError: false,
        };
      }

      case 'fire_crawl_check_crawl_status': {
        if (!isStatusCheckOptions(args)) {
          throw new Error(
            'Invalid arguments for fire_crawl_check_crawl_status'
          );
        }
        const response = await client.checkCrawlStatus(args.id);
        if (!response.success) {
          throw new Error(response.error);
        }
        const status = `Crawl Status:
Status: ${response.status}
Progress: ${response.completed}/${response.total}
Credits Used: ${response.creditsUsed}
Expires At: ${response.expiresAt}
${
  response.data.length > 0 ? '\nResults:\n' + formatResults(response.data) : ''
}`;
        return {
          content: [{ type: 'text', text: status }],
          isError: false,
        };
      }

      case 'fire_crawl_search': {
        if (!isSearchOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_search');
        }
        try {
          const response = await withRetry(
            async () => client.search(args.query, args),
            'search operation'
          );

          if (!response.success) {
            throw new Error(
              `Search failed: ${response.error || 'Unknown error'}`
            );
          }

          // Monitor credits for cloud API
          if (!FIRE_CRAWL_API_URL && hasCredits(response)) {
            await updateCreditUsage(response.creditsUsed);
          }

          // Format the results
          const results = response.data
            .map(
              (result) =>
                `URL: ${result.url}
Title: ${result.title || 'No title'}
Description: ${result.description || 'No description'}
${result.markdown ? `\nContent:\n${result.markdown}` : ''}`
            )
            .join('\n\n');

          return {
            content: [{ type: 'text', text: results }],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : `Search failed: ${JSON.stringify(error)}`;
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      case 'fire_crawl_extract': {
        if (!isExtractOptions(args)) {
          throw new Error('Invalid arguments for fire_crawl_extract');
        }

        try {
          const extractStartTime = Date.now();

          server.sendLoggingMessage({
            level: 'info',
            data: `Starting extraction for URLs: ${args.urls.join(', ')}`,
          });

          // Log if using self-hosted instance
          if (FIRE_CRAWL_API_URL) {
            server.sendLoggingMessage({
              level: 'info',
              data: 'Using self-hosted instance for extraction',
            });
          }

          const extractResponse = await withRetry(
            async () =>
              client.extract(args.urls, {
                prompt: args.prompt,
                systemPrompt: args.systemPrompt,
                schema: args.schema,
                allowExternalLinks: args.allowExternalLinks,
                enableWebSearch: args.enableWebSearch,
                includeSubdomains: args.includeSubdomains,
                origin: 'mcp-server',
              } as ExtractParams),
            'extract operation'
          );

          // Type guard for successful response
          if (!('success' in extractResponse) || !extractResponse.success) {
            throw new Error(extractResponse.error || 'Extraction failed');
          }

          const response = extractResponse as ExtractResponse;

          // Monitor credits for cloud API
          if (!FIRE_CRAWL_API_URL && hasCredits(response)) {
            await updateCreditUsage(response.creditsUsed || 0);
          }

          // Log performance metrics
          server.sendLoggingMessage({
            level: 'info',
            data: `Extraction completed in ${Date.now() - extractStartTime}ms`,
          });

          // Add warning to response if present
          const result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
            isError: false,
          };

          if (response.warning) {
            server.sendLoggingMessage({
              level: 'warning',
              data: response.warning,
            });
          }

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Special handling for self-hosted instance errors
          if (
            FIRE_CRAWL_API_URL &&
            errorMessage.toLowerCase().includes('not supported')
          ) {
            server.sendLoggingMessage({
              level: 'error',
              data: 'Extraction is not supported by this self-hosted instance',
            });
            return {
              content: [
                {
                  type: 'text',
                  text: 'Extraction is not supported by this self-hosted instance. Please ensure LLM support is configured.',
                },
              ],
              isError: true,
            };
          }

          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // Log detailed error information
    server.sendLoggingMessage({
      level: 'error',
      data: {
        message: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool: request.params.name,
        arguments: request.params.arguments,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    });
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  } finally {
    // Log request completion with performance metrics
    server.sendLoggingMessage({
      level: 'info',
      data: `Request completed in ${Date.now() - startTime}ms`,
    });
  }
});

// Helper function to format results
function formatResults(data: FirecrawlDocument[]): string {
  return data
    .map((doc) => {
      const content = doc.markdown || doc.html || doc.rawHtml || 'No content';
      return `URL: ${doc.url || 'Unknown URL'}
Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
${doc.metadata?.title ? `Title: ${doc.metadata.title}` : ''}`;
    })
    .join('\n\n');
}

// Server startup
async function runServer() {
  try {
    console.error('Initializing FireCrawl MCP Server...');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Now that we're connected, we can send logging messages
    server.sendLoggingMessage({
      level: 'info',
      data: 'FireCrawl MCP Server initialized successfully',
    });

    server.sendLoggingMessage({
      level: 'info',
      data: `Configuration: API URL: ${FIRE_CRAWL_API_URL || 'default'}`,
    });

    console.error('FireCrawl MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

// Add type guard for credit usage
function hasCredits(response: any): response is { creditsUsed: number } {
  return 'creditsUsed' in response && typeof response.creditsUsed === 'number';
}
