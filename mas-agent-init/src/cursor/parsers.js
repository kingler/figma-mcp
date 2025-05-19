/**
 * File content parsers module
 * 
 * Provides parsers for different file formats and auto-detection capabilities.
 */

/**
 * Parse JSON content
 * @param {string} content - JSON string content to parse
 * @returns {Object} - Parsed JavaScript object
 * @throws {SyntaxError} - If JSON is invalid
 */
function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new SyntaxError(`Invalid JSON: ${error.message}`);
  }
}

/**
 * Parse CSV content into an array of rows
 * @param {string} content - CSV string content
 * @param {Object} options - CSV parsing options
 * @param {string} [options.delimiter=','] - Column delimiter
 * @param {boolean} [options.header=true] - Whether the first row is a header
 * @returns {Array} - Array of arrays (rows and columns) or objects if header is true
 */
function parseCSV(content, options = {}) {
  const delimiter = options.delimiter || ',';
  const hasHeader = options.header !== false;
  
  // Split content into rows
  const rows = content.split(/\r?\n/).filter(row => row.trim());
  
  if (rows.length === 0) {
    return [];
  }
  
  // Parse rows into columns
  const parsedRows = rows.map(row => {
    // Handle quoted values
    let columns = [];
    let currentCol = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        columns.push(currentCol);
        currentCol = '';
      } else {
        currentCol += char;
      }
    }
    
    // Add the last column
    columns.push(currentCol);
    
    // Clean up quotes from values
    return columns.map(col => {
      if (col.startsWith('"') && col.endsWith('"')) {
        return col.substring(1, col.length - 1).replace(/""/g, '"');
      }
      return col;
    });
  });
  
  // If header row exists, convert to array of objects
  if (hasHeader && parsedRows.length > 1) {
    const headerRow = parsedRows[0];
    return parsedRows.slice(1).map(row => {
      const obj = {};
      row.forEach((col, i) => {
        if (i < headerRow.length) {
          obj[headerRow[i]] = col;
        }
      });
      return obj;
    });
  }
  
  return parsedRows;
}

/**
 * Parse YAML content
 * @param {string} content - YAML string content to parse
 * @returns {Object|Array} - Parsed JavaScript object or array
 * @throws {Error} - If YAML parsing fails
 */
function parseYAML(content) {
  try {
    // Basic YAML parser implementation
    // This is a simplified implementation; in a real project,
    // you would likely use a library like js-yaml

    // Remove comments
    const lines = content
      .split(/\r?\n/)
      .map(line => line.split('#')[0])
      .filter(line => line.trim());
    
    const result = {};
    let currentIndent = 0;
    let currentPath = [];
    
    function setValue(obj, path, value) {
      let current = obj;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
    }
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Calculate indentation
      const indent = line.search(/\S/);
      
      // Handle indentation changes
      if (indent < currentIndent) {
        const levels = Math.floor((currentIndent - indent) / 2);
        currentPath = currentPath.slice(0, -levels);
      }
      currentIndent = indent;
      
      // Parse key-value pairs
      const match = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [_, key, value] = match;
        
        if (value.trim()) {
          // Convert value types
          let parsedValue = value.trim();
          
          // Try to parse as number
          if (/^-?\d+(\.\d+)?$/.test(parsedValue)) {
            parsedValue = parseFloat(parsedValue);
          } 
          // Parse boolean
          else if (parsedValue.toLowerCase() === 'true') {
            parsedValue = true;
          }
          else if (parsedValue.toLowerCase() === 'false') {
            parsedValue = false;
          }
          // Parse null
          else if (parsedValue.toLowerCase() === 'null') {
            parsedValue = null;
          }
          
          setValue(result, [...currentPath, key.trim()], parsedValue);
        } else {
          // New object
          currentPath.push(key.trim());
          setValue(result, currentPath, {});
        }
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`YAML parsing error: ${error.message}`);
  }
}

/**
 * Try to auto-detect the format of a string content and parse accordingly
 * @param {string} content - String content to parse
 * @returns {*} - Parsed content or original string if format not detected
 */
function autoDetectAndParse(content) {
  // Trim content for testing
  const trimmed = content.trim();
  
  // Check if content looks like JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return parseJSON(content);
    } catch (e) {
      // Not valid JSON, continue with other format detection
    }
  }
  
  // Check if content looks like YAML
  if (trimmed.includes(':') && !trimmed.includes(',')) {
    try {
      return parseYAML(content);
    } catch (e) {
      // Not valid YAML, continue with other format detection
    }
  }
  
  // Check if content looks like CSV
  const lines = trimmed.split('\n');
  if (lines.length > 1) {
    const commasInFirstLine = (lines[0].match(/,/g) || []).length;
    if (commasInFirstLine > 0) {
      const commasConsistent = lines.slice(1, Math.min(5, lines.length))
        .every(line => (line.match(/,/g) || []).length === commasInFirstLine);
      
      if (commasConsistent) {
        try {
          return parseCSV(content);
        } catch (e) {
          // Not valid CSV, return original content
        }
      }
    }
  }
  
  // If no format detected, return original content
  return content;
}

/**
 * Parse content based on file extension
 * @param {string} content - File content to parse
 * @param {string} extension - File extension (with dot, e.g., '.json')
 * @returns {*} - Parsed content
 */
function parseByExtension(content, extension) {
  switch (extension.toLowerCase()) {
    case '.json':
      return parseJSON(content);
    case '.csv':
      return parseCSV(content);
    case '.yaml':
    case '.yml':
      return parseYAML(content);
    default:
      return content;
  }
}

module.exports = {
  parseJSON,
  parseCSV,
  parseYAML,
  autoDetectAndParse,
  parseByExtension
}; 