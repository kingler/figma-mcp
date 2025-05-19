#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DocumentService } from './services/documentService.js';
import { TemplateService } from './services/templateService.js';
import { GeneratorService } from './services/generatorService.js';
import { registerDocumentHandlers } from './handlers/documentHandlers.js';
import { registerTemplateHandlers } from './handlers/templateHandlers.js';

// Initialize services
const documentService = new DocumentService();
const templateService = new TemplateService();
const generatorService = new GeneratorService(templateService, documentService);

// Create server
const server = new Server({
  name: 'documentation-manager-server',
  version: '1.0.0',
});

// Register handlers
// @ts-ignore - MCP SDK types don't include registerTool yet
registerDocumentHandlers(server, documentService, templateService, generatorService);
// @ts-ignore - MCP SDK types don't include registerTool yet
registerTemplateHandlers(server, templateService);

// Connect to transport
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log('Documentation Manager Server is running');
});