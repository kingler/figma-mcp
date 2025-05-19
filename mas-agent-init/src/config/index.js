/**
 * Configuration system for Tutorial-Cursor integration
 * 
 * This module handles loading, validating, and merging configuration settings.
 */

const defaultConfig = require('./default');

/**
 * Deep merge of objects
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 * @returns {Object} - Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Validate configuration values
 * @param {Object} config - Configuration to validate
 * @returns {Object} - Validated configuration
 * @throws {Error} - If validation fails
 */
function validateConfig(config) {
  // Required fields validation
  if (!config.cursorApiSettings) {
    throw new Error('Configuration missing required section: cursorApiSettings');
  }
  
  if (!config.agentSettings) {
    throw new Error('Configuration missing required section: agentSettings');
  }
  
  // Value type validation
  if (typeof config.cursorApiSettings.timeout !== 'number') {
    throw new Error('cursorApiSettings.timeout must be a number');
  }
  
  if (typeof config.cursorApiSettings.maxFileSize !== 'number') {
    throw new Error('cursorApiSettings.maxFileSize must be a number');
  }
  
  // Apply reasonable limits
  if (config.cursorApiSettings.maxFileSize > 100 * 1024 * 1024) {
    console.warn('Warning: maxFileSize exceeds 100MB, this may cause performance issues');
  }
  
  return config;
}

/**
 * Load configuration from environment variables
 * @returns {Object} - Configuration from environment variables
 */
function loadEnvConfig() {
  const envConfig = {
    cursorApiSettings: {},
    agentSettings: {},
    integrationSettings: {},
    loggingSettings: {}
  };
  
  // Map environment variables to configuration
  if (process.env.CURSOR_API_TIMEOUT) {
    envConfig.cursorApiSettings.timeout = parseInt(process.env.CURSOR_API_TIMEOUT, 10);
  }
  
  if (process.env.CURSOR_API_MAX_FILE_SIZE) {
    envConfig.cursorApiSettings.maxFileSize = parseInt(process.env.CURSOR_API_MAX_FILE_SIZE, 10);
  }
  
  if (process.env.AGENT_VERBOSE) {
    envConfig.agentSettings.verbose = process.env.AGENT_VERBOSE === 'true';
  }
  
  if (process.env.LOG_LEVEL) {
    envConfig.loggingSettings.level = process.env.LOG_LEVEL;
  }
  
  return envConfig;
}

/**
 * Get the full configuration by merging default, environment, and custom configs
 * @param {Object} customConfig - Optional custom configuration
 * @returns {Object} - Complete configuration
 */
function getConfig(customConfig = {}) {
  // Load config from environment variables
  const envConfig = loadEnvConfig();
  
  // Merge configs in priority order: default < environment < custom
  const mergedConfig = deepMerge(
    deepMerge(defaultConfig, envConfig),
    customConfig
  );
  
  // Validate the final configuration
  return validateConfig(mergedConfig);
}

// Export the current configuration
const config = getConfig();

module.exports = {
  getConfig,
  config
}; 