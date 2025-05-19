/**
 * Default configuration for Tutorial-Cursor integration
 */

const defaultConfig = {
  /**
   * Configuration for Tutorial-Cursor API integration
   */
  cursorApiSettings: {
    // Base path for cursor operations relative to project root
    basePath: '.',
    // Default timeout for operations in milliseconds
    timeout: 30000,
    // Maximum file size to read/process in bytes
    maxFileSize: 10 * 1024 * 1024, // 10MB
    // Maximum number of search results to return
    maxSearchResults: 100,
    // Default search depth for recursive operations
    defaultSearchDepth: 3
  },

  /**
   * Settings for multi-agent system integration
   */
  agentSettings: {
    // Directory for storing agent-specific data
    agentDataDir: '.cursor/mas/agents',
    // Enable verbose logging for agent operations
    verbose: false,
    // Time to wait for agent response in milliseconds
    responseTimeout: 60000,
    // Maximum context window size for LLM
    maxContextSize: 32000
  },

  /**
   * Settings controlling how the systems interact
   */
  integrationSettings: {
    // Enable automatic synchronization between systems
    autoSync: true,
    // Frequency of synchronization in milliseconds
    syncInterval: 5000,
    // Preserve context when switching between agents
    preserveContext: true,
    // Maximum memory entries to track
    maxMemoryEntries: 100
  },

  /**
   * Configuration for logging
   */
  loggingSettings: {
    // Log level (debug, info, warn, error)
    level: 'info',
    // Directory for log files
    logDir: 'logs',
    // Enable console logging
    console: true,
    // Enable file logging
    file: true,
    // Maximum log file size in bytes
    maxLogSize: 5 * 1024 * 1024, // 5MB
    // Maximum number of log files to keep
    maxLogFiles: 5
  }
};

module.exports = defaultConfig; 