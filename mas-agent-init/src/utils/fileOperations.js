/**
 * File operation utilities for the multi-agent system
 * Provides standardized methods for reading, writing, and managing files
 */

const fs = require('fs').promises;
const path = require('path');
const minimatch = require('minimatch');

/**
 * Read a file's contents
 * @param {string} filePath - Path to the file
 * @param {Object} options - Options for reading
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @returns {Promise<string>} - File contents
 */
async function readFile(filePath, options = {}) {
  try {
    const encoding = options.encoding || 'utf8';
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Write content to a file, creating directories if needed
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {Object} options - Options for writing
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @returns {Promise<void>}
 */
async function writeFile(filePath, content, options = {}) {
  try {
    const encoding = options.encoding || 'utf8';
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists before writing
    await createDirectory(dirPath);
    
    return await fs.writeFile(filePath, content, { encoding });
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Append content to a file, creating directories if needed
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to append
 * @param {Object} options - Options for appending
 * @param {string} options.encoding - File encoding (default: 'utf8')
 * @returns {Promise<void>}
 */
async function appendFile(filePath, content, options = {}) {
  try {
    const encoding = options.encoding || 'utf8';
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists before appending
    await createDirectory(dirPath);
    
    return await fs.appendFile(filePath, content, { encoding });
  } catch (error) {
    throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
  }
}

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<void>}
 */
async function createDirectory(dirPath) {
  try {
    // Check if directory already exists
    try {
      await fs.access(dirPath);
      return; // Directory exists, do nothing
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * List files in a directory with optional filtering and recursion
 * @param {string} dirPath - Path to the directory
 * @param {Object} options - Options for listing
 * @param {boolean} options.recursive - Whether to list files recursively (default: false)
 * @param {string} options.pattern - Glob pattern for filtering files (default: '*')
 * @returns {Promise<string[]>} - List of file paths
 */
async function listFiles(dirPath, options = {}) {
  const recursive = options.recursive || false;
  const pattern = options.pattern || '*';
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    let files = [];
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        // Recursively list files in subdirectories
        const subFiles = await listFiles(entryPath, options);
        files = files.concat(subFiles);
      } else if (entry.isFile()) {
        // Check if file matches pattern
        if (minimatch(entry.name, pattern)) {
          files.push(entryPath);
        }
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to list files in ${dirPath}: ${error.message}`);
  }
}

/**
 * Parse a code file with language detection based on extension
 * @param {string} filePath - Path to the code file
 * @returns {Promise<Object>} - Parsed file with content, language, and extension
 */
async function parseCodeFile(filePath) {
  try {
    const content = await readFile(filePath);
    const extension = path.extname(filePath).slice(1);
    
    // Map file extensions to language names
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sh': 'shell',
    };
    
    const language = languageMap[extension] || 'plaintext';
    
    return {
      content,
      language,
      extension
    };
  } catch (error) {
    throw new Error(`Failed to parse code file ${filePath}: ${error.message}`);
  }
}

module.exports = {
  readFile,
  writeFile,
  appendFile,
  createDirectory,
  listFiles,
  parseCodeFile
}; 