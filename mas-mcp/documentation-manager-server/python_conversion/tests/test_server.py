import asyncio
import pytest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch

from documentation_manager.database.database_service import InMemoryDatabaseService
from documentation_manager.services.document_service import DocumentService
from documentation_manager.services.template_service import TemplateService
from documentation_manager.services.generator_service import GeneratorService
from documentation_manager.models.document import (
    DocumentType,
    DocumentGenerationRequest,
    DocumentRetrievalRequest,
    DocumentUpdateRequest,
)
from documentation_manager.models.agent import LLMConfig, LLMProvider
from documentation_manager.agents.documentation_manager_agent import DocumentationManagerAgent


@pytest.fixture
async def services():
    """Set up services for testing"""
    db_service = InMemoryDatabaseService()
    document_service = DocumentService(db_service)
    template_service = TemplateService(db_service)
    generator_service = GeneratorService(template_service, document_service)
    
    # Initialize default templates
    await template_service.initialize_default_templates()
    
    return db_service, document_service, template_service, generator_service


@pytest.fixture
async def lead_agent(services):
    """Set up lead agent for testing"""
    _, document_service, template_service, generator_service = services
    
    llm_config = LLMConfig(
        provider=LLMProvider.ANTHROPIC,
        model="claude-3-sonnet-20240229",
        max_tokens=4000,
        temperature=0.7,
    )
    
    # Create main agent with mocked LLM service
    agent = DocumentationManagerAgent(
        llm_config=llm_config,
        document_service=document_service,
        template_service=template_service,
        generator_service=generator_service,
    )
    
    # Mock the LLM service initialization and response
    agent.initialize = AsyncMock()
    agent.llm_service = MagicMock()
    agent.llm_service.generate_text = AsyncMock(return_value="Generated text response")
    
    return agent


@pytest.mark.asyncio
async def test_document_generation(services):
    """Test document generation flow"""
    _, document_service, template_service, generator_service = services
    
    # Create a document generation request
    request = DocumentGenerationRequest(
        type=DocumentType.BRD,
        title="Test Business Requirements Document",
        project_id="test-project",
        input_data={
            "title": "Test BRD",
            "introduction": "This is a test introduction.",
            "business_overview": "This is a test business overview.",
            "requirements": "These are test requirements.",
            "stakeholders": "These are test stakeholders."
        },
        created_by="test-user",
        tags=["test", "brd"]
    )
    
    # Generate document
    document_id = await generator_service.generate_document(request)
    
    # Retrieve document
    document = await document_service.get_document(document_id)
    
    # Verify document was created correctly
    assert document is not None
    assert document.title == "Test Business Requirements Document"
    assert document.type == DocumentType.BRD
    assert "test" in document.tags
    assert "brd" in document.tags
    assert document.project_id == "test-project"
    assert document.created_by == "test-user"
    assert document.version == "1.0.0"


@pytest.mark.asyncio
async def test_document_update(services):
    """Test document update flow"""
    _, document_service, template_service, generator_service = services
    
    # First create a document
    request = DocumentGenerationRequest(
        type=DocumentType.BRD,
        title="Original Title",
        project_id="test-project",
        input_data={"title": "Original Content"},
        created_by="test-user",
    )
    
    document_id = await generator_service.generate_document(request)
    
    # Update the document
    update_request = DocumentUpdateRequest(
        id=document_id,
        title="Updated Title",
        content="Updated content",
        updated_by="test-updater",
    )
    
    updated_document = await document_service.update_document(update_request)
    
    # Verify update was successful
    assert updated_document is not None
    assert updated_document.title == "Updated Title"
    assert updated_document.content == "Updated content"
    assert updated_document.updated_by == "test-updater"
    assert updated_document.version == "1.1.0"  # Version should be incremented
    
    # Get document versions
    versions = await document_service.get_document_versions(document_id)
    
    # Verify versions
    assert len(versions) == 2
    assert versions[0].version == "1.0.0"
    assert versions[1].version == "1.1.0"


@pytest.mark.asyncio
async def test_lead_agent_tools(lead_agent):
    """Test lead agent tool handlers"""
    # Test doc_generate handler
    result = await lead_agent._doc_generate_handler(
        doc_type=DocumentType.BRD,
        title="Test Document",
        project_id="test-project",
        input_data={"title": "Test Content"},
    )
    
    assert "Document generated with ID:" in result
    
    # Test doc_validate handler
    result = await lead_agent._doc_validate_handler(doc_id="test-id")
    assert "Document test-id has been validated" in result
    
    # Test doc_publish handler
    result = await lead_agent._doc_publish_handler(doc_id="test-id", publish_location="test-location")
    assert "Document test-id has been published to test-location" in result 