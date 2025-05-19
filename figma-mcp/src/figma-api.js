const axios = require('axios');
const cache = require('./utils/cache');
const logger = require('./utils/logger');

class FigmaAPI {
  constructor(token) {
    this.token = token || process.env.FIGMA_ACCESS_TOKEN;
    if (!this.token) {
      throw new Error('Figma access token is required. Please set FIGMA_ACCESS_TOKEN environment variable.');
    }
    
    this.baseURL = 'https://api.figma.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Figma-Token': this.token
      }
    });
    
    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleRequestError(error)
    );
  }

  /**
   * Handle request errors with special handling for rate limits
   */
  async handleRequestError(error) {
    if (error.response) {
      const { status, headers } = error.response;
      
      // Handle rate limiting (429)
      if (status === 429) {
        const retryAfter = headers['retry-after'] ? parseInt(headers['retry-after']) * 1000 : 60000;
        logger.warn(`Rate limit exceeded. Retrying after ${retryAfter/1000} seconds.`);
        
        // Wait for the retry-after period
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        
        // Retry the request
        return this.client.request(error.config);
      }
      
      // Handle other errors
      const errorMessage = error.response.data.message || error.message;
      logger.error(`Figma API error: ${status} - ${errorMessage}`);
    } else {
      logger.error(`Figma API request failed: ${error.message}`);
    }
    
    return Promise.reject(error);
  }

  /**
   * Get file data by key
   * @param {string} fileKey - Figma file key
   * @param {Object} opts - Options
   * @returns {Promise<Object>} File data
   */
  async getFile(fileKey, opts = {}) {
    const cacheKey = `file-${fileKey}-${JSON.stringify(opts)}`;
    
    if (!opts.noCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for file ${fileKey}`);
        return cached;
      }
    }
    
    logger.debug(`Fetching file ${fileKey} from Figma API`);
    const params = {};
    
    if (opts.ids) {
      params.ids = Array.isArray(opts.ids) ? opts.ids.join(',') : opts.ids;
    }
    
    if (opts.depth) {
      params.depth = opts.depth;
    }
    
    if (opts.geometry) {
      params.geometry = opts.geometry;
    }
    
    if (opts.plugin_data) {
      params.plugin_data = opts.plugin_data;
    }
    
    if (opts.branch_data) {
      params.branch_data = opts.branch_data;
    }
    
    const response = await this.client.get(`/files/${fileKey}`, { params });
    
    if (!opts.noCache) {
      await cache.set(cacheKey, response.data);
    }
    
    return response.data;
  }

  /**
   * Get file nodes by IDs
   * @param {string} fileKey - Figma file key
   * @param {string[]} ids - Node IDs
   * @returns {Promise<Object>} Nodes data
   */
  async getFileNodes(fileKey, ids) {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    
    const cacheKey = `nodes-${fileKey}-${ids.join('-')}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for file nodes ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching nodes for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/nodes`, {
      params: { ids: ids.join(',') }
    });
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * List files in a project
   * @param {string} projectId - Figma project ID
   * @returns {Promise<Object>} Project files
   */
  async listFilesInProject(projectId) {
    const cacheKey = `project-files-${projectId}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for project files ${projectId}`);
      return cached;
    }
    
    logger.debug(`Fetching files for project ${projectId}`);
    const response = await this.client.get(`/projects/${projectId}/files`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * List files in a team
   * @param {string} teamId - Figma team ID
   * @returns {Promise<Object>} Team projects and files
   */
  async listFilesInTeam(teamId) {
    const cacheKey = `team-files-${teamId}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for team files ${teamId}`);
      return cached;
    }
    
    logger.debug(`Fetching files for team ${teamId}`);
    const response = await this.client.get(`/teams/${teamId}/projects`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get comments for a file
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Comments data
   */
  async getComments(fileKey) {
    const cacheKey = `comments-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for comments ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching comments for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/comments`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Post a comment on a file
   * @param {string} fileKey - Figma file key
   * @param {string} message - Comment message
   * @param {Object} [opts] - Optional parameters
   * @returns {Promise<Object>} Comment data
   */
  async postComment(fileKey, message, opts = {}) {
    logger.debug(`Posting comment to file ${fileKey}`);
    
    const payload = {
      message,
      ...opts
    };
    
    const response = await this.client.post(`/files/${fileKey}/comments`, payload);
    
    // Invalidate comments cache
    await cache.del(`comments-${fileKey}`);
    
    return response.data;
  }

  /**
   * Get component data
   * @param {string} key - Component key
   * @returns {Promise<Object>} Component data
   */
  async getComponent(key) {
    const cacheKey = `component-${key}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for component ${key}`);
      return cached;
    }
    
    logger.debug(`Fetching component ${key}`);
    const response = await this.client.get(`/components/${key}`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get file components
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Components data
   */
  async getFileComponents(fileKey) {
    const cacheKey = `file-components-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for file components ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching components for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/components`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get styles in a file
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Styles data
   */
  async getFileStyles(fileKey) {
    const cacheKey = `file-styles-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for file styles ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching styles for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/styles`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get file variables and variable collections
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Variables data
   */
  async getFileVariables(fileKey) {
    const cacheKey = `file-variables-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for file variables ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching variables for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/variables`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Export file or node as images
   * @param {string} fileKey - Figma file key
   * @param {Object} opts - Export options
   * @returns {Promise<Object>} Image URLs
   */
  async exportImage(fileKey, opts = {}) {
    const params = {
      format: opts.format || 'png',
      scale: opts.scale || 1
    };
    
    if (opts.ids) {
      params.ids = Array.isArray(opts.ids) ? opts.ids.join(',') : opts.ids;
    }
    
    if (opts.svg_include_id) {
      params.svg_include_id = opts.svg_include_id;
    }
    
    if (opts.svg_simplify_stroke) {
      params.svg_simplify_stroke = opts.svg_simplify_stroke;
    }
    
    if (opts.use_absolute_bounds) {
      params.use_absolute_bounds = opts.use_absolute_bounds;
    }
    
    logger.debug(`Exporting images for file ${fileKey}`);
    const response = await this.client.get(`/images/${fileKey}`, { params });
    
    return response.data;
  }

  /**
   * Get image fill URLs
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Image URLs
   */
  async getImageFills(fileKey) {
    const cacheKey = `image-fills-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for image fills ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching image fills for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/images`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get user information
   * @returns {Promise<Object>} User data
   */
  async getMe() {
    const cacheKey = 'me';
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug('Cache hit for user data');
      return cached;
    }
    
    logger.debug('Fetching user data');
    const response = await this.client.get('/me');
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get version history for a file
   * @param {string} fileKey - Figma file key
   * @returns {Promise<Object>} Version history
   */
  async getVersions(fileKey) {
    const cacheKey = `versions-${fileKey}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.debug(`Cache hit for versions ${fileKey}`);
      return cached;
    }
    
    logger.debug(`Fetching versions for file ${fileKey}`);
    const response = await this.client.get(`/files/${fileKey}/versions`);
    
    await cache.set(cacheKey, response.data);
    return response.data;
  }
}

module.exports = new FigmaAPI(); 