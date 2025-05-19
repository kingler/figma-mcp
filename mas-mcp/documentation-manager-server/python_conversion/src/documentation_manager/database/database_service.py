import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from pydantic import ValidationError

from ..models.document import (
    Document,
    DocumentMetadata,
    DocumentTemplate,
    DocumentType,
    DocumentVersionInfo,
    DocumentRetrievalRequest,
)


class DatabaseService:
    """Base class for database services"""

    async def initialize(self) -> None:
        """Initialize the database connection"""
        pass

    async def close(self) -> None:
        """Close the database connection"""
        pass

    # Document operations
    async def create_document(self, document: Document) -> Document:
        """Create a new document"""
        raise NotImplementedError()

    async def get_document(self, document_id: str) -> Optional[Document]:
        """Get a document by ID"""
        raise NotImplementedError()

    async def update_document(self, document: Document) -> Document:
        """Update an existing document"""
        raise NotImplementedError()

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document"""
        raise NotImplementedError()

    async def search_documents(
        self, query: DocumentRetrievalRequest
    ) -> List[Union[Document, DocumentMetadata]]:
        """Search for documents based on criteria"""
        raise NotImplementedError()

    # Version operations
    async def add_version(self, version: DocumentVersionInfo) -> None:
        """Add a new document version"""
        raise NotImplementedError()

    async def get_versions(self, document_id: str) -> List[DocumentVersionInfo]:
        """Get all versions of a document"""
        raise NotImplementedError()

    # Template operations
    async def get_template(self, template_id: str) -> Optional[DocumentTemplate]:
        """Get a template by ID"""
        raise NotImplementedError()

    async def save_template(self, template: DocumentTemplate) -> DocumentTemplate:
        """Save a template"""
        raise NotImplementedError()

    async def get_all_templates(self) -> List[DocumentTemplate]:
        """Get all templates"""
        raise NotImplementedError()

    async def get_templates_by_type(self, doc_type: DocumentType) -> List[DocumentTemplate]:
        """Get templates for a specific document type"""
        raise NotImplementedError()


class InMemoryDatabaseService(DatabaseService):
    """In-memory implementation of database service"""

    def __init__(self):
        self.documents: Dict[str, Document] = {}
        self.versions: Dict[str, List[DocumentVersionInfo]] = {}
        self.templates: Dict[str, DocumentTemplate] = {}

    async def create_document(self, document: Document) -> Document:
        """Create a new document in memory"""
        if not document.id:
            document.id = str(uuid.uuid4())
        self.documents[document.id] = document
        if document.id not in self.versions:
            self.versions[document.id] = []
        return document

    async def get_document(self, document_id: str) -> Optional[Document]:
        """Get a document by ID from memory"""
        return self.documents.get(document_id)

    async def update_document(self, document: Document) -> Document:
        """Update a document in memory"""
        self.documents[document.id] = document
        return document

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document from memory"""
        if document_id in self.documents:
            del self.documents[document_id]
            if document_id in self.versions:
                del self.versions[document_id]
            return True
        return False

    async def search_documents(
        self, query: DocumentRetrievalRequest
    ) -> List[Union[Document, DocumentMetadata]]:
        """Search for documents in memory"""
        results = []
        for doc in self.documents.values():
            if self._matches_query(doc, query):
                if query.full_text:
                    results.append(doc)
                else:
                    # Return metadata only
                    metadata = DocumentMetadata(
                        id=doc.id,
                        type=doc.type,
                        title=doc.title,
                        description=doc.description,
                        project_id=doc.project_id,
                        version=doc.version,
                        created_by=doc.created_by,
                        created_at=doc.created_at,
                        updated_by=doc.updated_by,
                        updated_at=doc.updated_at,
                        tags=doc.tags,
                    )
                    results.append(metadata)

        # Apply pagination
        return results[query.offset : query.offset + query.limit]

    def _matches_query(self, doc: Document, query: DocumentRetrievalRequest) -> bool:
        """Check if document matches query criteria"""
        if query.id and doc.id != query.id:
            return False
        if query.project_id and doc.project_id != query.project_id:
            return False
        if query.type and doc.type != query.type:
            return False
        if query.version and doc.version != query.version:
            return False
        if query.tags and not set(query.tags).issubset(set(doc.tags)):
            return False
        return True

    async def add_version(self, version: DocumentVersionInfo) -> None:
        """Add a version to memory"""
        if version.document_id not in self.versions:
            self.versions[version.document_id] = []
        self.versions[version.document_id].append(version)

    async def get_versions(self, document_id: str) -> List[DocumentVersionInfo]:
        """Get versions from memory"""
        return self.versions.get(document_id, [])

    async def get_template(self, template_id: str) -> Optional[DocumentTemplate]:
        """Get a template by ID from memory"""
        return self.templates.get(template_id)

    async def save_template(self, template: DocumentTemplate) -> DocumentTemplate:
        """Save a template to memory"""
        self.templates[template.name] = template
        return template

    async def get_all_templates(self) -> List[DocumentTemplate]:
        """Get all templates from memory"""
        return list(self.templates.values())

    async def get_templates_by_type(self, doc_type: DocumentType) -> List[DocumentTemplate]:
        """Get templates for a specific document type from memory"""
        return [t for t in self.templates.values() if t.type == doc_type]


# Will be implemented when needed
class SupabaseDatabaseService(DatabaseService):
    """Supabase implementation of database service"""
    
    def __init__(self, database_url: str, api_key: str):
        self.database_url = database_url
        self.api_key = api_key
        self.client = None

    async def initialize(self) -> None:
        """Initialize the Supabase connection"""
        # Import here to avoid dependency requirement when using in-memory DB
        try:
            from supabase import create_client, Client
            self.client = create_client(self.database_url, self.api_key)
        except ImportError:
            raise ImportError("Supabase dependency not installed. Install with 'pip install supabase'")
        except Exception as e:
            raise Exception(f"Failed to initialize Supabase client: {str(e)}")
            
    # Implementation of database operations with Supabase would go here 