const { z } = require('zod');
const figmaAPI = require('../figma-api');
const logger = require('../utils/logger');

/**
 * Component-related tools for Figma MCP server
 */
const componentTools = [
  {
    name: 'get-component',
    description: 'Get details for a specific component by key',
    parameters: z.object({
      key: z.string().describe('The component key')
    }),
    examples: [
      {
        name: 'Get component details',
        arguments: {
          key: 'abc123'
        }
      }
    ],
    handler: async ({ key }) => {
      logger.info(`Executing get-component tool for component ${key}`);
      
      try {
        const componentData = await figmaAPI.getComponent(key);
        return {
          success: true,
          component: componentData
        };
      } catch (error) {
        logger.error(`Error in get-component tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-file-components',
    description: 'Get all components in a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get file components',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-file-components tool for file ${fileKey}`);
      
      try {
        const componentsData = await figmaAPI.getFileComponents(fileKey);
        return {
          success: true,
          components: componentsData
        };
      } catch (error) {
        logger.error(`Error in get-file-components tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-component-instances',
    description: 'Find all instances of a component in a file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      componentKey: z.string().describe('The component key to search for')
    }),
    examples: [
      {
        name: 'Get component instances',
        arguments: {
          fileKey: 'abc123',
          componentKey: 'xyz789'
        }
      }
    ],
    handler: async ({ fileKey, componentKey }) => {
      logger.info(`Executing get-component-instances tool for component ${componentKey} in file ${fileKey}`);
      
      try {
        // First, get the file data
        const fileData = await figmaAPI.getFile(fileKey);
        
        // Extract component instances
        const instances = [];
        
        // Helper function to recursively find instances
        const findInstances = (node) => {
          if (!node) return;
          
          // Check if this node is an instance of the component
          if (node.type === 'INSTANCE' && node.componentId === componentKey) {
            instances.push({
              id: node.id,
              name: node.name,
              x: node.absoluteBoundingBox?.x,
              y: node.absoluteBoundingBox?.y,
              width: node.absoluteBoundingBox?.width,
              height: node.absoluteBoundingBox?.height
            });
          }
          
          // Check children if they exist
          if (node.children) {
            for (const child of node.children) {
              findInstances(child);
            }
          }
        };
        
        // Start the search from the document root
        findInstances(fileData.document);
        
        return {
          success: true,
          instances,
          count: instances.length
        };
      } catch (error) {
        logger.error(`Error in get-component-instances tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'analyze-component-structure',
    description: 'Analyze the structure of a component',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      nodeId: z.string().describe('The component node ID')
    }),
    examples: [
      {
        name: 'Analyze component structure',
        arguments: {
          fileKey: 'abc123',
          nodeId: '1:2'
        }
      }
    ],
    handler: async ({ fileKey, nodeId }) => {
      logger.info(`Executing analyze-component-structure tool for node ${nodeId} in file ${fileKey}`);
      
      try {
        // Get the specific node
        const nodeData = await figmaAPI.getFileNodes(fileKey, [nodeId]);
        
        if (!nodeData.nodes[nodeId]) {
          return {
            success: false,
            error: `Node ${nodeId} not found in file ${fileKey}`
          };
        }
        
        const node = nodeData.nodes[nodeId].document;
        
        // Helper function to analyze node structure
        const analyzeNode = (node, depth = 0) => {
          if (!node) return null;
          
          const result = {
            id: node.id,
            name: node.name,
            type: node.type,
            depth
          };
          
          if (node.children) {
            result.children = node.children.map(child => analyzeNode(child, depth + 1));
          }
          
          return result;
        };
        
        const analysis = analyzeNode(node);
        
        // Helper function to count nodes by type
        const countNodeTypes = (node) => {
          if (!node) return {};
          
          let counts = {
            [node.type]: 1
          };
          
          if (node.children) {
            for (const child of node.children) {
              const childCounts = countNodeTypes(child);
              
              for (const [type, count] of Object.entries(childCounts)) {
                counts[type] = (counts[type] || 0) + count;
              }
            }
          }
          
          return counts;
        };
        
        const nodeCounts = countNodeTypes(node);
        
        return {
          success: true,
          analysis,
          nodeCounts,
          totalNodes: Object.values(nodeCounts).reduce((a, b) => a + b, 0)
        };
      } catch (error) {
        logger.error(`Error in analyze-component-structure tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-component-sets',
    description: 'Get component sets (variants) in a file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      includeDetails: z.boolean().optional().describe('Include detailed information about each variant')
    }),
    examples: [
      {
        name: 'Get component sets',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Get component sets with details',
        arguments: {
          fileKey: 'abc123',
          includeDetails: true
        }
      }
    ],
    handler: async ({ fileKey, includeDetails }) => {
      logger.info(`Executing get-component-sets tool for file ${fileKey}`);
      
      try {
        // Get file components
        const componentsData = await figmaAPI.getFileComponents(fileKey);
        
        // Filter to find component sets
        const componentSets = componentsData.meta.components
          .filter(comp => comp.containing_frame && comp.containing_frame.nodeType === 'COMPONENT_SET')
          .reduce((sets, comp) => {
            const setId = comp.containing_frame.nodeId;
            
            if (!sets[setId]) {
              sets[setId] = {
                id: setId,
                name: comp.containing_frame.pageName || 'Unnamed Set',
                variants: []
              };
            }
            
            sets[setId].variants.push({
              id: comp.node_id,
              name: comp.name,
              description: comp.description,
              key: comp.key
            });
            
            return sets;
          }, {});
        
        // Convert to array
        const componentSetArray = Object.values(componentSets);
        
        // Fetch additional details if requested
        if (includeDetails && componentSetArray.length > 0) {
          // Get all set IDs
          const setIds = componentSetArray.map(set => set.id);
          
          // Fetch node data
          const nodeData = await figmaAPI.getFileNodes(fileKey, setIds);
          
          // Add detailed data to each set
          for (const set of componentSetArray) {
            if (nodeData.nodes[set.id]) {
              set.details = nodeData.nodes[set.id].document;
            }
          }
        }
        
        return {
          success: true,
          componentSets: componentSetArray,
          count: componentSetArray.length
        };
      } catch (error) {
        logger.error(`Error in get-component-sets tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-file-styles',
    description: 'Get all styles in a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get file styles',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-file-styles tool for file ${fileKey}`);
      
      try {
        const stylesData = await figmaAPI.getFileStyles(fileKey);
        
        // Organize styles by type
        const stylesByType = stylesData.meta.styles.reduce((acc, style) => {
          if (!acc[style.style_type]) {
            acc[style.style_type] = [];
          }
          
          acc[style.style_type].push(style);
          return acc;
        }, {});
        
        return {
          success: true,
          styles: stylesData,
          stylesByType,
          count: stylesData.meta.styles.length
        };
      } catch (error) {
        logger.error(`Error in get-file-styles tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

module.exports = componentTools; 