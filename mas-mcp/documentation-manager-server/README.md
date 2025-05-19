# Documentation Manager Server

A Model Context Protocol (MCP) server for managing and generating documentation for software development lifecycles. This server acts as a document management agent that generates, stores, retrieves, and maintains documentation.

## Features

- **Document Generation**: Create different types of documentation (BRD, PRD, technical specs, etc.) from templates
- **Document Storage**: Store documents with metadata in a database
- **Document Retrieval**: Search and retrieve documents based on various criteria
- **Version Control**: Track document versions and history
- **Document Editing**: Update and maintain documents throughout the development lifecycle

## Available Tools

### Document Tools

- `document.generate`: Generate a new document based on template and input data
- `document.retrieve`: Retrieve documents by ID or search criteria
- `document.update`: Update existing document content and metadata
- `document.getVersions`: Retrieve version history for a document
- `document.summarize`: Generate a summary of a document
- `document.delete`: Delete a document

### Template Tools

- `template.getAll`: Retrieve all available templates
- `template.getByType`: Get templates for a specific document type
- `template.getDetail`: Get detailed information about a template
- `template.create`: Create a new document template
- `template.update`: Update an existing template

## Document Types

- Business Requirements Document (BRD)
- Product Requirements Document (PRD)
- Technical Specification
- Design Documentation
- User Guide
- API Documentation
- System Documentation
- Deployment Documentation
- Test Plan

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

## Development

```bash
npm run dev
```

## Architecture

The server uses a layered architecture:

1. **MCP Tool Handlers**: Register tools with the MCP server
2. **Services**:
   - Document Service: Core document CRUD operations
   - Template Service: Manage document templates
   - Generator Service: Generate document content
3. **Database Layer**: Stores documents, templates, and version history

## Database

Currently using an in-memory implementation. In production, this would be replaced with a Supabase/PostgreSQL database connection.

## Future Improvements

- Connect to Supabase/PostgreSQL for persistent storage
- Implement advanced search capabilities
- Add AI-powered document generation
- Implement document diff and merge capabilities
- Add collaboration features 