from typing import Dict, List, Any, Optional

from mcp.server import Server
from mcp.types import Tool, TextContent

from ..models.document import (
    Document,
    DocumentGenerationRequest,
    DocumentRetrievalRequest,
    DocumentUpdateRequest,
    DocumentSummaryRequest,
    DocumentType,
)
from ..services.document_service import DocumentService
from ..services.template_service import TemplateService
from ..services.generator_service import GeneratorService


def register_document_handlers(
    server: Server,
    document_service: DocumentService,
    template_service: TemplateService,
    generator_service: GeneratorService,
) -> None:
    """Register document-related handlers with the MCP server"""

    @server.list_tools()
    async def list_tools() -> List[Tool]:
        """List available document tools"""
        return [
            Tool(
                name="document.generate",
                description="Generate a new document based on provided input data and template",
                inputSchema={
                    "type": "object",
                    "required": ["type", "title", "projectId", "inputData", "createdBy"],
                    "properties": {
                        "type": {
                            "type": "string",
                            "description": "Type of document to generate (BRD, PRD, TechnicalSpec, etc.)",
                        },
                        "title": {
                            "type": "string",
                            "description": "Title of the document",
                        },
                        "projectId": {
                            "type": "string",
                            "description": "ID of the project this document belongs to",
                        },
                        "templateId": {
                            "type": "string",
                            "description": "Optional ID of specific template to use. If not provided, default template for type will be used",
                        },
                        "inputData": {
                            "type": "object",
                            "description": "Input data to use for document generation",
                        },
                        "createdBy": {
                            "type": "string",
                            "description": "ID or name of agent/user creating the document",
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string",
                            },
                            "description": "Optional tags to categorize the document",
                        },
                    },
                },
            ),
            Tool(
                name="document.retrieve",
                description="Retrieve documents based on search criteria",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "Optional document ID for direct retrieval",
                        },
                        "projectId": {
                            "type": "string",
                            "description": "Optional project ID to filter documents",
                        },
                        "type": {
                            "type": "string",
                            "description": "Optional document type to filter",
                        },
                        "version": {
                            "type": "string",
                            "description": "Optional version string to retrieve specific version",
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string",
                            },
                            "description": "Optional tags to filter documents",
                        },
                        "fullText": {
                            "type": "boolean",
                            "description": "Whether to include full document content or just metadata. Default is false.",
                        },
                        "limit": {
                            "type": "number",
                            "description": "Optional limit for number of results. Default is 10.",
                        },
                        "offset": {
                            "type": "number",
                            "description": "Optional offset for pagination. Default is 0.",
                        },
                    },
                },
            ),
            Tool(
                name="document.update",
                description="Update an existing document",
                inputSchema={
                    "type": "object",
                    "required": ["id", "updatedBy"],
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "ID of the document to update",
                        },
                        "content": {
                            "type": "string",
                            "description": "Optional new content for the document",
                        },
                        "title": {
                            "type": "string",
                            "description": "Optional new title for the document",
                        },
                        "description": {
                            "type": "string",
                            "description": "Optional new description for the document",
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string",
                            },
                            "description": "Optional new tags for the document",
                        },
                        "updatedBy": {
                            "type": "string",
                            "description": "ID or name of agent/user updating the document",
                        },
                    },
                },
            ),
            Tool(
                name="document.getVersions",
                description="Get version history for a document",
                inputSchema={
                    "type": "object",
                    "required": ["documentId"],
                    "properties": {
                        "documentId": {
                            "type": "string",
                            "description": "ID of the document to get version history for",
                        },
                    },
                },
            ),
            Tool(
                name="document.summarize",
                description="Generate a summary of a document",
                inputSchema={
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "ID of the document to summarize",
                        },
                        "maxLength": {
                            "type": "number",
                            "description": "Optional maximum length of the summary in characters",
                        },
                        "focusAreas": {
                            "type": "array",
                            "items": {
                                "type": "string",
                            },
                            "description": "Optional areas to focus on in the summary",
                        },
                    },
                },
            ),
            Tool(
                name="document.delete",
                description="Delete a document",
                inputSchema={
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {
                            "type": "string",
                            "description": "ID of the document to delete",
                        },
                    },
                },
            ),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle tool calls for document operations"""
        try:
            if name == "document.generate":
                # Handle document generation
                request = DocumentGenerationRequest(
                    type=DocumentType(arguments["type"]),
                    title=arguments["title"],
                    project_id=arguments["projectId"],
                    template_id=arguments.get("templateId"),
                    input_data=arguments["inputData"],
                    created_by=arguments["createdBy"],
                    tags=arguments.get("tags"),
                )
                
                document_id = await generator_service.generate_document(request)
                
                result = {
                    "success": True,
                    "documentId": document_id,
                    "message": f"Document generated successfully with ID: {document_id}",
                }
                
                return [TextContent(type="text", text=str(result))]
                
            elif name == "document.retrieve":
                # Handle document retrieval
                request = DocumentRetrievalRequest(
                    id=arguments.get("id"),
                    project_id=arguments.get("projectId"),
                    type=DocumentType(arguments["type"]) if arguments.get("type") else None,
                    version=arguments.get("version"),
                    tags=arguments.get("tags"),
                    full_text=arguments.get("fullText", False),
                    limit=arguments.get("limit", 10),
                    offset=arguments.get("offset", 0),
                )
                
                # If an ID is provided, get that specific document
                if request.id:
                    document = await document_service.get_document(
                        request.id, request.full_text
                    )
                    
                    if not document:
                        return [
                            TextContent(
                                type="text",
                                text=str(
                                    {
                                        "success": False,
                                        "error": f"Document not found with ID: {request.id}",
                                    }
                                ),
                            )
                        ]
                    
                    result = {"success": True, "documents": [document.dict()]}
                    
                else:
                    # Otherwise search for documents
                    documents = await document_service.search_documents(request)
                    
                    result = {
                        "success": True,
                        "count": len(documents),
                        "documents": [doc.dict() for doc in documents],
                    }
                
                return [TextContent(type="text", text=str(result))]
                
            elif name == "document.update":
                # Handle document update
                request = DocumentUpdateRequest(
                    id=arguments["id"],
                    content=arguments.get("content"),
                    title=arguments.get("title"),
                    description=arguments.get("description"),
                    tags=arguments.get("tags"),
                    updated_by=arguments["updatedBy"],
                )
                
                document = await document_service.update_document(request)
                
                if not document:
                    return [
                        TextContent(
                            type="text",
                            text=str(
                                {
                                    "success": False,
                                    "error": f"Document not found with ID: {request.id}",
                                }
                            ),
                        )
                    ]
                
                result = {
                    "success": True,
                    "document": {
                        "id": document.id,
                        "version": document.version,
                        "updatedAt": document.updated_at.isoformat(),
                    },
                    "message": f"Document updated successfully. New version: {document.version}",
                }
                
                return [TextContent(type="text", text=str(result))]
                
            elif name == "document.getVersions":
                # Handle version history retrieval
                versions = await document_service.get_document_versions(
                    arguments["documentId"]
                )
                
                result = {
                    "success": True,
                    "versions": [
                        {
                            "version": v.version,
                            "createdBy": v.created_by,
                            "createdAt": v.created_at.isoformat(),
                            "changes": v.changes,
                        }
                        for v in versions
                    ],
                }
                
                return [TextContent(type="text", text=str(result))]
                
            elif name == "document.summarize":
                # Handle document summarization
                summary = await generator_service.generate_summary(
                    arguments["id"], arguments.get("maxLength", 500)
                )
                
                result = {"success": True, "summary": summary}
                
                return [TextContent(type="text", text=str(result))]
                
            elif name == "document.delete":
                # Handle document deletion
                success = await document_service.delete_document(arguments["id"])
                
                if not success:
                    return [
                        TextContent(
                            type="text",
                            text=str(
                                {
                                    "success": False,
                                    "error": f"Document not found with ID: {arguments['id']}",
                                }
                            ),
                        )
                    ]
                
                result = {
                    "success": True,
                    "message": f"Document deleted successfully: {arguments['id']}",
                }
                
                return [TextContent(type="text", text=str(result))]
            
            else:
                return [
                    TextContent(
                        type="text", 
                        text=str({"error": f"Unknown tool: {name}"})
                    )
                ]
                
        except Exception as e:
            print(f"Error handling tool call {name}: {str(e)}")
            return [
                TextContent(
                    type="text",
                    text=str({"success": False, "error": str(e)}),
                )
            ] 