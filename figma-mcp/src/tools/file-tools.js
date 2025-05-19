const { z } = require('zod');
const figmaAPI = require('../figma-api');
const logger = require('../utils/logger');

/**
 * File-related tools for Figma MCP server
 */
const fileTools = [
  {
    name: 'get-file',
    description: 'Retrieve a Figma file by key',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      nodes: z.array(z.string()).optional().describe('Optional array of specific node IDs to retrieve'),
      depth: z.number().optional().describe('Optional depth to retrieve for the document tree')
    }),
    examples: [
      {
        name: 'Basic file retrieval',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Retrieve specific nodes',
        arguments: {
          fileKey: 'abc123',
          nodes: ['1:2', '3:4']
        }
      }
    ],
    handler: async ({ fileKey, nodes, depth }) => {
      logger.info(`Executing get-file tool for file ${fileKey}`);
      
      const options = {};
      
      if (nodes) {
        options.ids = nodes;
      }
      
      if (depth) {
        options.depth = depth;
      }
      
      try {
        const fileData = await figmaAPI.getFile(fileKey, options);
        return {
          success: true,
          file: fileData
        };
      } catch (error) {
        logger.error(`Error in get-file tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'list-files',
    description: 'List files in a Figma project or team',
    parameters: z.object({
      projectId: z.string().optional().describe('Figma project ID (required if teamId not provided)'),
      teamId: z.string().optional().describe('Figma team ID (required if projectId not provided)')
    }).refine(data => data.projectId || data.teamId, {
      message: 'Either projectId or teamId must be provided'
    }),
    examples: [
      {
        name: 'List files in a project',
        arguments: {
          projectId: '12345'
        }
      },
      {
        name: 'List files in a team',
        arguments: {
          teamId: '67890'
        }
      }
    ],
    handler: async ({ projectId, teamId }) => {
      logger.info(`Executing list-files tool for ${projectId ? 'project ' + projectId : 'team ' + teamId}`);
      
      try {
        let files;
        
        if (projectId) {
          files = await figmaAPI.listFilesInProject(projectId);
        } else if (teamId) {
          files = await figmaAPI.listFilesInTeam(teamId);
        } else {
          return {
            success: false,
            error: 'Either projectId or teamId must be provided'
          };
        }
        
        return {
          success: true,
          files
        };
      } catch (error) {
        logger.error(`Error in list-files tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-file-nodes',
    description: 'Get specific nodes from a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      nodeIds: z.array(z.string()).describe('Array of node IDs to retrieve')
    }),
    examples: [
      {
        name: 'Get specific nodes',
        arguments: {
          fileKey: 'abc123',
          nodeIds: ['1:2', '3:4']
        }
      }
    ],
    handler: async ({ fileKey, nodeIds }) => {
      logger.info(`Executing get-file-nodes tool for file ${fileKey}`);
      
      try {
        const nodesData = await figmaAPI.getFileNodes(fileKey, nodeIds);
        return {
          success: true,
          nodes: nodesData
        };
      } catch (error) {
        logger.error(`Error in get-file-nodes tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-file-comments',
    description: 'Get comments for a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get file comments',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-file-comments tool for file ${fileKey}`);
      
      try {
        const commentsData = await figmaAPI.getComments(fileKey);
        return {
          success: true,
          comments: commentsData
        };
      } catch (error) {
        logger.error(`Error in get-file-comments tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'post-file-comment',
    description: 'Post a comment on a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      message: z.string().describe('Comment message'),
      clientMeta: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        node_id: z.string().optional(),
        node_offset: z.object({
          x: z.number(),
          y: z.number()
        }).optional()
      }).optional().describe('Optional position metadata')
    }),
    examples: [
      {
        name: 'Post a basic comment',
        arguments: {
          fileKey: 'abc123',
          message: 'This looks great!'
        }
      },
      {
        name: 'Post a positioned comment',
        arguments: {
          fileKey: 'abc123',
          message: 'Can we adjust this button?',
          clientMeta: {
            node_id: '1:2',
            node_offset: {
              x: 100,
              y: 200
            }
          }
        }
      }
    ],
    handler: async ({ fileKey, message, clientMeta }) => {
      logger.info(`Executing post-file-comment tool for file ${fileKey}`);
      
      try {
        const commentData = await figmaAPI.postComment(fileKey, message, { client_meta: clientMeta });
        return {
          success: true,
          comment: commentData
        };
      } catch (error) {
        logger.error(`Error in post-file-comment tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-file-versions',
    description: 'Get version history for a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get file versions',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-file-versions tool for file ${fileKey}`);
      
      try {
        const versionsData = await figmaAPI.getVersions(fileKey);
        return {
          success: true,
          versions: versionsData
        };
      } catch (error) {
        logger.error(`Error in get-file-versions tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'export-file-images',
    description: 'Export images from a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key'),
      ids: z.array(z.string()).optional().describe('Optional array of node IDs to export'),
      scale: z.number().optional().describe('Export scale (defaults to 1)'),
      format: z.enum(['jpg', 'png', 'svg', 'pdf']).optional().describe('Export format (defaults to png)')
    }),
    examples: [
      {
        name: 'Export entire file as PNG',
        arguments: {
          fileKey: 'abc123'
        }
      },
      {
        name: 'Export specific nodes as SVG',
        arguments: {
          fileKey: 'abc123',
          ids: ['1:2', '3:4'],
          format: 'svg'
        }
      }
    ],
    handler: async ({ fileKey, ids, scale, format }) => {
      logger.info(`Executing export-file-images tool for file ${fileKey}`);
      
      try {
        const exportOptions = {
          format: format || 'png',
          scale: scale || 1
        };
        
        if (ids) {
          exportOptions.ids = ids;
        }
        
        const imageData = await figmaAPI.exportImage(fileKey, exportOptions);
        return {
          success: true,
          images: imageData
        };
      } catch (error) {
        logger.error(`Error in export-file-images tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'get-image-fills',
    description: 'Get image fill URLs from a Figma file',
    parameters: z.object({
      fileKey: z.string().describe('The Figma file key')
    }),
    examples: [
      {
        name: 'Get image fills',
        arguments: {
          fileKey: 'abc123'
        }
      }
    ],
    handler: async ({ fileKey }) => {
      logger.info(`Executing get-image-fills tool for file ${fileKey}`);
      
      try {
        const imageFillsData = await figmaAPI.getImageFills(fileKey);
        return {
          success: true,
          imageFills: imageFillsData
        };
      } catch (error) {
        logger.error(`Error in get-image-fills tool: ${error.message}`);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

module.exports = fileTools; 