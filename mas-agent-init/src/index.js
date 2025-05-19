/**
 * Tutorial-Cursor Integration
 * 
 * Main entry point for the integration of Tutorial-Cursor's code operation
 * capabilities into our multi-agent system.
 */

const { config } = require('./config/index');
const cursorOperations = require('./cursor/index');
const agentIntegration = require('./agents/index');

/**
 * Initialize the Tutorial-Cursor integration with the specified configuration.
 * @param {Object} customConfig - Optional custom configuration to override defaults
 * @returns {Object} - Initialized API object with all operations
 */
function initialize(customConfig = {}) {
  // Merge default config with custom config
  const mergedConfig = { ...config, ...customConfig };
  
  // Initialize the cursor operations
  const cursor = cursorOperations.initialize(mergedConfig);
  
  // Initialize the agent integration
  const agents = agentIntegration.initialize(mergedConfig, cursor);
  
  return {
    cursor,
    agents,
    config: mergedConfig
  };
}

// Export all modules
module.exports = {
  initialize,
  cursorOperations,
  agentIntegration,
  config
}; 