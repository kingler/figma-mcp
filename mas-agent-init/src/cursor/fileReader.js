/**
 * File Reader Module
 * 
 * Specialized module for reading and parsing files in different formats.
 * This module extends the basic file operations with format-specific handling.
 */

const fs = require('fs').promises;
const path = require('path');
const parsers = require('./parsers');

/**
 * FileReader class for handling file operations and parsing
 */
class FileReader {
  /**
   * Create a new FileReader instance
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSizeBytes=10485760] - Maximum file size in bytes (default: 10MB)
   * @param {string[]} [options.allowedExtensions] - List of allowed file extensions (default: all)
   * @param {boolean} [options.parseFiles=true] - Whether to parse files based on extension
   */
  constructor(options = {}) {
    this.maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB default
    this.allowedExtensions = options.allowedExtensions || null;
    this.parseFiles = options.parseFiles !== false;
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw new Error(`Error checking file existence: ${error.message}`);
    }
  }

  /**
   * Get file information
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} File information object
   * @throws {Error} If file doesn't exist or other error occurs
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      return {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Error getting file info: ${error.message}`);
    }
  }

  /**
   * Read and optionally parse a file
   * @param {string} filePath - Path to the file
   * @param {Object} options - Read options
   * @param {string} [options.encoding='utf8'] - File encoding
   * @param {boolean} [options.parse] - Whether to parse file (overrides instance setting)
   * @returns {Promise<*>} File contents (parsed based on extension if applicable)
   * @throws {Error} If file doesn't exist, exceeds size limit, or has invalid extension
   */
  async readFile(filePath, options = {}) {
    // Default options
    const encoding = options.encoding || 'utf8';
    const shouldParse = options.parse !== undefined ? options.parse : this.parseFiles;
    
    // Check if file exists
    if (!(await this.fileExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Validate file extension if restrictions are set
    const extension = path.extname(filePath).toLowerCase();
    if (this.allowedExtensions && !this.allowedExtensions.includes(extension)) {
      throw new Error(`File type not allowed: ${extension}. Allowed types: ${this.allowedExtensions.join(', ')}`);
    }
    
    // Check file size
    const fileInfo = await this.getFileInfo(filePath);
    if (fileInfo.size > this.maxSizeBytes) {
      throw new Error(`File exceeds maximum size limit of ${this.maxSizeBytes} bytes`);
    }
    
    try {
      // Read file content
      const content = await fs.readFile(filePath, { encoding });
      
      // Return content as is if parsing is disabled
      if (!shouldParse) {
        return content;
      }
      
      // Parse based on file extension
      switch (extension) {
        case '.json':
          return parsers.parseJSON(content);
        case '.csv':
          return parsers.parseCSV(content);
        case '.yaml':
        case '.yml':
          return parsers.parseYAML(content);
        case '.txt':
        case '.md':
        case '.js':
        case '.ts':
        case '.jsx':
        case '.tsx':
        case '.css':
        case '.html':
          // Text files - return as is
          return content;
        default:
          // Unknown extension - try auto-detection if parsing is enabled
          return shouldParse ? parsers.autoDetectAndParse(content) : content;
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Parsing error: ${error.message}`);
      }
      throw new Error(`Error reading file: ${error.message}`);
    }
  }
}

module.exports = FileReader; 