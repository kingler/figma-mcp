#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';
import axios from 'axios';

interface TransformConfig {
  elevateParameters?: boolean;
  servers?: string[];
  addOperationIds?: boolean;
  condenseSingleTypes?: boolean;
  removeConsequences?: {
    post?: boolean;
    put?: boolean;
    delete?: boolean;
    patch?: boolean;
  };
}

class OpenAPIManagementServer {
  private server: Server;
  private readonly OPENAPI_TRANSFORMER_URL = 'https://open-api-spec-cleaner.replit.app';
  private readonly API_DIRECTORIES = [
    'https://api.apis.guru/v2/list.json',
    'https://raw.githubusercontent.com/public-apis/public-apis/master/apis.json'
  ];

  constructor() {
    this.server = new Server(
      {
        name: 'openapi-management-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'discover_apis',
          description: 'Search and discover APIs based on feature requirements',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'Feature requirement (e.g., "weather forecasting", "payment processing")'
              },
              requirements: {
                type: 'object',
                properties: {
                  free: { type: 'boolean' },
                  authentication: { 
                    type: 'string',
                    enum: ['apiKey', 'oauth2', 'none']
                  },
                  https: { type: 'boolean' },
                  cors: { type: 'boolean' }
                }
              }
            },
            required: ['feature']
          }
        },
        {
          name: 'transform_openapi',
          description: 'Transform and clean OpenAPI specifications',
          inputSchema: {
            type: 'object',
            properties: {
              spec: {
                type: 'string',
                description: 'OpenAPI specification to transform'
              },
              config: {
                type: 'object',
                properties: {
                  elevateParameters: { type: 'boolean' },
                  servers: { 
                    type: 'array',
                    items: { type: 'string' }
                  },
                  addOperationIds: { type: 'boolean' },
                  condenseSingleTypes: { type: 'boolean' },
                  removeConsequences: {
                    type: 'object',
                    properties: {
                      post: { type: 'boolean' },
                      put: { type: 'boolean' },
                      delete: { type: 'boolean' },
                      patch: { type: 'boolean' }
                    }
                  }
                }
              }
            },
            required: ['spec']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'discover_apis':
          return await this.handleDiscoverAPIs(request.params.arguments);
        case 'transform_openapi':
          return await this.handleTransformOpenAPI(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleDiscoverAPIs(args: any) {
    try {
      const { feature, requirements } = args;
      const apis = [];

      // Search APIs.guru directory
      try {
        const response = await axios.get(this.API_DIRECTORIES[0]);
        const apiList = response.data;
        
        for (const [name, api] of Object.entries(apiList)) {
          const apiInfo = (api as any).versions[(api as any).preferred];
          if (this.matchesRequirements(apiInfo, feature, requirements)) {
            apis.push({
              name,
              description: apiInfo.info.description,
              spec: apiInfo.swaggerUrl
            });
          }
        }
      } catch (error) {
        console.error('Error fetching from APIs.guru:', error);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(apis, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error discovering APIs: ${error}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleTransformOpenAPI(args: any) {
    try {
      const { spec, config } = args;
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(this.OPENAPI_TRANSFORMER_URL);
      
      // Input the OpenAPI spec
      await page.evaluate((text) => {
        const editor = document.querySelector('.monaco-editor textarea');
        if (editor) {
          const event = new InputEvent('input', { bubbles: true });
          (editor as HTMLTextAreaElement).value = text;
          editor.dispatchEvent(event);
        }
      }, spec);

      // Configure transformation options
      if (config) {
        if (config.elevateParameters) {
          await page.click('#elevate-parameters');
        }
        if (config.servers?.length) {
          await page.type('#servers', config.servers.join(','));
        }
        if (config.addOperationIds) {
          await page.click('#add-operation-ids');
        }
        if (config.condenseSingleTypes) {
          await page.click('#condense-single-types');
        }
        if (config.removeConsequences) {
          if (config.removeConsequences.post) await page.click('#remove-post');
          if (config.removeConsequences.put) await page.click('#remove-put');
          if (config.removeConsequences.delete) await page.click('#remove-delete');
          if (config.removeConsequences.patch) await page.click('#remove-patch');
        }
      }

      // Click transform button
      await page.click('button:has-text("Transform")');
      
      // Wait for transformation and get result
      await page.waitForSelector('.output-editor');
      const transformedSpec = await page.evaluate(() => {
        const editor = document.querySelector('.output-editor');
        return editor ? editor.textContent : '';
      });

      await browser.close();

      return {
        content: [
          {
            type: 'text',
            text: transformedSpec || 'No output received from transformer'
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error transforming OpenAPI spec: ${error}`
          }
        ],
        isError: true
      };
    }
  }

  private matchesRequirements(api: any, feature: string, requirements?: any): boolean {
    // Basic keyword matching in title and description
    const searchText = `${api.info.title} ${api.info.description || ''}`.toLowerCase();
    if (!searchText.includes(feature.toLowerCase())) {
      return false;
    }

    if (!requirements) {
      return true;
    }

    // Check specific requirements
    if (requirements.https && !api.schemes?.includes('https')) {
      return false;
    }

    if (requirements.authentication === 'none' && api.securityDefinitions) {
      return false;
    }

    if (requirements.authentication && requirements.authentication !== 'none') {
      const hasMatchingAuth = Object.values(api.securityDefinitions || {}).some(
        (def: any) => def.type.toLowerCase() === requirements.authentication.toLowerCase()
      );
      if (!hasMatchingAuth) {
        return false;
      }
    }

    return true;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenAPI Management MCP server running on stdio');
  }
}

const server = new OpenAPIManagementServer();
server.run().catch(console.error);
