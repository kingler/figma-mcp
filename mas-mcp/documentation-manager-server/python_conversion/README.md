# Documentation Manager Server (Python)

A Model Context Protocol (MCP) server for managing and generating documentation for software development lifecycles, implemented in Python with Pydantic Agents.

## Features

- **Document Generation**: Create different types of documentation (BRD, PRD, technical specs, etc.) from templates
- **Document Storage**: Store documents with metadata in Supabase/PostgreSQL database
- **Document Retrieval**: Search and retrieve documents based on various criteria
- **Version Control**: Track document versions and history
- **Document Editing**: Update and maintain documents throughout the development lifecycle
- **Agent Architecture**: Hierarchical agent design with specialized sub-agents

## Agent Architecture

The system uses a hierarchical agent architecture:

### Documentation Manager (Lead Agent)
- Coordinates sub-agents
- Manages document lifecycle
- Ensures overall documentation quality

### Sub-Agents
- **Technical Writer**: Creates and maintains technical documentation
- **Knowledge Base Manager**: Organizes documentation in knowledge bases
- **Documentation Automation Engineer**: Automates documentation processes
- **Content Quality Analyst**: Validates documentation quality
- **Version Control Specialist**: Manages document versions
- **Documentation DevOps**: Handles documentation infrastructure

## Available Tools

### Document Tools
- `document.generate`: Generate new documents from templates
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

## Installation

```bash
# Install with uv (recommended)
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .

# Or install with pip
pip install -e .
```

## Usage

```bash
# Run the server
python -m documentation_manager

# With custom configuration
python -m documentation_manager --config path/to/config.json
```

## Development

```bash
# Install development dependencies
uv pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .
isort .
```

## LLM Support

The system supports multiple LLM providers:
- Anthropic Claude (default)
- OpenAI 

Configure your preferred LLM in the configuration file.

## Database

Uses Supabase/PostgreSQL for document storage. Configure your database connection in the configuration file.

## Architecture

The server uses a layered architecture:
1. **MCP Tool Handlers**: Register tools with the MCP server
2. **Agent System**: Hierarchical agent architecture for document management
3. **Services Layer**: Core services for document and template management
4. **Data Layer**: Database storage for documents and templates 