const { z } = require('zod');
const figmaAPI = require('../figma-api');
const logger = require('../utils/logger');

/**
 * Variable-related tools for Figma MCP server
 */
const variableTools = [
  {
    name: 'get-file-variables',
    description: 'Get all variables and variable collections in a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get file variables',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-file-variables tool for file ${fileKey}`);
      
      try {
        const variablesData = await figmaAPI.getFileVariables(fileKey);
        
        // Organize data for easier consumption
        const collections = {};
        
        if (variablesData.meta && variablesData.meta.variableCollections) {
          for (const [id, collection] of Object.entries(variablesData.meta.variableCollections)) {
            collections[id] = {
              ...collection,
              variables: []
            };
          }
        }
        
        if (variablesData.meta && variablesData.meta.variables) {
          for (const [id, variable] of Object.entries(variablesData.meta.variables)) {
            if (collections[variable.variableCollectionId]) {
              collections[variable.variableCollectionId].variables.push({
                id,
                ...variable
              });
            }
          }
        }
        
        return {
          success: true,
          variables: variablesData,
          collections: Object.values(collections)
        };
      } catch (error) {
        logger.error(`Error in get-file-variables tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'analyze-variable-usage',
    description: 'Analyze how variables are used in a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      variableId: z.string().optional().describe('Optional specific variable ID to analyze')
    }),
    examples: [
      {
        name: 'Analyze all variables',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Analyze specific variable',
        arguments: {
          fileKey: 'abc123',
          variableId: 'xyz789'
        }
      }
    ],
    handler: async ({ fileKey, variableId }) => {
      logger.info(`Executing analyze-variable-usage tool for file ${fileKey}`);
      
      try {
        // Get file data and variables
        const [fileData, variablesData] = await Promise.all([
          figmaAPI.getFile(fileKey),
          figmaAPI.getFileVariables(fileKey)
        ]);
        
        // Track variable usage
        const usageMap = {};
        
        // Initialize usage map for all variables or just the specified one
        if (variableId) {
          usageMap[variableId] = {
            id: variableId,
            name: variablesData.meta?.variables?.[variableId]?.name || 'Unknown Variable',
            type: variablesData.meta?.variables?.[variableId]?.resolvedType || 'Unknown',
            usageCount: 0,
            usageLocations: []
          };
        } else if (variablesData.meta && variablesData.meta.variables) {
          for (const [id, variable] of Object.entries(variablesData.meta.variables)) {
            usageMap[id] = {
              id,
              name: variable.name,
              type: variable.resolvedType,
              collectionId: variable.variableCollectionId,
              usageCount: 0,
              usageLocations: []
            };
          }
        }
        
        // Helper function to recursively find variable usage
        const findVariableUsage = (node, path = []) => {
          if (!node) return;
          
          const currentPath = [...path, node.name || 'Unnamed'];
          
          // Check for variable bindings in this node
          if (node.boundVariables) {
            for (const [property, binding] of Object.entries(node.boundVariables)) {
              // For direct bindings
              if (binding.id && usageMap[binding.id]) {
                usageMap[binding.id].usageCount++;
                usageMap[binding.id].usageLocations.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type,
                  property,
                  path: currentPath.join(' > ')
                });
              }
              
              // For composite bindings (e.g. variants)
              if (binding.type === 'VARIABLE_ALIAS' && binding.id && usageMap[binding.id]) {
                usageMap[binding.id].usageCount++;
                usageMap[binding.id].usageLocations.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type,
                  property,
                  path: currentPath.join(' > ')
                });
              }
            }
          }
          
          // Check children if they exist
          if (node.children) {
            for (const child of node.children) {
              findVariableUsage(child, currentPath);
            }
          }
        };
        
        // Start the search from the document root
        findVariableUsage(fileData.document);
        
        // Convert to array for easier consumption
        const usageArray = Object.values(usageMap);
        
        // Sort by usage count (descending)
        usageArray.sort((a, b) => b.usageCount - a.usageCount);
        
        return {
          success: true,
          variableUsage: usageArray,
          totalUsages: usageArray.reduce((sum, variable) => sum + variable.usageCount, 0)
        };
      } catch (error) {
        logger.error(`Error in analyze-variable-usage tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'extract-design-tokens',
    description: 'Extract design tokens from Figma variables in a structured format',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      format: z.enum(['json', 'css', 'scss']).optional().describe('Output format (defaults to json)')
    }),
    examples: [
      {
        name: 'Extract tokens as JSON',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Extract tokens as CSS variables',
        arguments: {
          fileKey: 'abc123',
          format: 'css'
        }
      }
    ],
    handler: async ({ fileKey, format = 'json' }) => {
      logger.info(`Executing extract-design-tokens tool for file ${fileKey} in ${format} format`);
      
      try {
        // Get variables data
        const variablesData = await figmaAPI.getFileVariables(fileKey);
        
        if (!variablesData.meta || !variablesData.meta.variables || !variablesData.meta.variableCollections) {
          return {
            success: false,
            error: 'No variables found in the file'
          };
        }
        
        // Extract collections and their modes
        const collections = {};
        
        for (const [collectionId, collection] of Object.entries(variablesData.meta.variableCollections)) {
          collections[collectionId] = {
            name: collection.name,
            modes: collection.modes,
            variables: []
          };
        }
        
        // Extract variables and their values
        for (const [variableId, variable] of Object.entries(variablesData.meta.variables)) {
          if (collections[variable.variableCollectionId]) {
            collections[variable.variableCollectionId].variables.push({
              id: variableId,
              name: variable.name,
              type: variable.resolvedType,
              values: variable.valuesByMode
            });
          }
        }
        
        // Convert to the requested format
        let formattedTokens;
        
        switch (format) {
          case 'css':
            formattedTokens = generateCssVariables(collections);
            break;
          case 'scss':
            formattedTokens = generateScssVariables(collections);
            break;
          case 'json':
          default:
            formattedTokens = generateJsonTokens(collections);
            break;
        }
        
        return {
          success: true,
          tokens: formattedTokens,
          format,
          collectionCount: Object.keys(collections).length,
          variableCount: Object.values(variablesData.meta.variables).length
        };
      } catch (error) {
        logger.error(`Error in extract-design-tokens tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'compare-variable-collections',
    description: 'Compare variable collections across modes to find inconsistencies',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      collectionId: z.string().optional().describe('Optional specific collection ID to analyze')
    }),
    examples: [
      {
        name: 'Compare all collections',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Compare specific collection',
        arguments: {
          fileKey: 'abc123',
          collectionId: 'xyz789'
        }
      }
    ],
    handler: async ({ fileKey, collectionId }) => {
      logger.info(`Executing compare-variable-collections tool for file ${fileKey}`);
      
      try {
        // Get variables data
        const variablesData = await figmaAPI.getFileVariables(fileKey);
        
        if (!variablesData.meta || !variablesData.meta.variables || !variablesData.meta.variableCollections) {
          return {
            success: false,
            error: 'No variables found in the file'
          };
        }
        
        // Filter collections if specified
        const collectionsToAnalyze = collectionId
          ? { [collectionId]: variablesData.meta.variableCollections[collectionId] }
          : variablesData.meta.variableCollections;
        
        // Analysis results
        const results = [];
        
        // Analyze each collection
        for (const [cId, collection] of Object.entries(collectionsToAnalyze)) {
          if (!collection) continue;
          
          const collectionResult = {
            id: cId,
            name: collection.name,
            modeCount: collection.modes.length,
            modes: collection.modes.map(mode => mode.name),
            missingValues: [],
            typeInconsistencies: []
          };
          
          // Find variables in this collection
          const collectionVariables = Object.entries(variablesData.meta.variables)
            .filter(([_, variable]) => variable.variableCollectionId === cId)
            .map(([id, variable]) => ({ id, ...variable }));
          
          // Check each variable for missing values or inconsistencies
          for (const variable of collectionVariables) {
            const modeValues = variable.valuesByMode || {};
            
            // Check for missing values in any mode
            for (const mode of collection.modes) {
              if (!modeValues[mode.modeId]) {
                collectionResult.missingValues.push({
                  variableId: variable.id,
                  variableName: variable.name,
                  missingMode: mode.name,
                  modeName: mode.name
                });
              }
            }
            
            // Check for type inconsistencies across modes
            const valueTypes = new Set();
            
            for (const [modeId, value] of Object.entries(modeValues)) {
              const valueType = typeof value;
              valueTypes.add(valueType);
              
              // For objects (like colors), add more specific typing
              if (valueType === 'object') {
                if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
                  valueTypes.add('color');
                }
              }
            }
            
            if (valueTypes.size > 1) {
              collectionResult.typeInconsistencies.push({
                variableId: variable.id,
                variableName: variable.name,
                types: Array.from(valueTypes)
              });
            }
          }
          
          results.push(collectionResult);
        }
        
        return {
          success: true,
          collections: results,
          collectionCount: results.length,
          hasInconsistencies: results.some(r => 
            r.missingValues.length > 0 || r.typeInconsistencies.length > 0
          )
        };
      } catch (error) {
        logger.error(`Error in compare-variable-collections tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

/**
 * Generate JSON design tokens from Figma variables
 * @param {Object} collections - Variable collections
 * @returns {Object} JSON tokens
 */
function generateJsonTokens(collections) {
  const result = {};
  
  for (const collection of Object.values(collections)) {
    const collectionName = collection.name.toLowerCase().replace(/\s+/g, '-');
    result[collectionName] = {};
    
    // Create a section for each mode
    for (const mode of collection.modes) {
      result[collectionName][mode.name.toLowerCase().replace(/\s+/g, '-')] = {};
    }
    
    // Add variables to each mode
    for (const variable of collection.variables) {
      const variableName = variable.name.toLowerCase().replace(/\s+/g, '-');
      
      for (const mode of collection.modes) {
        const modeId = mode.modeId;
        const value = variable.values[modeId];
        
        if (value !== undefined) {
          const modeName = mode.name.toLowerCase().replace(/\s+/g, '-');
          
          // Format the value based on type
          let formattedValue = value;
          
          if (typeof value === 'object' && value !== null) {
            // Handle color values
            if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
              const r = Math.round(value.r * 255);
              const g = Math.round(value.g * 255);
              const b = Math.round(value.b * 255);
              const a = value.a !== undefined ? value.a : 1;
              
              formattedValue = a < 1
                ? `rgba(${r}, ${g}, ${b}, ${a})`
                : `rgb(${r}, ${g}, ${b})`;
            }
          }
          
          result[collectionName][modeName][variableName] = formattedValue;
        }
      }
    }
  }
  
  return result;
}

/**
 * Generate CSS variables from Figma variables
 * @param {Object} collections - Variable collections
 * @returns {string} CSS variables
 */
function generateCssVariables(collections) {
  let css = '';
  
  for (const collection of Object.values(collections)) {
    const collectionName = collection.name.toLowerCase().replace(/\s+/g, '-');
    
    // Create a section for each mode
    for (const mode of collection.modes) {
      const modeName = mode.name.toLowerCase().replace(/\s+/g, '-');
      css += `/* ${collection.name} - ${mode.name} */\n`;
      
      if (mode.name.toLowerCase() === 'default' || mode.name.toLowerCase() === 'light') {
        css += `:root {\n`;
      } else {
        css += `[data-theme="${modeName}"] {\n`;
      }
      
      // Add variables for this mode
      for (const variable of collection.variables) {
        const variableName = variable.name.toLowerCase().replace(/\s+/g, '-');
        const value = variable.values[mode.modeId];
        
        if (value !== undefined) {
          // Format the value based on type
          let formattedValue = value;
          
          if (typeof value === 'object' && value !== null) {
            // Handle color values
            if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
              const r = Math.round(value.r * 255);
              const g = Math.round(value.g * 255);
              const b = Math.round(value.b * 255);
              const a = value.a !== undefined ? value.a : 1;
              
              formattedValue = a < 1
                ? `rgba(${r}, ${g}, ${b}, ${a})`
                : `rgb(${r}, ${g}, ${b})`;
            }
          }
          
          css += `  --${collectionName}-${variableName}: ${formattedValue};\n`;
        }
      }
      
      css += `}\n\n`;
    }
  }
  
  return css;
}

/**
 * Generate SCSS variables from Figma variables
 * @param {Object} collections - Variable collections
 * @returns {string} SCSS variables
 */
function generateScssVariables(collections) {
  let scss = '';
  
  for (const collection of Object.values(collections)) {
    const collectionName = collection.name.toLowerCase().replace(/\s+/g, '-');
    scss += `// ${collection.name}\n`;
    
    // Create maps for each mode
    for (const mode of collection.modes) {
      const modeName = mode.name.toLowerCase().replace(/\s+/g, '-');
      scss += `$${collectionName}-${modeName}: (\n`;
      
      // Add variables for this mode
      for (const variable of collection.variables) {
        const variableName = variable.name.toLowerCase().replace(/\s+/g, '-');
        const value = variable.values[mode.modeId];
        
        if (value !== undefined) {
          // Format the value based on type
          let formattedValue = value;
          
          if (typeof value === 'object' && value !== null) {
            // Handle color values
            if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
              const r = Math.round(value.r * 255);
              const g = Math.round(value.g * 255);
              const b = Math.round(value.b * 255);
              const a = value.a !== undefined ? value.a : 1;
              
              formattedValue = a < 1
                ? `rgba(${r}, ${g}, ${b}, ${a})`
                : `rgb(${r}, ${g}, ${b})`;
            }
          }
          
          scss += `  "${variableName}": ${formattedValue},\n`;
        }
      }
      
      scss += `);\n\n`;
    }
    
    // Add mixin for applying the theme
    scss += `@mixin apply-${collectionName}-theme($theme) {\n`;
    scss += `  @each $name, $value in map-get($${collectionName}-#{$theme}, ()) {\n`;
    scss += `    --#{$name}: #{$value};\n`;
    scss += `  }\n`;
    scss += `}\n\n`;
  }
  
  return scss;
}

module.exports = variableTools; 