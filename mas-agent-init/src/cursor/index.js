/**
 * Cursor Operations Module
 * 
 * This module provides integration with Tutorial-Cursor's code operation capabilities.
 */

const fs = require('fs').promises;
const path = require('path');
const { minimatch } = require('minimatch');
const fileOperations = require('../utils/fileOperations');
const FileReader = require('./fileReader');
const parsers = require('./parsers');

/**
 * Initialize the cursor operations module
 * @param {Object} config - Configuration object
 * @returns {Object} - Initialized cursor operations API
 */
function initialize(config) {
  const { cursorApiSettings } = config;
  
  // Initialize FileReader with configuration
  const fileReader = new FileReader({
    maxSizeBytes: cursorApiSettings.maxFileSize,
    parseFiles: true
  });
  
  return {
    /**
     * Read a file with cursor operations
     * @param {string} path - Path to the file
     * @param {Object} options - Options for reading the file
     * @returns {Promise<string>} - File content
     */
    readFile: async (path, options = {}) => {
      return await fileOperations.readFile(path, {
        ...options,
        resolvePath: true,
        maxSize: cursorApiSettings.maxFileSize
      });
    },
    
    /**
     * List files in a directory
     * @param {string} path - Path to the directory
     * @param {Object} options - Options for listing files
     * @returns {Promise<string[]>} - List of file paths
     */
    listDirectory: async (path, options = {}) => {
      return await fileOperations.listFiles(path, {
        ...options,
        resolvePath: true
      });
    },
    
    /**
     * Search for code matching a query
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @param {string[]} options.include - Patterns to include
     * @param {string[]} options.exclude - Patterns to exclude
     * @param {number} options.limit - Maximum number of results
     * @returns {Promise<Object[]>} - Search results
     */
    searchCode: async (query, options = {}) => {
      const {
        include = ['**/*'],
        exclude = ['node_modules/**', '.git/**'],
        limit = cursorApiSettings.maxSearchResults
      } = options;
      
      const results = [];
      const basePath = cursorApiSettings.basePath || '.';
      
      try {
        // Get all files in the directory
        const allFiles = await getAllFiles(basePath);
        
        // Filter files by include/exclude patterns
        const filteredFiles = allFiles.filter(filePath => {
          const relativePath = path.relative(basePath, filePath);
          
          // Check if file should be included
          const shouldInclude = include.some(pattern => 
            minimatch(relativePath, pattern)
          );
          
          // Check if file should be excluded
          const shouldExclude = exclude.some(pattern => 
            minimatch(relativePath, pattern)
          );
          
          return shouldInclude && !shouldExclude;
        });
        
        // Search in each file
        for (const filePath of filteredFiles) {
          if (results.length >= limit) break;
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const fileMatches = searchInContent(content, query, filePath);
            
            // Add matches to results, respecting the limit
            const remainingSlots = limit - results.length;
            results.push(...fileMatches.slice(0, remainingSlots));
          } catch (error) {
            console.error(`Error searching in file ${filePath}: ${error.message}`);
          }
        }
        
        return results;
      } catch (error) {
        console.error(`Error during code search: ${error.message}`);
        return [];
      }
    },
    
    /**
     * Modify a file using cursor operations
     * @param {string} path - Path to the file
     * @param {function|string} modification - Modification function or content
     * @param {Object} options - Options for modification
     * @returns {Promise<boolean>} - Whether the modification was successful
     */
    modifyFile: async (path, modification, options = {}) => {
      try {
        // Read the current file content
        const content = await fileOperations.readFile(path);
        
        // Apply the modification
        let newContent;
        if (typeof modification === 'function') {
          newContent = modification(content);
        } else {
          newContent = modification;
        }
        
        // Write the modified content back to the file
        await fileOperations.writeFile(path, newContent);
        
        return true;
      } catch (error) {
        console.error(`Error modifying file: ${error.message}`);
        return false;
      }
    },
    
    /**
     * Advanced file reader with automatic parsing
     * Provides additional capabilities compared to basic readFile
     */
    FileReader,
    
    /**
     * Content parsers for different file formats
     */
    parsers
  };
}

/**
 * Get all files recursively from a directory
 * @param {string} dirPath - Starting directory path
 * @returns {Promise<string[]>} - Array of file paths
 */
async function getAllFiles(dirPath) {
  const dirents = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(dirents.map(async (dirent) => {
    const res = path.resolve(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      return getAllFiles(res);
    } else {
      return res;
    }
  }));
  return files.flat();
}

/**
 * Search for a query in file content
 * @param {string} content - File content to search in
 * @param {string} query - Query to search for
 * @param {string} filePath - Path to the file
 * @returns {Object[]} - Array of search matches
 */
function searchInContent(content, query, filePath) {
  const matches = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    let index = lowerLine.indexOf(lowerQuery);
    while (index !== -1) {
      matches.push({
        path: filePath,
        content: line,
        line: lineIndex + 1,
        column: index + 1,
        matchText: line.substring(index, index + query.length)
      });
      
      index = lowerLine.indexOf(lowerQuery, index + 1);
    }
  });
  
  return matches;
}

module.exports = {
  initialize,
  searchInContent
}; 