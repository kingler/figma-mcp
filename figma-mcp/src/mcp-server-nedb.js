const { McpServer } = require('./mcp-server');
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

/**
 * MCP Server implementation that integrates with NeDB for data storage
 * NeDB is a lightweight JavaScript database that's perfect for Figma data caching
 */
class NedbMcpServer extends McpServer {
  /**
   * Create a new NedbMcpServer instance
   * @param {Object} options - Server options
   * @param {string} options.dataDir - Directory to store NeDB databases (default: ./data)
   * @param {boolean} options.inMemory - Whether to use in-memory storage only (default: false)
   * @param {string} options.name - Server name
   * @param {string} options.description - Server description
   * @param {string} options.version - Server version
   * @param {number} options.requestTimeout - Request timeout in milliseconds
   */
  constructor(options = {}) {
    super({
      name: options.name || 'figma-nedb-mcp',
      description: options.description || 'Figma MCP Server with NeDB integration',
      version: options.version || '1.0.0',
      requestTimeout: options.requestTimeout
    });

    // Set up database options
    this.inMemory = options.inMemory || false;
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
    
    // Create data directory if it doesn't exist and we're not using in-memory mode
    if (!this.inMemory && !fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
        logger.info(`Created data directory: ${this.dataDir}`);
      } catch (error) {
        logger.error(`Failed to create data directory: ${error.message}`);
        throw error;
      }
    }
    
    // Initialize database collections
    this.db = {
      designProjects: this._createCollection('design_projects'),
      designComponents: this._createCollection('design_components'),
      designAssets: this._createCollection('design_assets'),
      designTokens: this._createCollection('design_tokens'),
      userFeedback: this._createCollection('user_feedback')
    };
    
    // Add database status to stats
    this.stats.nedb = {
      initialized: true,
      inMemory: this.inMemory,
      dataDir: this.dataDir,
      collections: Object.keys(this.db).length
    };

    // Register NeDB-specific resources
    this._registerNedbResources();
    
    // Register basic NeDB tools
    this._registerNedbTools();
  }

  /**
   * Create a NeDB collection
   * @param {string} name - Collection name
   * @returns {Datastore} NeDB Datastore instance
   * @private
   */
  _createCollection(name) {
    const options = {};
    
    if (!this.inMemory) {
      options.filename = path.join(this.dataDir, `${name}.db`);
      options.autoload = true;
    }
    
    const collection = new Datastore(options);
    
    // Create indexes for common fields
    collection.ensureIndex({ fieldName: 'fileKey' });
    collection.ensureIndex({ fieldName: 'name' });
    collection.ensureIndex({ fieldName: 'createdAt' });
    collection.ensureIndex({ fieldName: 'updatedAt' });
    
    logger.info(`Created NeDB collection: ${name} ${this.inMemory ? '(in-memory)' : `(${options.filename})`}`);
    return collection;
  }

  /**
   * Register NeDB-specific resources
   * @private
   */
  _registerNedbResources() {
    // Register database health resource
    this.registerResource({
      name: 'nedb-health',
      description: 'Check NeDB database health',
      handler: async () => {
        const counts = {};
        const collections = Object.entries(this.db);
        
        // Get counts for each collection
        for (const [name, collection] of collections) {
          counts[name] = await new Promise((resolve, reject) => {
            collection.count({}, (err, count) => {
              if (err) reject(err);
              else resolve(count);
            });
          });
        }
        
        return {
          status: 'healthy',
          inMemory: this.inMemory,
          dataDir: this.dataDir,
          collections: counts,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Register database stats resource
    this.registerResource({
      name: 'nedb-stats',
      description: 'Get NeDB database statistics',
      handler: async () => {
        const stats = {};
        
        // Get stats for each collection
        for (const [name, collection] of Object.entries(this.db)) {
          // Count records with various criteria
          const totalCount = await new Promise((resolve, reject) => {
            collection.count({}, (err, count) => {
              if (err) reject(err);
              else resolve(count);
            });
          });
          
          // Get last updated record
          const lastUpdated = await new Promise((resolve, reject) => {
            collection.find({})
              .sort({ updatedAt: -1 })
              .limit(1)
              .exec((err, docs) => {
                if (err) reject(err);
                else resolve(docs.length > 0 ? docs[0].updatedAt : null);
              });
          });
          
          stats[name] = {
            count: totalCount,
            lastUpdated
          };
        }
        
        return {
          stats,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Register basic NeDB tools for database operations
   * @private
   */
  _registerNedbTools() {
    // Register store design tokens tool
    this.registerTool({
      name: 'store-design-tokens',
      description: 'Store design tokens in the database',
      parameters: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          tokens: { type: 'object' },
          force: { type: 'boolean' }
        },
        required: ['fileKey', 'tokens']
      },
      handler: async (args) => {
        const { fileKey, tokens, force = false } = args;
        const now = new Date().toISOString();
        
        try {
          // Flatten token structure for easier storage and retrieval
          const flattenedTokens = this._flattenTokens(tokens, fileKey);
          const storedTokens = [];
          
          // Process each token
          for (const token of flattenedTokens) {
            // Check if token already exists
            const existing = await new Promise((resolve, reject) => {
              this.db.designTokens.findOne({ 
                fileKey: token.fileKey,
                path: token.path
              }, (err, doc) => {
                if (err) reject(err);
                else resolve(doc);
              });
            });
            
            if (existing) {
              // Update existing token if forced or value changed
              if (force || existing.value !== token.value) {
                await new Promise((resolve, reject) => {
                  this.db.designTokens.update(
                    { _id: existing._id },
                    { 
                      $set: { 
                        value: token.value,
                        updatedAt: now
                      } 
                    },
                    {},
                    (err, numReplaced) => {
                      if (err) reject(err);
                      else resolve(numReplaced);
                    }
                  );
                });
                
                storedTokens.push({
                  path: token.path,
                  action: 'updated'
                });
              }
            } else {
              // Insert new token
              token.createdAt = now;
              token.updatedAt = now;
              
              await new Promise((resolve, reject) => {
                this.db.designTokens.insert(token, (err, newDoc) => {
                  if (err) reject(err);
                  else resolve(newDoc);
                });
              });
              
              storedTokens.push({
                path: token.path,
                action: 'created'
              });
            }
          }
          
          return {
            success: true,
            fileKey,
            tokenCount: flattenedTokens.length,
            storedTokens,
            timestamp: now
          };
        } catch (error) {
          logger.error(`Failed to store design tokens: ${error.message}`);
          throw error;
        }
      }
    });
    
    // Register retrieve design tokens tool
    this.registerTool({
      name: 'retrieve-design-tokens',
      description: 'Retrieve design tokens from the database',
      parameters: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          category: { type: 'string' }
        },
        required: ['fileKey']
      },
      handler: async (args) => {
        const { fileKey, category } = args;
        
        try {
          // Build query
          const query = { fileKey };
          if (category) {
            query.category = category;
          }
          
          // Retrieve tokens
          const tokens = await new Promise((resolve, reject) => {
            this.db.designTokens.find(query)
              .sort({ path: 1 })
              .exec((err, docs) => {
                if (err) reject(err);
                else resolve(docs);
              });
          });
          
          // Rebuild nested structure
          const nestedTokens = this._nestTokens(tokens);
          
          return {
            success: true,
            fileKey,
            category: category || 'all',
            tokenCount: tokens.length,
            tokens: nestedTokens,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          logger.error(`Failed to retrieve design tokens: ${error.message}`);
          throw error;
        }
      }
    });
    
    // Register store component tool
    this.registerTool({
      name: 'store-component',
      description: 'Store a component in the database',
      parameters: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          componentId: { type: 'string' },
          component: { type: 'object' }
        },
        required: ['fileKey', 'componentId', 'component']
      },
      handler: async (args) => {
        const { fileKey, componentId, component } = args;
        const now = new Date().toISOString();
        
        try {
          // Prepare component data
          const componentData = {
            fileKey,
            componentId,
            name: component.name || 'Unnamed Component',
            description: component.description || '',
            data: component,
            createdAt: now,
            updatedAt: now
          };
          
          // Check if component already exists
          const existing = await new Promise((resolve, reject) => {
            this.db.designComponents.findOne({ 
              fileKey,
              componentId
            }, (err, doc) => {
              if (err) reject(err);
              else resolve(doc);
            });
          });
          
          let action;
          if (existing) {
            // Update existing component
            await new Promise((resolve, reject) => {
              this.db.designComponents.update(
                { _id: existing._id },
                { 
                  $set: { 
                    name: componentData.name,
                    description: componentData.description,
                    data: componentData.data,
                    updatedAt: now
                  } 
                },
                {},
                (err, numReplaced) => {
                  if (err) reject(err);
                  else resolve(numReplaced);
                }
              );
            });
            action = 'updated';
          } else {
            // Insert new component
            await new Promise((resolve, reject) => {
              this.db.designComponents.insert(componentData, (err, newDoc) => {
                if (err) reject(err);
                else resolve(newDoc);
              });
            });
            action = 'created';
          }
          
          return {
            success: true,
            fileKey,
            componentId,
            name: componentData.name,
            action,
            timestamp: now
          };
        } catch (error) {
          logger.error(`Failed to store component: ${error.message}`);
          throw error;
        }
      }
    });
    
    // Register retrieve component tool
    this.registerTool({
      name: 'retrieve-component',
      description: 'Retrieve a component from the database',
      parameters: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          componentId: { type: 'string' }
        },
        required: ['fileKey', 'componentId']
      },
      handler: async (args) => {
        const { fileKey, componentId } = args;
        
        try {
          // Retrieve component
          const component = await new Promise((resolve, reject) => {
            this.db.designComponents.findOne({
              fileKey,
              componentId
            }, (err, doc) => {
              if (err) reject(err);
              else resolve(doc);
            });
          });
          
          if (!component) {
            return {
              success: false,
              error: 'Component not found',
              fileKey,
              componentId
            };
          }
          
          return {
            success: true,
            fileKey,
            componentId,
            name: component.name,
            description: component.description,
            component: component.data,
            createdAt: component.createdAt,
            updatedAt: component.updatedAt
          };
        } catch (error) {
          logger.error(`Failed to retrieve component: ${error.message}`);
          throw error;
        }
      }
    });
    
    // Register store feedback tool
    this.registerTool({
      name: 'store-feedback',
      description: 'Store user feedback about a Figma file or component',
      parameters: {
        type: 'object',
        properties: {
          fileKey: { type: 'string' },
          componentId: { type: 'string' },
          userId: { type: 'string' },
          feedback: { type: 'string' },
          category: { type: 'string' }
        },
        required: ['fileKey', 'feedback']
      },
      handler: async (args) => {
        const { fileKey, componentId, userId, feedback, category } = args;
        const now = new Date().toISOString();
        
        try {
          // Prepare feedback data
          const feedbackData = {
            fileKey,
            componentId: componentId || null,
            userId: userId || 'anonymous',
            feedback,
            category: category || 'general',
            createdAt: now
          };
          
          // Store feedback
          const result = await new Promise((resolve, reject) => {
            this.db.userFeedback.insert(feedbackData, (err, newDoc) => {
              if (err) reject(err);
              else resolve(newDoc);
            });
          });
          
          return {
            success: true,
            feedbackId: result._id,
            fileKey,
            componentId: componentId || null,
            timestamp: now
          };
        } catch (error) {
          logger.error(`Failed to store feedback: ${error.message}`);
          throw error;
        }
      }
    });
  }

  /**
   * Helper method to flatten a nested token structure
   * @param {Object} tokens - Nested token object
   * @param {string} fileKey - Figma file key
   * @param {string} prefix - Path prefix for nested tokens
   * @returns {Array} Flattened array of tokens
   * @private
   */
  _flattenTokens(tokens, fileKey, prefix = '') {
    const result = [];
    
    for (const [key, value] of Object.entries(tokens)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const category = path.split('.')[0];
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        result.push(...this._flattenTokens(value, fileKey, path));
      } else {
        // Add leaf node
        result.push({
          fileKey,
          path,
          category,
          value: typeof value === 'object' ? JSON.stringify(value) : value,
          type: typeof value
        });
      }
    }
    
    return result;
  }

  /**
   * Helper method to convert flat token array back to nested structure
   * @param {Array} tokens - Array of token objects
   * @returns {Object} Nested token object
   * @private
   */
  _nestTokens(tokens) {
    const result = {};
    
    for (const token of tokens) {
      const parts = token.path.split('.');
      let current = result;
      
      // Build nested object structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Add leaf value, parsing JSON if needed
      const lastPart = parts[parts.length - 1];
      try {
        // Attempt to parse JSON values
        if (token.type === 'object' || token.type === 'array') {
          current[lastPart] = JSON.parse(token.value);
        } else if (token.type === 'number') {
          current[lastPart] = Number(token.value);
        } else if (token.type === 'boolean') {
          current[lastPart] = token.value === 'true';
        } else {
          current[lastPart] = token.value;
        }
      } catch (error) {
        // Fallback to raw value
        current[lastPart] = token.value;
      }
    }
    
    return result;
  }

  /**
   * Handle server stats request with NeDB-specific stats
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  handleStats(req, res) {
    // Get base stats
    const baseStats = super.handleStats(req, res);
    
    // Add NeDB-specific stats
    const stats = {
      ...baseStats,
      nedb: this.stats.nedb
    };
    
    return res.status(200).json(stats);
  }
}

module.exports = { NedbMcpServer };