from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union, Any

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Enumeration of document types"""
    BRD = "BRD"  # Business Requirements Document
    PRD = "PRD"  # Product Requirements Document
    TECHNICAL_SPEC = "TechnicalSpec"  # Technical Specification
    DESIGN_DOC = "DesignDoc"  # Design Documentation
    USER_GUIDE = "UserGuide"  # User Guide
    API_DOC = "APIDoc"  # API Documentation
    SYSTEM_DOC = "SystemDoc"  # System Documentation
    DEPLOYMENT_DOC = "DeploymentDoc"  # Deployment Documentation
    TEST_PLAN = "TestPlan"  # Test Plan
    CUSTOM = "Custom"  # Custom Documentation Type


class TemplateSection(BaseModel):
    """Section within a document template"""
    title: str = Field(..., description="Section title")
    description: str = Field(..., description="Section description")
    required: bool = Field(..., description="Whether section is required")
    subsections: Optional[List["TemplateSection"]] = Field(
        default=None, description="Subsections within this section"
    )


class DocumentTemplate(BaseModel):
    """Template for document generation"""
    type: DocumentType = Field(..., description="Document type")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    sections: List[TemplateSection] = Field(..., description="Sections in the template")


class DocumentMetadata(BaseModel):
    """Metadata for a document"""
    id: str = Field(..., description="Unique document ID")
    type: DocumentType = Field(..., description="Document type")
    title: str = Field(..., description="Document title")
    description: str = Field(default="", description="Document description")
    project_id: str = Field(..., description="Project ID this document belongs to")
    version: str = Field(..., description="Document version")
    created_by: str = Field(..., description="Creator's ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_by: str = Field(..., description="ID of last updater")
    updated_at: datetime = Field(..., description="Last update timestamp")
    tags: List[str] = Field(default_factory=list, description="Document tags")


class Document(DocumentMetadata):
    """Full document with content"""
    content: str = Field(..., description="Document content (Markdown or JSON)")


class DocumentVersionInfo(BaseModel):
    """Information about a specific version of a document"""
    id: str = Field(..., description="Version ID")
    document_id: str = Field(..., description="Document ID")
    version: str = Field(..., description="Version string")
    changes: str = Field(..., description="Description of changes")
    created_by: str = Field(..., description="Creator's ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    content: str = Field(..., description="Version content")


class DocumentGenerationRequest(BaseModel):
    """Request for document generation"""
    type: DocumentType = Field(..., description="Document type to generate")
    title: str = Field(..., description="Document title")
    project_id: str = Field(..., description="Project ID")
    template_id: Optional[str] = Field(None, description="Template ID to use (optional)")
    input_data: Dict[str, Any] = Field(..., description="Input data for document generation")
    created_by: str = Field(..., description="Creator's ID")
    tags: Optional[List[str]] = Field(None, description="Document tags")


class DocumentRetrievalRequest(BaseModel):
    """Request for document retrieval"""
    id: Optional[str] = Field(None, description="Document ID")
    project_id: Optional[str] = Field(None, description="Project ID")
    type: Optional[DocumentType] = Field(None, description="Document type")
    version: Optional[str] = Field(None, description="Version string")
    tags: Optional[List[str]] = Field(None, description="Tags to filter by")
    full_text: Optional[bool] = Field(False, description="Whether to include full content")
    limit: Optional[int] = Field(10, description="Maximum number of results")
    offset: Optional[int] = Field(0, description="Results offset for pagination")


class DocumentUpdateRequest(BaseModel):
    """Request for document update"""
    id: str = Field(..., description="Document ID")
    content: Optional[str] = Field(None, description="New document content")
    title: Optional[str] = Field(None, description="New document title")
    description: Optional[str] = Field(None, description="New document description")
    tags: Optional[List[str]] = Field(None, description="New document tags")
    updated_by: str = Field(..., description="Updater's ID")


class DocumentSummaryRequest(BaseModel):
    """Request for document summarization"""
    id: str = Field(..., description="Document ID")
    max_length: Optional[int] = Field(500, description="Maximum summary length")
    focus_areas: Optional[List[str]] = Field(None, description="Areas to focus on in summary") 