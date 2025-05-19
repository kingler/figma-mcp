/**
 * Agent Integration Module
 * 
 * This module provides integration points between Tutorial-Cursor
 * and the multi-agent system.
 */

// Importing modules that may be needed by the selfPromptFilter
const path = require('path');
const fs = require('fs').promises;

/**
 * Applies filtering to a prompt to identify self-prompt parts and extract next prompt suggestions
 * 
 * @param {string} text - The text to analyze for self-prompt patterns
 * @returns {Object} - Object containing filtered text and any suggested next prompts
 */
function applySelfPromptFilter(text) {
  if (!text) {
    return { text: '', suggestedNextPrompt: null };
  }

  // Check for common self-prompt markers
  const selfPromptMarkers = [
    { start: '<!-- self-prompt:', end: '-->' },
    { start: '/* self-prompt:', end: '*/' },
    { start: '# self-prompt:', end: '\n' },
    { start: '<self-prompt>', end: '</self-prompt>' },
    { start: '```self-prompt', end: '```' }
  ];

  let filteredText = text;
  let suggestedNextPrompt = null;

  // Extract and remove self-prompts from the text
  for (const marker of selfPromptMarkers) {
    let startIndex = filteredText.indexOf(marker.start);
    while (startIndex !== -1) {
      const endIndex = filteredText.indexOf(marker.end, startIndex + marker.start.length);
      
      if (endIndex !== -1) {
        // Extract the self-prompt content
        const selfPromptContent = filteredText.substring(
          startIndex + marker.start.length, 
          endIndex
        ).trim();
        
        // Check if it contains a next prompt suggestion
        const nextPromptMatch = selfPromptContent.match(/next prompt:?\s*(.+)/i);
        if (nextPromptMatch && !suggestedNextPrompt) {
          suggestedNextPrompt = nextPromptMatch[1].trim();
        }
        
        // Remove the self-prompt from the text
        filteredText = filteredText.substring(0, startIndex) + filteredText.substring(endIndex + marker.end.length);
        
        // Look for the next occurrence
        startIndex = filteredText.indexOf(marker.start);
      } else {
        // Break if no end marker is found
        break;
      }
    }
  }

  // Look for YAML-style next prompt suggestions
  const yamlPromptMatch = filteredText.match(/---\s*nextPrompt:\s*['"](.+?)['"].*?---/s);
  if (yamlPromptMatch && !suggestedNextPrompt) {
    suggestedNextPrompt = yamlPromptMatch[1].trim();
    // Remove the YAML block
    filteredText = filteredText.replace(/---\s*nextPrompt:\s*['"](.+?)['"].*?---/s, '');
  }

  // Detect structured next prompt suggestions in the text
  const structuredSuggestionMatch = filteredText.match(
    /(suggested next prompt|next prompt|suggested prompt|follow-up):\s*['"](.+?)['"]/i
  );
  if (structuredSuggestionMatch && !suggestedNextPrompt) {
    suggestedNextPrompt = structuredSuggestionMatch[2].trim();
  }

  return {
    text: filteredText.trim(),
    suggestedNextPrompt
  };
}

/**
 * Initialize the agent integration module
 * @param {Object} config - Configuration object
 * @param {Object} cursorApi - Initialized cursor operations API
 * @returns {Object} - Initialized agent integration API
 */
function initialize(config, cursorApi) {
  const { agentSettings, integrationSettings } = config;
  
  // Registry for agents
  const agentRegistry = new Map();
  
  // Memory for storing context between operations
  const memoryStore = new Map();
  
  return {
    /**
     * Register an agent with the integration system
     * @param {string} agentId - Unique identifier for the agent
     * @param {Object} agentInfo - Information about the agent
     * @returns {boolean} - Whether registration was successful
     */
    registerAgent: (agentId, agentInfo) => {
      if (agentRegistry.has(agentId)) {
        console.warn(`Agent ${agentId} is already registered. Overwriting.`);
      }
      
      agentRegistry.set(agentId, {
        id: agentId,
        ...agentInfo,
        connectedToCursor: false,
        lastActive: new Date()
      });
      
      return true;
    },
    
    /**
     * Get an agent by ID
     * @param {string} agentId - ID of the agent to retrieve
     * @returns {Object|null} - Agent information or null if not found
     */
    getAgentById: (agentId) => {
      return agentRegistry.get(agentId) || null;
    },
    
    /**
     * List all registered agents
     * @returns {Object[]} - Array of registered agents
     */
    listAgents: () => {
      return Array.from(agentRegistry.values());
    },
    
    /**
     * Connect an agent to the cursor operations
     * @param {string} agentId - ID of the agent to connect
     * @returns {boolean} - Whether connection was successful
     */
    connectAgentToCursor: (agentId) => {
      const agent = agentRegistry.get(agentId);
      
      if (!agent) {
        console.error(`Agent ${agentId} not found.`);
        return false;
      }
      
      agent.connectedToCursor = true;
      agent.lastActive = new Date();
      
      return true;
    },
    
    /**
     * Update context for an agent in memory
     * @param {string} agentId - ID of the agent
     * @param {Object} context - Context to store
     * @returns {boolean} - Whether update was successful
     */
    updateAgentContext: (agentId, context) => {
      if (!agentRegistry.has(agentId)) {
        console.error(`Agent ${agentId} not found.`);
        return false;
      }
      
      const agent = agentRegistry.get(agentId);
      agent.lastActive = new Date();
      
      // Store context in memory
      memoryStore.set(`context:${agentId}`, {
        timestamp: new Date(),
        context
      });
      
      return true;
    },
    
    /**
     * Get context for an agent from memory
     * @param {string} agentId - ID of the agent
     * @returns {Object|null} - Stored context or null if not found
     */
    getAgentContext: (agentId) => {
      const contextEntry = memoryStore.get(`context:${agentId}`);
      return contextEntry ? contextEntry.context : null;
    },
    
    /**
     * Execute a cursor operation for an agent
     * @param {string} agentId - ID of the agent
     * @param {string} operation - Operation to execute
     * @param {Object} params - Parameters for the operation
     * @returns {Promise<Object>} - Result of the operation
     */
    executeOperation: async (agentId, operation, params) => {
      const agent = agentRegistry.get(agentId);
      
      if (!agent) {
        throw new Error(`Agent ${agentId} not found.`);
      }
      
      if (!agent.connectedToCursor) {
        throw new Error(`Agent ${agentId} is not connected to cursor.`);
      }
      
      agent.lastActive = new Date();
      
      // Check if operation exists
      if (!cursorApi[operation]) {
        throw new Error(`Operation ${operation} not found.`);
      }
      
      try {
        // Execute the operation
        let result = await cursorApi[operation](...(Array.isArray(params) ? params : [params]));
        
        // Apply self-prompt filter if the result is a string
        let suggestedNextPrompt = null;
        if (typeof result === 'string') {
          const filtered = applySelfPromptFilter(result);
          result = filtered.text;
          suggestedNextPrompt = filtered.suggestedNextPrompt;
        }

        // Record the operation in memory if history tracking is enabled
        if (integrationSettings.preserveContext) {
          const history = memoryStore.get(`history:${agentId}`) || [];
          history.push({
            timestamp: new Date(),
            operation,
            params,
            success: true
          });
          
          // Limit history size
          if (history.length > integrationSettings.maxMemoryEntries) {
            history.shift();
          }
          
          memoryStore.set(`history:${agentId}`, history);
        }
        
        return { success: true, result, suggestedNextPrompt };
      } catch (error) {
        // Record the failed operation
        if (integrationSettings.preserveContext) {
          const history = memoryStore.get(`history:${agentId}`) || [];
          history.push({
            timestamp: new Date(),
            operation,
            params,
            success: false,
            error: error.message
          });
          
          memoryStore.set(`history:${agentId}`, history);
        }
        
        return { success: false, error: error.message };
      }
    },
    
    /**
     * Get operation history for an agent
     * @param {string} agentId - ID of the agent
     * @returns {Object[]} - Array of operation history entries
     */
    getAgentHistory: (agentId) => {
      return memoryStore.get(`history:${agentId}`) || [];
    }
  };
}

module.exports = {
  initialize
}; 