const { McpServer } = require('./mcp-server');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');

/**
 * MCP Server implementation that integrates with Supabase for data storage and retrieval
 */
class SupabaseMcpServer extends McpServer {
  /**
   * Create a new SupabaseMcpServer instance
   * @param {Object} options - Server options
   * @param {string} options.supabaseUrl - Supabase project URL
   * @param {string} options.supabaseKey - Supabase API key
   * @param {string} options.name - Server name
   * @param {string} options.description - Server description
   * @param {string} options.version - Server version
   * @param {number} options.requestTimeout - Request timeout in milliseconds
   */
  constructor(options = {}) {
    super({
      name: options.name || 'figma-supabase-mcp',
      description: options.description || 'Figma MCP Server with Supabase integration',
      version: options.version || '1.0.0',
      requestTimeout: options.requestTimeout
    });

    // Validate required options
    if (!options.supabaseUrl) {
      throw new Error('Supabase URL is required');
    }

    if (!options.supabaseKey) {
      throw new Error('Supabase API key is required');
    }

    this.supabaseUrl = options.supabaseUrl;
    this.supabaseKey = options.supabaseKey;
    
    // Initialize Supabase client
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    
    // Add connection status to stats
    this.stats.supabase = {
      connected: false,
      lastConnectAttempt: null,
      lastConnectSuccess: null,
      lastConnectError: null
    };

    // Register Supabase-specific resources
    this._registerSupabaseResources();
    
    // Initialize connection
    this._initializeConnection();
  }

  /**
   * Initialize the Supabase connection
   * @private
   */
  async _initializeConnection() {
    try {
      this.stats.supabase.lastConnectAttempt = Date.now();
      
      // Test connection by fetching the current user
      const { data, error } = await this.supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      this.stats.supabase.connected = true;
      this.stats.supabase.lastConnectSuccess = Date.now();
      
      logger.info('Successfully connected to Supabase');
    } catch (error) {
      this.stats.supabase.connected = false;
      this.stats.supabase.lastConnectError = error.message;
      
      logger.error(`Failed to connect to Supabase: ${error.message}`);
    }
  }

  /**
   * Register Supabase-specific resources
   * @private
   */
  _registerSupabaseResources() {
    // Register database health resource
    this.registerResource({
      name: 'supabase-health',
      description: 'Check Supabase connection health',
      handler: async () => {
        try {
          // Test the connection
          const { data, error } = await this.supabase.auth.getUser();
          
          if (error) {
            throw error;
          }
          
          return {
            status: 'healthy',
            connected: true,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }
    });
  }

  /**
   * Register Supabase database tools
   * @param {Array} tables - Array of table configurations
   */
  registerDatabaseTools(tables) {
    if (!Array.isArray(tables)) {
      throw new Error('Tables must be an array');
    }
    
    for (const table of tables) {
      if (!table.name) {
        throw new Error('Table must have a name');
      }
      
      // Register query tool
      this.registerTool({
        name: `query-${table.name}`,
        description: `Query the ${table.name} table`,
        parameters: {
          type: 'object',
          properties: {
            select: { 
              type: 'string',
              description: 'Fields to select (comma-separated or * for all)'
            },
            filter: {
              type: 'object',
              description: 'Filter conditions'
            },
            order: {
              type: 'string',
              description: 'Order by field (prefix with - for descending)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows to return'
            },
            offset: {
              type: 'number',
              description: 'Number of rows to skip'
            }
          },
          required: ['select'],
          parse: (args) => {
            // Validation happens in Supabase
            return args;
          }
        },
        handler: async (args) => {
          try {
            const { select, filter, order, limit, offset } = args;
            
            // Start building the query
            let query = this.supabase
              .from(table.name)
              .select(select || '*');
            
            // Apply filters if provided
            if (filter && typeof filter === 'object') {
              for (const [key, value] of Object.entries(filter)) {
                query = query.eq(key, value);
              }
            }
            
            // Apply ordering if provided
            if (order) {
              const isDesc = order.startsWith('-');
              const column = isDesc ? order.substring(1) : order;
              query = query.order(column, { ascending: !isDesc });
            }
            
            // Apply pagination if provided
            if (limit !== undefined) {
              query = query.limit(limit);
            }
            
            if (offset !== undefined) {
              query = query.offset(offset);
            }
            
            // Execute the query
            const { data, error } = await query;
            
            if (error) {
              throw error;
            }
            
            return {
              data,
              count: data.length,
              table: table.name
            };
          } catch (error) {
            logger.error(`Error querying ${table.name}: ${error.message}`);
            throw error;
          }
        }
      });

      // Register insert tool
      this.registerTool({
        name: `insert-${table.name}`,
        description: `Insert into the ${table.name} table`,
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Data to insert'
            }
          },
          required: ['data'],
          parse: (args) => {
            // Validation happens in Supabase
            return args;
          }
        },
        handler: async (args) => {
          try {
            const { data } = args;
            
            const { data: result, error } = await this.supabase
              .from(table.name)
              .insert(data)
              .select();
            
            if (error) {
              throw error;
            }
            
            return {
              success: true,
              data: result,
              table: table.name
            };
          } catch (error) {
            logger.error(`Error inserting into ${table.name}: ${error.message}`);
            throw error;
          }
        }
      });

      // Register update tool
      this.registerTool({
        name: `update-${table.name}`,
        description: `Update records in the ${table.name} table`,
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Data to update'
            },
            filter: {
              type: 'object',
              description: 'Filter conditions'
            }
          },
          required: ['data', 'filter'],
          parse: (args) => {
            // Validation happens in Supabase
            return args;
          }
        },
        handler: async (args) => {
          try {
            const { data, filter } = args;
            
            // Start building the query
            let query = this.supabase
              .from(table.name)
              .update(data);
            
            // Apply filters
            if (filter && typeof filter === 'object') {
              for (const [key, value] of Object.entries(filter)) {
                query = query.eq(key, value);
              }
            } else {
              throw new Error('Filter is required for update operations');
            }
            
            // Execute the query
            const { data: result, error } = await query.select();
            
            if (error) {
              throw error;
            }
            
            return {
              success: true,
              data: result,
              count: result.length,
              table: table.name
            };
          } catch (error) {
            logger.error(`Error updating ${table.name}: ${error.message}`);
            throw error;
          }
        }
      });

      // Register delete tool
      this.registerTool({
        name: `delete-${table.name}`,
        description: `Delete records from the ${table.name} table`,
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Filter conditions'
            }
          },
          required: ['filter'],
          parse: (args) => {
            // Validation happens in Supabase
            return args;
          }
        },
        handler: async (args) => {
          try {
            const { filter } = args;
            
            // Start building the query
            let query = this.supabase
              .from(table.name)
              .delete();
            
            // Apply filters
            if (filter && typeof filter === 'object') {
              for (const [key, value] of Object.entries(filter)) {
                query = query.eq(key, value);
              }
            } else {
              throw new Error('Filter is required for delete operations');
            }
            
            // Execute the query
            const { data: result, error } = await query.select();
            
            if (error) {
              throw error;
            }
            
            return {
              success: true,
              deletedCount: result ? result.length : 0,
              table: table.name
            };
          } catch (error) {
            logger.error(`Error deleting from ${table.name}: ${error.message}`);
            throw error;
          }
        }
      });
    }
  }

  /**
   * Register a custom SQL query tool
   */
  registerSqlQueryTool() {
    this.registerTool({
      name: 'sql-query',
      description: 'Execute a custom SQL query',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute'
          },
          params: {
            type: 'array',
            description: 'Query parameters'
          }
        },
        required: ['query'],
        parse: (args) => {
          // Basic validation
          if (!args.query || typeof args.query !== 'string') {
            throw new Error('Query must be a string');
          }
          
          // Check for dangerous queries
          const dangerousOperations = [
            'DROP TABLE',
            'DROP DATABASE',
            'DELETE FROM',
            'TRUNCATE',
            'ALTER TABLE',
            'CREATE TABLE'
          ];
          
          const normalizedQuery = args.query.toUpperCase();
          
          for (const operation of dangerousOperations) {
            if (normalizedQuery.includes(operation)) {
              throw new Error(`Dangerous operation detected: ${operation}`);
            }
          }
          
          return args;
        }
      },
      handler: async (args) => {
        try {
          const { query, params = [] } = args;
          
          const { data, error } = await this.supabase.rpc('run_sql_query', {
            query_text: query,
            query_params: params
          });
          
          if (error) {
            throw error;
          }
          
          return {
            success: true,
            data,
            count: data ? data.length : 0
          };
        } catch (error) {
          logger.error(`Error executing SQL query: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Handle server stats request with Supabase-specific stats
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  handleStats(req, res) {
    // Get base stats from parent class
    const baseStats = super.handleStats(req, res);
    
    // Add Supabase-specific stats
    const stats = {
      ...baseStats,
      supabase: this.stats.supabase
    };
    
    return res.status(200).json(stats);
  }
}

module.exports = { SupabaseMcpServer };