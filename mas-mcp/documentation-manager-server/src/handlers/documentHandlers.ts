import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DocumentService } from '../services/documentService.js';
import { TemplateService } from '../services/templateService.js';
import { GeneratorService } from '../services/generatorService.js';
import { Document, DocumentGenerationRequest, DocumentRetrievalRequest, DocumentUpdateRequest, DocumentSummaryRequest } from '../types.js';

export function registerDocumentHandlers(
  server: Server, 
  documentService: DocumentService,
  templateService: TemplateService,
  generatorService: GeneratorService
) {
  // Document Generation Tool
  server.registerTool({
    name: 'document.generate',
    description: 'Generate a new document based on provided input data and template',
    parameters: {
      type: 'object',
      required: ['type', 'title', 'projectId', 'inputData', 'createdBy'],
      properties: {
        type: {
          type: 'string',
          description: 'Type of document to generate (BRD, PRD, TechnicalSpec, etc.)',
        },
        title: {
          type: 'string',
          description: 'Title of the document',
        },
        projectId: {
          type: 'string',
          description: 'ID of the project this document belongs to',
        },
        templateId: {
          type: 'string',
          description: 'Optional ID of specific template to use. If not provided, default template for type will be used',
        },
        inputData: {
          type: 'object',
          description: 'Input data to use for document generation',
        },
        createdBy: {
          type: 'string',
          description: 'ID or name of agent/user creating the document',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional tags to categorize the document',
        },
      },
    },
    handler: async (params) => {
      try {
        const request: DocumentGenerationRequest = {
          type: params.type,
          title: params.title,
          projectId: params.projectId,
          templateId: params.templateId,
          inputData: params.inputData,
          createdBy: params.createdBy,
          tags: params.tags,
        };
        
        const documentId = await generatorService.generateDocument(request);
        
        return {
          success: true,
          documentId,
          message: `Document generated successfully with ID: ${documentId}`,
        };
      } catch (error) {
        console.error('Error generating document:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Document Retrieval Tool
  server.registerTool({
    name: 'document.retrieve',
    description: 'Retrieve documents based on search criteria',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Optional document ID for direct retrieval',
        },
        projectId: {
          type: 'string',
          description: 'Optional project ID to filter documents',
        },
        type: {
          type: 'string',
          description: 'Optional document type to filter',
        },
        version: {
          type: 'string',
          description: 'Optional version string to retrieve specific version',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional tags to filter documents',
        },
        fullText: {
          type: 'boolean',
          description: 'Whether to include full document content or just metadata. Default is false.',
        },
        limit: {
          type: 'number',
          description: 'Optional limit for number of results. Default is 10.',
        },
        offset: {
          type: 'number',
          description: 'Optional offset for pagination. Default is 0.',
        },
      },
    },
    handler: async (params) => {
      try {
        const request: DocumentRetrievalRequest = {
          id: params.id,
          projectId: params.projectId,
          type: params.type,
          version: params.version,
          tags: params.tags,
          fullText: params.fullText ?? false,
          limit: params.limit ?? 10,
          offset: params.offset ?? 0,
        };
        
        // If an ID is provided, get that specific document
        if (request.id) {
          const document = await documentService.getDocument(request.id, request.fullText);
          
          if (!document) {
            return {
              success: false,
              error: `Document not found with ID: ${request.id}`,
            };
          }
          
          return {
            success: true,
            documents: [document],
          };
        }
        
        // Otherwise search for documents
        const documents = await documentService.searchDocuments(request);
        
        return {
          success: true,
          count: documents.length,
          documents,
        };
      } catch (error) {
        console.error('Error retrieving documents:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Document Update Tool
  server.registerTool({
    name: 'document.update',
    description: 'Update an existing document',
    parameters: {
      type: 'object',
      required: ['id', 'updatedBy'],
      properties: {
        id: {
          type: 'string',
          description: 'ID of the document to update',
        },
        content: {
          type: 'string',
          description: 'Optional new content for the document',
        },
        title: {
          type: 'string',
          description: 'Optional new title for the document',
        },
        description: {
          type: 'string',
          description: 'Optional new description for the document',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional new tags for the document',
        },
        updatedBy: {
          type: 'string',
          description: 'ID or name of agent/user updating the document',
        },
      },
    },
    handler: async (params) => {
      try {
        const request: DocumentUpdateRequest = {
          id: params.id,
          content: params.content,
          title: params.title,
          description: params.description,
          tags: params.tags,
          updatedBy: params.updatedBy,
        };
        
        const document = await documentService.updateDocument(request);
        
        if (!document) {
          return {
            success: false,
            error: `Document not found with ID: ${request.id}`,
          };
        }
        
        return {
          success: true,
          document: {
            id: document.id,
            version: document.version,
            updatedAt: document.updatedAt,
          },
          message: `Document updated successfully. New version: ${document.version}`,
        };
      } catch (error) {
        console.error('Error updating document:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Document Version History Tool
  server.registerTool({
    name: 'document.getVersions',
    description: 'Get version history for a document',
    parameters: {
      type: 'object',
      required: ['documentId'],
      properties: {
        documentId: {
          type: 'string',
          description: 'ID of the document to get version history for',
        },
      },
    },
    handler: async (params) => {
      try {
        const versions = await documentService.getDocumentVersions(params.documentId);
        
        return {
          success: true,
          versions: versions.map(v => ({
            version: v.version,
            createdBy: v.createdBy,
            createdAt: v.createdAt,
            changes: v.changes,
          })),
        };
      } catch (error) {
        console.error('Error getting document versions:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Document Summary Tool
  server.registerTool({
    name: 'document.summarize',
    description: 'Generate a summary of a document',
    parameters: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          description: 'ID of the document to summarize',
        },
        maxLength: {
          type: 'number',
          description: 'Optional maximum length of the summary in characters',
        },
        focusAreas: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional areas to focus on in the summary',
        },
      },
    },
    handler: async (params) => {
      try {
        const summary = await generatorService.generateSummary(
          params.id, 
          params.maxLength || 500
        );
        
        return {
          success: true,
          summary,
        };
      } catch (error) {
        console.error('Error summarizing document:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });

  // Document Delete Tool
  server.registerTool({
    name: 'document.delete',
    description: 'Delete a document',
    parameters: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          description: 'ID of the document to delete',
        },
      },
    },
    handler: async (params) => {
      try {
        const success = await documentService.deleteDocument(params.id);
        
        if (!success) {
          return {
            success: false,
            error: `Document not found with ID: ${params.id}`,
          };
        }
        
        return {
          success: true,
          message: `Document deleted successfully: ${params.id}`,
        };
      } catch (error) {
        console.error('Error deleting document:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
  });
} 