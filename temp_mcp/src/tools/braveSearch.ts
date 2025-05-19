import { z } from "zod";
import { MCPToolError } from './errors.js';

export const braveSearchToolName = "brave_search";
export const braveSearchToolDescription = "Search the web using Brave Search API";

interface BraveSearchResult {
  web?: {
    results?: Array<{
      title: string;
      description: string;
      url: string;
    }>;
  };
}

export const BraveSearchToolSchema = z.object({
  query: z.string().describe("Search query"),
  count: z.number().optional().default(10).describe("Number of results (1-20)"),
  offset: z.number().optional().default(0).describe("Pagination offset (max 9)")
});

// Add proper rate limiting
const RATE_LIMITS = {
  perSecond: 1,
  perMinute: 60,
  perHour: 3600
} as const;

// Improve rate limiting implementation
class RateLimiter {
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly interval: number;

  constructor(limit: number, interval: number) {
    this.limit = limit;
    this.interval = interval;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    // Remove expired timestamps
    this.timestamps = this.timestamps.filter(
      time => now - time < this.interval
    );
    
    if (this.timestamps.length >= this.limit) {
      return false;
    }
    
    this.timestamps.push(now);
    return true;
  }
}

const rateLimiters = {
  perSecond: new RateLimiter(RATE_LIMITS.perSecond, 1000),
  perMinute: new RateLimiter(RATE_LIMITS.perMinute, 60 * 1000),
  perHour: new RateLimiter(RATE_LIMITS.perHour, 60 * 60 * 1000)
};

// Add request tracking
const requestTracker = {
  lastRequest: 0,
  requestsThisSecond: 0,
  requestsThisMinute: 0,
  requestsThisHour: 0,
  reset() {
    this.requestsThisSecond = 0;
    this.requestsThisMinute = 0;
    this.requestsThisHour = 0;
  }
};

interface SearchResource {
  uri: string;
  title: string;
  description: string;
  url: string;
  timestamp: string;
}

const searchResources = new Map<string, SearchResource>();

export async function runBraveSearchTool(args: z.infer<typeof BraveSearchToolSchema>) {
  const { query, count = 10, offset = 0 } = args;

  try {
    // Check all rate limits
    const [secondOk, minuteOk, hourOk] = await Promise.all([
      rateLimiters.perSecond.checkLimit(),
      rateLimiters.perMinute.checkLimit(),
      rateLimiters.perHour.checkLimit()
    ]);

    if (!secondOk) throw new MCPToolError('Rate limit exceeded (per second)', 429);
    if (!minuteOk) throw new MCPToolError('Rate limit exceeded (per minute)', 429);
    if (!hourOk) throw new MCPToolError('Rate limit exceeded (per hour)', 429);

    // Input validation
    if (!query.trim()) {
      throw new Error('Empty search query');
    }

    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error("BRAVE_API_KEY environment variable is required");
    }

    // Add progress reporting
    const progress = {
      status: 'searching',
      message: 'Executing search query...',
      percent: 0
    };

    // Execute search with timeout
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', Math.min(count, 20).toString());
    url.searchParams.set('offset', offset.toString());

    const searchPromise = fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), 10000)
    );

    const response = await Promise.race([searchPromise, timeoutPromise]);

    if (!(response as any).ok) {
      const res = response as any;
      throw new Error(`Brave API error: ${res.status} ${res.statusText}`);
    }

    const data = await (response as any).json() as BraveSearchResult;
    const results = data.web?.results || [];
    
    // Store results as resources
    const resources = results.map((result, index) => {
      const uri = `brave-search://${Date.now()}-${index}`;
      const resource: SearchResource = {
        uri,
        title: result.title,
        description: result.description,
        url: result.url,
        timestamp: new Date().toISOString()
      };
      searchResources.set(uri, resource);
      return resource;
    });

    return {
      content: [{
        type: "text",
        text: resources.map(r => 
          `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`
        ).join('\n\n')
      }],
      resources: resources.map(r => ({
        uri: r.uri,
        mimeType: "application/json",
        name: r.title
      })),
      isError: false
    };
  } catch (error) {
    // Improved error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Brave search error: ${errorMessage}`);
    
    return {
      content: [{
        type: "text",
        text: `Error: ${errorMessage}`
      }],
      isError: true,
      errorCode: error instanceof Error && 'code' in error ? (error as any).code : 500
    };
  }
} 