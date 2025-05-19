import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

from ..database.database_service import DatabaseService
from ..models.document import (
    Document,
    DocumentMetadata,
    DocumentGenerationRequest,
    DocumentRetrievalRequest,
    DocumentUpdateRequest,
    DocumentVersionInfo,
)


class DocumentService:
    """Service for document management operations"""

    def __init__(self, db_service: DatabaseService):
        self.db = db_service

    async def create_document(
        self, request: DocumentGenerationRequest, content: str
    ) -> Document:
        """Create a new document based on generation request"""
        now = datetime.utcnow()
        document = Document(
            id=str(uuid.uuid4()),
            type=request.type,
            title=request.title,
            description="",
            project_id=request.project_id,
            version="1.0.0",
            created_by=request.created_by,
            created_at=now,
            updated_by=request.created_by,
            updated_at=now,
            tags=request.tags or [],
            content=content,
        )

        await self.db.create_document(document)

        # Add initial version
        version_info = DocumentVersionInfo(
            id=str(uuid.uuid4()),
            document_id=document.id,
            version=document.version,
            changes="Initial creation",
            created_by=request.created_by,
            created_at=now,
            content=content,
        )

        await self.db.add_version(version_info)

        return document

    async def get_document(
        self, document_id: str, include_content: bool = True
    ) -> Optional[Document]:
        """Get a document by ID"""
        document = await self.db.get_document(document_id)
        if not document:
            return None

        if not include_content:
            # Create a copy without content
            return Document(
                id=document.id,
                type=document.type,
                title=document.title,
                description=document.description,
                project_id=document.project_id,
                version=document.version,
                created_by=document.created_by,
                created_at=document.created_at,
                updated_by=document.updated_by,
                updated_at=document.updated_at,
                tags=document.tags,
                content="",  # Empty content
            )

        return document

    async def update_document(self, request: DocumentUpdateRequest) -> Optional[Document]:
        """Update an existing document"""
        document = await self.db.get_document(request.id)
        if not document:
            return None

        now = datetime.utcnow()
        
        # Apply updates
        if request.title is not None:
            document.title = request.title
        if request.description is not None:
            document.description = request.description
        if request.tags is not None:
            document.tags = request.tags
        
        document.updated_by = request.updated_by
        document.updated_at = now

        # Update content and increment version if content changed
        content_changed = False
        if request.content is not None and request.content != document.content:
            document.content = request.content
            content_changed = True

            # Increment version
            version_parts = document.version.split(".")
            minor = int(version_parts[1]) + 1
            document.version = f"{version_parts[0]}.{minor}.0"

            # Add version
            version_info = DocumentVersionInfo(
                id=str(uuid.uuid4()),
                document_id=document.id,
                version=document.version,
                changes="Content updated",
                created_by=request.updated_by,
                created_at=now,
                content=document.content,
            )

            await self.db.add_version(version_info)

        return await self.db.update_document(document)

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document"""
        return await self.db.delete_document(document_id)

    async def search_documents(
        self, query: DocumentRetrievalRequest
    ) -> List[Union[Document, DocumentMetadata]]:
        """Search for documents based on criteria"""
        return await self.db.search_documents(query)

    async def get_document_versions(self, document_id: str) -> List[DocumentVersionInfo]:
        """Get all versions of a document"""
        return await self.db.get_versions(document_id)

    async def get_document_version(
        self, document_id: str, version: str
    ) -> Optional[Document]:
        """Get a specific version of a document"""
        document = await self.db.get_document(document_id)
        if not document:
            return None

        versions = await self.db.get_versions(document_id)
        version_info = next((v for v in versions if v.version == version), None)
        if not version_info:
            return None

        # Create a document with the version data
        return Document(
            id=document.id,
            type=document.type,
            title=document.title,
            description=document.description,
            project_id=document.project_id,
            version=version_info.version,
            created_by=document.created_by,
            created_at=document.created_at,
            updated_by=version_info.created_by,
            updated_at=version_info.created_at,
            tags=document.tags,
            content=version_info.content,
        ) 