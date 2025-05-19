import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TemplateService } from '../services/templateService.js';
import { DocumentTemplate, DocumentType } from '../types.js';

export function registerTemplateHandlers(server: Server, templateService: TemplateService) {
  // Get All Templates
  server.registerTool({
    name: 'template.getAll',
    description: 'Get all available document templates',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      try {
        const templates = await templateService.getAllTemplates();
        
        return {
          success: true,
          templates: templates.map(t => ({
            name: t.name,
            type: t.type,
            description: t.description,
          })),
        };
      } catch (error) {
        console.error('Error getting all templates:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Get Templates by Type
  server.registerTool({
    name: 'template.getByType',
    description: 'Get templates for a specific document type',
    parameters: {
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          description: 'Document type to get templates for',
        },
      },
    },
    handler: async (params) => {
      try {
        const templates = await templateService.getTemplatesByType(params.type as DocumentType);
        
        if (templates.length === 0) {
          return {
            success: true,
            templates: [],
            message: `No templates found for type: ${params.type}`,
          };
        }
        
        return {
          success: true,
          templates: templates.map(t => ({
            name: t.name,
            type: t.type,
            description: t.description,
          })),
        };
      } catch (error) {
        console.error(`Error getting templates for type ${params.type}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Get Template Detail
  server.registerTool({
    name: 'template.getDetail',
    description: 'Get detailed information about a specific template',
    parameters: {
      type: 'object',
      required: ['templateId'],
      properties: {
        templateId: {
          type: 'string',
          description: 'ID of the template to get details for',
        },
      },
    },
    handler: async (params) => {
      try {
        const template = await templateService.getTemplate(params.templateId);
        
        if (!template) {
          return {
            success: false,
            error: `Template not found with ID: ${params.templateId}`,
          };
        }
        
        return {
          success: true,
          template,
        };
      } catch (error) {
        console.error(`Error getting template details for ${params.templateId}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Create New Template
  server.registerTool({
    name: 'template.create',
    description: 'Create a new document template',
    parameters: {
      type: 'object',
      required: ['template'],
      properties: {
        template: {
          type: 'object',
          description: 'Template definition',
          properties: {
            type: {
              type: 'string',
              description: 'Document type for this template',
            },
            name: {
              type: 'string',
              description: 'Unique name for this template',
            },
            description: {
              type: 'string',
              description: 'Description of this template',
            },
            sections: {
              type: 'array',
              description: 'Template sections',
              items: {
                type: 'object',
              },
            },
          },
          required: ['type', 'name', 'description', 'sections'],
        },
      },
    },
    handler: async (params) => {
      try {
        const template = params.template as DocumentTemplate;
        const savedTemplate = await templateService.createTemplate(template);
        
        return {
          success: true,
          template: {
            name: savedTemplate.name,
            type: savedTemplate.type,
            description: savedTemplate.description,
          },
          message: `Template created successfully: ${savedTemplate.name}`,
        };
      } catch (error) {
        console.error('Error creating template:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Update Template
  server.registerTool({
    name: 'template.update',
    description: 'Update an existing document template',
    parameters: {
      type: 'object',
      required: ['template'],
      properties: {
        template: {
          type: 'object',
          description: 'Updated template definition',
          properties: {
            type: {
              type: 'string',
              description: 'Document type for this template',
            },
            name: {
              type: 'string',
              description: 'Unique name for this template',
            },
            description: {
              type: 'string',
              description: 'Description of this template',
            },
            sections: {
              type: 'array',
              description: 'Template sections',
              items: {
                type: 'object',
              },
            },
          },
          required: ['type', 'name', 'description', 'sections'],
        },
      },
    },
    handler: async (params) => {
      try {
        const template = params.template as DocumentTemplate;
        const updatedTemplate = await templateService.updateTemplate(template);
        
        return {
          success: true,
          template: {
            name: updatedTemplate.name,
            type: updatedTemplate.type,
            description: updatedTemplate.description,
          },
          message: `Template updated successfully: ${updatedTemplate.name}`,
        };
      } catch (error) {
        console.error('Error updating template:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });
} 