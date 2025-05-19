from datetime import datetime
from typing import Dict, List, Optional, Any

from ..models.document import (
    Document,
    DocumentGenerationRequest,
    DocumentTemplate,
    TemplateSection,
)
from .document_service import DocumentService
from .template_service import TemplateService


class GeneratorService:
    """Service for document generation operations"""

    def __init__(self, template_service: TemplateService, document_service: DocumentService):
        self.template_service = template_service
        self.document_service = document_service

    async def generate_document(self, request: DocumentGenerationRequest) -> str:
        """Generate a document from a template and input data"""
        # Get template to use for generation
        template = None

        if request.template_id:
            template = await self.template_service.get_template(request.template_id)

        if not template:
            # Get default template for document type
            templates = await self.template_service.get_templates_by_type(request.type)
            if templates:
                template = templates[0]  # Use first available template
            else:
                raise ValueError(f"No template found for document type {request.type}")

        # Generate document content based on template and input data
        content = await self._generate_content_from_template(template, request.input_data)

        # Create document
        document = await self.document_service.create_document(request, content)

        return document.id

    async def _generate_content_from_template(
        self, template: DocumentTemplate, input_data: Dict[str, Any]
    ) -> str:
        """Generate document content based on template and input data"""
        # In a real implementation, this would use a language model to generate content
        # For now, we'll just create a simple markdown structure based on the template
        
        content = f"# {input_data.get('title', 'Untitled Document')}\n\n"

        # Add metadata
        content += "## Document Metadata\n\n"
        content += f"- Type: {template.type}\n"
        content += f"- Template: {template.name}\n"
        content += f"- Created: {datetime.utcnow().isoformat()}\n\n"

        # Process each section in the template
        for section in template.sections:
            content += self._generate_section(section, input_data, 2)

        return content

    def _generate_section(
        self, section: TemplateSection, input_data: Dict[str, Any], heading_level: int
    ) -> str:
        """Generate a section of content"""
        heading_marker = "#" * heading_level
        content = f"{heading_marker} {section.title}\n\n"

        # Check if we have specific content for this section in the input data
        section_key = section.title.lower().replace(" ", "_")

        if section_key in input_data:
            content += f"{input_data[section_key]}\n\n"
        else:
            # Add placeholder based on section description
            content += f"{section.description}\n\n"

        # Process subsections if any
        if section.subsections:
            for subsection in section.subsections:
                content += self._generate_section(subsection, input_data, heading_level + 1)

        return content

    async def generate_summary(self, document_id: str, max_length: int = 500) -> str:
        """Generate a summary of a document"""
        document = await self.document_service.get_document(document_id)
        if not document:
            raise ValueError(f"Document not found: {document_id}")

        # Simple summary implementation - just extract the first few characters
        # In a real implementation, this would use an LLM to generate a proper summary
        summary = document.content[:max_length]

        if len(document.content) > max_length:
            summary += "..."

        return summary 