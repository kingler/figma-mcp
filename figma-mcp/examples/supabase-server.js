/**
 * Example implementation of a Supabase MCP server.
 * 
 * This example shows how to:
 * 1. Create a Supabase MCP server instance
 * 2. Register database tables for CRUD operations
 * 3. Register custom SQL query tool
 * 4. Start the server
 * 
 * Usage:
 * - Ensure you have set up your Supabase project
 * - Configure SUPABASE_URL and SUPABASE_KEY in your .env file
 * - Run this script: node examples/supabase-server.js
 */

require('dotenv').config();
const { SupabaseMcpServer } = require('../src/mcp-server-supabase');
const figmaTools = require('../src/tools');
const logger = require('../src/utils/logger');

// Read environment variables
const port = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;

// Validate required environment variables
if (!supabaseUrl) {
  logger.error('SUPABASE_URL is required. Please add it to your .env file.');
  process.exit(1);
}

if (!supabaseKey) {
  logger.error('SUPABASE_KEY is required. Please add it to your .env file.');
  process.exit(1);
}

if (!figmaToken) {
  logger.error('FIGMA_ACCESS_TOKEN is required. Please add it to your .env file.');
  process.exit(1);
}

// Create the Supabase MCP server instance
const server = new SupabaseMcpServer({
  supabaseUrl,
  supabaseKey,
  name: 'figma-supabase-server',
  description: 'Figma MCP Server with Supabase integration for storing design data',
  version: '1.0.0'
});

// Register standard Figma tools with the Supabase server
figmaTools.registerAllTools(server, { figmaToken });

// Define tables for CRUD operations
// These should match the tables in your Supabase project
const tables = [
  { name: 'design_projects' },
  { name: 'design_components' },
  { name: 'design_assets' },
  { name: 'design_tokens' },
  { name: 'user_feedback' }
];

// Register database tools for each table
server.registerDatabaseTools(tables);

// Register SQL query tool if you have the appropriate function set up in Supabase
// Note: You need to create a PostgreSQL function called 'run_sql_query' in your Supabase project
server.registerSqlQueryTool();

// Add example custom resource to track design token usage
server.registerResource({
  name: 'design-token-usage',
  description: 'Get statistics on design token usage across projects',
  handler: async (context) => {
    try {
      // Query Supabase for design token usage stats
      const { data, error } = await server.supabase
        .from('design_tokens')
        .select('name, value, usage_count, last_used')
        .order('usage_count', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Process the data
      const tokensByCategory = data.reduce((acc, token) => {
        const category = token.name.split('/')[0] || 'unknown';
        
        if (!acc[category]) {
          acc[category] = [];
        }
        
        acc[category].push(token);
        return acc;
      }, {});
      
      // Calculate stats
      const totalTokens = data.length;
      const totalUsage = data.reduce((sum, token) => sum + (token.usage_count || 0), 0);
      const unusedTokens = data.filter(token => !token.usage_count || token.usage_count === 0).length;
      
      return {
        summary: {
          totalTokens,
          totalUsage,
          unusedTokens,
          averageUsage: totalTokens > 0 ? totalUsage / totalTokens : 0
        },
        tokensByCategory
      };
    } catch (error) {
      logger.error(`Error fetching design token usage: ${error.message}`);
      throw error;
    }
  }
});

// Add example custom tool to synchronize design tokens from Figma to Supabase
server.registerTool({
  name: 'sync-design-tokens',
  description: 'Synchronize design tokens from Figma to Supabase',
  parameters: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'Figma file key'
      },
      force: {
        type: 'boolean',
        description: 'Force sync even if tokens are already up to date'
      }
    },
    required: ['fileKey'],
    parse: (args) => args
  },
  handler: async (args) => {
    try {
      const { fileKey, force = false } = args;
      
      // Find the variable-tools to extract design tokens
      const extractTokensTool = server.tools.get('extract-design-tokens');
      
      if (!extractTokensTool) {
        throw new Error('extract-design-tokens tool not registered');
      }
      
      // Extract tokens from Figma
      const tokens = await extractTokensTool.handler({ fileKey, format: 'json' });
      
      if (!tokens || !tokens.tokens) {
        throw new Error('No tokens found in Figma file');
      }
      
      // Process tokens for storage
      const tokenEntries = [];
      
      // Flatten nested token structure
      const flattenTokens = (obj, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const path = prefix ? `${prefix}/${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            flattenTokens(value, path);
          } else {
            tokenEntries.push({
              name: path,
              value: JSON.stringify(value),
              type: Array.isArray(value) ? 'array' : typeof value,
              last_updated: new Date().toISOString(),
              file_key: fileKey
            });
          }
        });
      };
      
      flattenTokens(tokens.tokens);
      
      // Get existing tokens from database
      const { data: existingTokens, error: fetchError } = await server.supabase
        .from('design_tokens')
        .select('name, value, file_key')
        .eq('file_key', fileKey);
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Create a map of existing tokens
      const existingTokenMap = existingTokens.reduce((map, token) => {
        map[token.name] = token;
        return map;
      }, {});
      
      // Split tokens into insert, update, and unchanged
      const tokensToInsert = [];
      const tokensToUpdate = [];
      
      tokenEntries.forEach(token => {
        const existingToken = existingTokenMap[token.name];
        
        if (!existingToken) {
          // New token - insert
          tokensToInsert.push(token);
        } else if (force || existingToken.value !== token.value) {
          // Changed token - update
          tokensToUpdate.push(token);
        }
        // Otherwise token is unchanged - skip
      });
      
      // Perform database operations
      let insertResult, updateResult;
      
      if (tokensToInsert.length > 0) {
        const { data, error } = await server.supabase
          .from('design_tokens')
          .insert(tokensToInsert)
          .select();
        
        if (error) {
          throw error;
        }
        
        insertResult = data;
      }
      
      if (tokensToUpdate.length > 0) {
        // Update tokens one by one to maintain transaction safety
        updateResult = [];
        
        for (const token of tokensToUpdate) {
          const { data, error } = await server.supabase
            .from('design_tokens')
            .update(token)
            .eq('name', token.name)
            .eq('file_key', fileKey)
            .select();
          
          if (error) {
            throw error;
          }
          
          updateResult.push(...data);
        }
      }
      
      return {
        success: true,
        summary: {
          totalTokens: tokenEntries.length,
          inserted: tokensToInsert.length,
          updated: tokensToUpdate.length,
          unchanged: tokenEntries.length - tokensToInsert.length - tokensToUpdate.length
        },
        insertedIds: insertResult ? insertResult.map(t => t.id) : [],
        updatedIds: updateResult ? updateResult.map(t => t.id) : []
      };
    } catch (error) {
      logger.error(`Error syncing design tokens: ${error.message}`);
      throw error;
    }
  }
});

// Start the server
const server_instance = server.listen(port);

// Handle shutdown gracefully
const shutdown = () => {
  logger.info('Shutting down server...');
  server_instance.close(() => {
    logger.info('Server stopped');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info(`Supabase MCP server started on port ${port}`);