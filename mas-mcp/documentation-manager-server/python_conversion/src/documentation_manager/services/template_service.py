from typing import List, Optional

from ..database.database_service import DatabaseService
from ..models.document import DocumentTemplate, DocumentType, TemplateSection


class TemplateService:
    """Service for template management operations"""

    def __init__(self, db_service: DatabaseService):
        self.db = db_service

    async def initialize_default_templates(self) -> None:
        """Initialize default templates"""
        # Create default BRD template
        brd_template = DocumentTemplate(
            type=DocumentType.BRD,
            name="standard-brd",
            description="Standard Business Requirements Document Template",
            sections=[
                TemplateSection(
                    title="Introduction",
                    description="Introduction to the business requirements",
                    required=True,
                    subsections=[
                        TemplateSection(
                            title="Purpose",
                            description="Purpose of this document",
                            required=True,
                        ),
                        TemplateSection(
                            title="Scope",
                            description="Scope of the requirements",
                            required=True,
                        ),
                        TemplateSection(
                            title="Definitions",
                            description="Key terms and definitions",
                            required=False,
                        ),
                    ],
                ),
                TemplateSection(
                    title="Business Overview",
                    description="Overview of the business context",
                    required=True,
                    subsections=[
                        TemplateSection(
                            title="Business Objectives",
                            description="Key business objectives",
                            required=True,
                        ),
                        TemplateSection(
                            title="Success Metrics",
                            description="How success will be measured",
                            required=True,
                        ),
                    ],
                ),
                TemplateSection(
                    title="Requirements",
                    description="Detailed business requirements",
                    required=True,
                    subsections=[
                        TemplateSection(
                            title="Functional Requirements",
                            description="Business functional requirements",
                            required=True,
                        ),
                        TemplateSection(
                            title="Non-Functional Requirements",
                            description="Business non-functional requirements",
                            required=False,
                        ),
                    ],
                ),
                TemplateSection(
                    title="Stakeholders",
                    description="Key stakeholders",
                    required=True,
                ),
                TemplateSection(
                    title="Constraints",
                    description="Business constraints",
                    required=False,
                ),
                TemplateSection(
                    title="Assumptions",
                    description="Business assumptions",
                    required=False,
                ),
            ],
        )

        # Create default PRD template
        prd_template = DocumentTemplate(
            type=DocumentType.PRD,
            name="standard-prd",
            description="Standard Product Requirements Document Template",
            sections=[
                TemplateSection(
                    title="Introduction",
                    description="Introduction to the product",
                    required=True,
                    subsections=[
                        TemplateSection(
                            title="Purpose",
                            description="Purpose of this document",
                            required=True,
                        ),
                        TemplateSection(
                            title="Product Overview",
                            description="Overview of the product",
                            required=True,
                        ),
                    ],
                ),
                TemplateSection(
                    title="Target Audience",
                    description="Description of target users",
                    required=True,
                ),
                TemplateSection(
                    title="User Stories",
                    description="Key user stories",
                    required=True,
                ),
                TemplateSection(
                    title="Feature Requirements",
                    description="Detailed feature requirements",
                    required=True,
                    subsections=[
                        TemplateSection(
                            title="Must-Have Features",
                            description="Essential features",
                            required=True,
                        ),
                        TemplateSection(
                            title="Nice-to-Have Features",
                            description="Optional features",
                            required=False,
                        ),
                    ],
                ),
                TemplateSection(
                    title="Non-Functional Requirements",
                    description="Performance, security, usability requirements",
                    required=True,
                ),
                TemplateSection(
                    title="User Interface",
                    description="UI requirements and mockups",
                    required=False,
                ),
                TemplateSection(
                    title="Release Criteria",
                    description="Criteria for release",
                    required=True,
                ),
                TemplateSection(
                    title="Future Considerations",
                    description="Future roadmap items",
                    required=False,
                ),
            ],
        )

        # Save default templates
        await self.db.save_template(brd_template)
        await self.db.save_template(prd_template)

    async def get_template(self, template_id: str) -> Optional[DocumentTemplate]:
        """Get a template by ID"""
        return await self.db.get_template(template_id)

    async def get_templates_by_type(self, doc_type: DocumentType) -> List[DocumentTemplate]:
        """Get templates for a specific document type"""
        return await self.db.get_templates_by_type(doc_type)

    async def create_template(self, template: DocumentTemplate) -> DocumentTemplate:
        """Create a new template"""
        return await self.db.save_template(template)

    async def update_template(self, template: DocumentTemplate) -> DocumentTemplate:
        """Update an existing template"""
        return await self.db.save_template(template)

    async def get_all_templates(self) -> List[DocumentTemplate]:
        """Get all templates"""
        return await self.db.get_all_templates() 