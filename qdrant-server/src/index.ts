#!/usr/bin/env node
import { 
  Server, 
  StdioServerTransport,
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request
} from '@modelcontextprotocol/sdk';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COLLECTION_NAME = 'n8n_workflows';
const VECTOR_SIZE = 1536; // OpenAI embeddings dimension

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Initialize Qdrant client
const qdrantClient = new QdrantClient({ url: QDRANT_URL });

/**
 * Generate embeddings using OpenAI API
 * @param text Text to generate embeddings for
 * @returns Vector embeddings
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-3-small',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new McpError(
      ErrorCode.InternalError,
      'Failed to generate embeddings'
    );
  }
}

/**
 * Ensure the collection exists in Qdrant
 */
async function ensureCollection(): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (collection) => collection.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      // Create collection if it doesn't exist
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });

      // Create payload indexes for efficient filtering
      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'category',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'tags',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'complexity.complexity',
        field_schema: 'keyword',
      });

      console.log(`Created collection: ${COLLECTION_NAME}`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error ensuring collection:', error);
    throw new McpError(
      ErrorCode.InternalError,
      'Failed to ensure collection exists'
    );
  }
}

class QdrantServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'qdrant-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'vectorize_workflows',
          description: 'Vectorize n8n workflows and store them in Qdrant',
          inputSchema: {
            type: 'object',
            properties: {
              workflowsDir: {
                type: 'string',
                description: 'Directory containing workflow files',
              },
              processedDir: {
                type: 'string',
                description: 'Directory containing processed workflow files',
              },
            },
            required: ['workflowsDir', 'processedDir'],
          },
        },
        {
          name: 'search_similar_workflows',
          description: 'Search for similar workflows based on a query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
              },
              filter: {
                type: 'object',
                description: 'Filter criteria',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Filter by category',
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'Filter by tags',
                  },
                  complexity: {
                    type: 'string',
                    description: 'Filter by complexity (simple, moderate, complex)',
                  },
                },
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_workflow_categories',
          description: 'Get all workflow categories',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_workflow_tags',
          description: 'Get all workflow tags',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: Request) => {
      switch (request.params.name) {
        case 'vectorize_workflows':
          return this.vectorizeWorkflows(request.params.arguments);
        case 'search_similar_workflows':
          return this.searchSimilarWorkflows(request.params.arguments);
        case 'get_workflow_categories':
          return this.getWorkflowCategories();
        case 'get_workflow_tags':
          return this.getWorkflowTags();
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Vectorize workflows and store them in Qdrant
   */
  private async vectorizeWorkflows(args: any): Promise<any> {
    try {
      const { workflowsDir, processedDir } = args;
      
      // Ensure the collection exists
      await ensureCollection();
      
      // Read the processed workflows summary
      const summaryPath = path.join(processedDir, 'workflows-summary.json');
      if (!fs.existsSync(summaryPath)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Workflows summary file not found: ${summaryPath}`
        );
      }
      
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      console.log(`Found ${summary.length} processed workflows`);
      
      // Process each workflow
      const results = [];
      for (const workflow of summary) {
        // Generate text for embedding
        const textForEmbedding = `
          Workflow Name: ${workflow.name}
          Category: ${workflow.category}
          Description: ${workflow.description}
          Tags: ${workflow.tags.join(', ')}
          Complexity: ${workflow.complexity.complexity}
        `;
        
        // Generate embeddings
        const embeddings = await generateEmbeddings(textForEmbedding);
        
        // Store in Qdrant
        await qdrantClient.upsert(COLLECTION_NAME, {
          wait: true,
          points: [
            {
              id: workflow.id,
              vector: embeddings,
              payload: {
                id: workflow.id,
                name: workflow.name,
                category: workflow.category,
                description: workflow.description,
                tags: workflow.tags,
                complexity: workflow.complexity,
                originalFilename: workflow.originalFilename,
              },
            },
          ],
        });
        
        results.push({
          id: workflow.id,
          name: workflow.name,
          category: workflow.category,
          vectorized: true,
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Successfully vectorized ${results.length} workflows`,
              results,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error vectorizing workflows:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error vectorizing workflows: ${error.message || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Search for similar workflows based on a query
   */
  private async searchSimilarWorkflows(args: any): Promise<any> {
    try {
      const { query, limit = 10, filter = {} } = args;
      
      // Generate embeddings for the query
      const embeddings = await generateEmbeddings(query);
      
      // Build filter
      const filterConditions: any = { must: [] };
      
      if (filter.category) {
        filterConditions.must.push({
          key: 'category',
          match: { value: filter.category },
        });
      }
      
      if (filter.tags && filter.tags.length > 0) {
        filter.tags.forEach((tag: string) => {
          filterConditions.must.push({
            key: 'tags',
            match: { value: tag },
          });
        });
      }
      
      if (filter.complexity) {
        filterConditions.must.push({
          key: 'complexity.complexity',
          match: { value: filter.complexity },
        });
      }
      
      // Search in Qdrant
      const searchParams: any = {
        vector: embeddings,
        limit: limit,
        with_payload: true,
      };
      
      if (filterConditions.must.length > 0) {
        searchParams.filter = filterConditions;
      }
      
      const searchResults = await qdrantClient.search(COLLECTION_NAME, searchParams);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              results: searchResults.map((result) => ({
                id: result.id,
                score: result.score,
                payload: result.payload,
              })),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error searching workflows:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error searching workflows: ${error.message || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get all workflow categories
   */
  private async getWorkflowCategories(): Promise<any> {
    try {
      const result = await qdrantClient.scroll(COLLECTION_NAME, {
        limit: 1000,
        with_payload: { include: ['category'] },
      });
      
      const categories = new Set<string>();
      result.points.forEach((point) => {
        if (point.payload && point.payload.category) {
          categories.add(point.payload.category as string);
        }
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              categories: Array.from(categories),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting workflow categories:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting workflow categories: ${error.message || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get all workflow tags
   */
  private async getWorkflowTags(): Promise<any> {
    try {
      const result = await qdrantClient.scroll(COLLECTION_NAME, {
        limit: 1000,
        with_payload: { include: ['tags'] },
      });
      
      const tags = new Set<string>();
      result.points.forEach((point) => {
        if (point.payload && point.payload.tags) {
          (point.payload.tags as string[]).forEach((tag) => tags.add(tag));
        }
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tags: Array.from(tags),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting workflow tags:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting workflow tags: ${error.message || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Qdrant MCP server running on stdio');
  }
}

const server = new QdrantServer();
server.run().catch(console.error);
