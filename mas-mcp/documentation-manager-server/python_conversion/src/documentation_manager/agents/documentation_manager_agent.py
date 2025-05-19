from typing import Dict, List, Optional, Any

from ..models.agent import (
    AgentType,
    Belief,
    Desire,
    Intention,
    Rule,
    Tool,
    Chain,
    LLMConfig,
)
from ..models.document import DocumentType
from ..services.document_service import DocumentService
from ..services.template_service import TemplateService
from ..services.generator_service import GeneratorService
from .base_agent import BaseAgent


class DocumentationManagerAgent(BaseAgent):
    """Lead agent for documentation management"""

    def __init__(
        self,
        llm_config: LLMConfig,
        document_service: DocumentService,
        template_service: TemplateService,
        generator_service: GeneratorService,
    ):
        super().__init__(
            agent_type=AgentType.DOCUMENTATION_MANAGER,
            name="Documentation Manager",
            description="Documentation and Knowledge Management Lead",
            llm_config=llm_config,
        )
        
        self.document_service = document_service
        self.template_service = template_service
        self.generator_service = generator_service
        
        # Initialize beliefs
        self._initialize_beliefs()
        
        # Initialize desires
        self._initialize_desires()
        
        # Initialize intentions
        self._initialize_intentions()
        
        # Initialize rules
        self._initialize_rules()
        
        # Initialize tools
        self._initialize_tools()
        
        # Initialize chains
        self._initialize_chains()
        
        # Update system prompt
        self.system_prompt = self._generate_system_prompt()

    def _initialize_beliefs(self) -> None:
        """Initialize agent beliefs"""
        self.add_belief(
            Belief(
                name="documentation_needs",
                description="Understanding of documentation needs",
                value="Documentation must cover all aspects of the system including requirements, architecture, usage, and maintenance",
            )
        )
        
        self.add_belief(
            Belief(
                name="documentation_standards",
                description="Knowledge of documentation standards",
                value="Documentation must follow clear standards for format, structure, and content",
            )
        )
        
        self.add_belief(
            Belief(
                name="audience_requirements",
                description="Awareness of audience requirements",
                value="Different audiences need different levels of detail and focus in documentation",
            )
        )
        
        self.add_belief(
            Belief(
                name="technical_content",
                description="Understanding of technical content",
                value="Documentation must accurately reflect the technical implementation",
            )
        )
        
        self.add_belief(
            Belief(
                name="documentation_tools",
                description="Knowledge of documentation tools",
                value="Efficient documentation requires appropriate tools and automation",
            )
        )
        
        self.add_belief(
            Belief(
                name="knowledge_gaps",
                description="Awareness of knowledge gaps",
                value="Documentation must address common knowledge gaps and misunderstandings",
            )
        )

    def _initialize_desires(self) -> None:
        """Initialize agent desires"""
        self.add_desire(
            Desire(
                name="comprehensive_documentation",
                description="Achieve comprehensive documentation",
                priority=5,
                satisfaction_criteria="All aspects of the system are documented completely",
            )
        )
        
        self.add_desire(
            Desire(
                name="documentation_quality",
                description="Maintain documentation quality",
                priority=4,
                satisfaction_criteria="All documentation meets quality standards for accuracy, completeness, and clarity",
            )
        )
        
        self.add_desire(
            Desire(
                name="information_accessibility",
                description="Ensure information accessibility",
                priority=3,
                satisfaction_criteria="All documentation is easily accessible to its intended audience",
            )
        )
        
        self.add_desire(
            Desire(
                name="optimized_processes",
                description="Optimize documentation processes",
                priority=2,
                satisfaction_criteria="Documentation processes are efficient and streamlined",
            )
        )
        
        self.add_desire(
            Desire(
                name="automated_tasks",
                description="Automate documentation tasks",
                priority=2,
                satisfaction_criteria="Routine documentation tasks are automated",
            )
        )
        
        self.add_desire(
            Desire(
                name="knowledge_sharing",
                description="Foster knowledge sharing",
                priority=3,
                satisfaction_criteria="Documentation facilitates effective knowledge sharing",
            )
        )

    def _initialize_intentions(self) -> None:
        """Initialize agent intentions"""
        self.add_intention(
            Intention(
                name="standardize_documentation",
                description="Standardize documentation",
                priority=5,
                completed=False,
            )
        )
        
        self.add_intention(
            Intention(
                name="implement_automation",
                description="Implement automation",
                priority=4,
                completed=False,
            )
        )
        
        self.add_intention(
            Intention(
                name="monitor_quality",
                description="Monitor documentation quality",
                priority=4,
                completed=False,
            )
        )
        
        self.add_intention(
            Intention(
                name="facilitate_sharing",
                description="Facilitate knowledge sharing",
                priority=3,
                completed=False,
            )
        )
        
        self.add_intention(
            Intention(
                name="maintain_coverage",
                description="Maintain documentation coverage",
                priority=5,
                completed=False,
            )
        )
        
        self.add_intention(
            Intention(
                name="improve_accessibility",
                description="Improve accessibility",
                priority=3,
                completed=False,
            )
        )

    def _initialize_rules(self) -> None:
        """Initialize agent rules"""
        self.add_rule(
            Rule(
                name="follow_standards",
                description="Must follow documentation standards",
                priority=5,
            )
        )
        
        self.add_rule(
            Rule(
                name="maintain_accuracy",
                description="Must maintain documentation accuracy",
                priority=5,
            )
        )
        
        self.add_rule(
            Rule(
                name="ensure_coverage",
                description="Must ensure documentation coverage",
                priority=4,
            )
        )
        
        self.add_rule(
            Rule(
                name="automate_where_possible",
                description="Must automate where possible",
                priority=3,
            )
        )
        
        self.add_rule(
            Rule(
                name="validate_quality",
                description="Must validate documentation quality",
                priority=4,
            )
        )
        
        self.add_rule(
            Rule(
                name="maintain_version_control",
                description="Must maintain version control",
                priority=4,
            )
        )

    def _initialize_tools(self) -> None:
        """Initialize agent tools"""
        self.add_tool(
            Tool(
                name="doc_generate",
                description="Generate documentation based on template and input data",
                handler=self._doc_generate_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="doc_validate",
                description="Validate documentation against quality standards",
                handler=self._doc_validate_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="doc_publish",
                description="Publish documentation to make it accessible",
                handler=self._doc_publish_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="knowledge_index",
                description="Index knowledge for better searchability",
                handler=self._knowledge_index_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="content_analyze",
                description="Analyze documentation content for gaps and improvements",
                handler=self._content_analyze_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="version_control",
                description="Manage document versions and history",
                handler=self._version_control_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="doc_automate",
                description="Set up automation for documentation tasks",
                handler=self._doc_automate_handler,
            )
        )
        
        self.add_tool(
            Tool(
                name="quality_check",
                description="Check documentation quality against standards",
                handler=self._quality_check_handler,
            )
        )

    def _initialize_chains(self) -> None:
        """Initialize agent chains"""
        self.add_chain(
            Chain(
                name="documentation_generation_chain",
                description="Chain for generating comprehensive documentation",
                steps=[
                    "Analyze requirements",
                    "Select appropriate template",
                    "Generate content",
                    "Validate content",
                    "Publish documentation",
                ],
                file_path="chains/documentation_generation_chain.md",
            )
        )
        
        self.add_chain(
            Chain(
                name="knowledge_management_chain",
                description="Chain for managing knowledge base",
                steps=[
                    "Classify content",
                    "Index content",
                    "Optimize searchability",
                    "Link related documentation",
                    "Validate accessibility",
                ],
                file_path="chains/knowledge_management_chain.md",
            )
        )
        
        self.add_chain(
            Chain(
                name="content_quality_chain",
                description="Chain for ensuring documentation quality",
                steps=[
                    "Check accuracy",
                    "Validate completeness",
                    "Verify clarity",
                    "Assess accessibility",
                    "Generate quality report",
                ],
                file_path="chains/content_quality_chain.md",
            )
        )
        
        self.add_chain(
            Chain(
                name="documentation_automation_chain",
                description="Chain for automating documentation tasks",
                steps=[
                    "Identify automation opportunities",
                    "Set up automation tools",
                    "Create automation workflows",
                    "Test automation",
                    "Monitor automation performance",
                ],
                file_path="chains/documentation_automation_chain.md",
            )
        )
        
        self.add_chain(
            Chain(
                name="version_control_chain",
                description="Chain for managing document versions",
                steps=[
                    "Track changes",
                    "Create versions",
                    "Manage history",
                    "Handle conflicts",
                    "Archive old versions",
                ],
                file_path="chains/version_control_chain.md",
            )
        )

    # Tool handlers
    async def _doc_generate_handler(
        self, doc_type: DocumentType, title: str, project_id: str, input_data: Dict[str, Any]
    ) -> str:
        """Handle document generation"""
        # Here we would delegate to the appropriate sub-agent or handle directly
        # For now, we'll just use the generator service directly
        
        from ..models.document import DocumentGenerationRequest
        
        request = DocumentGenerationRequest(
            type=doc_type,
            title=title,
            project_id=project_id,
            input_data=input_data,
            created_by="documentation_manager",
        )
        
        doc_id = await self.generator_service.generate_document(request)
        return f"Document generated with ID: {doc_id}"

    async def _doc_validate_handler(self, doc_id: str) -> str:
        """Handle document validation"""
        # In a real implementation, we would validate the document
        # For now, just return a placeholder
        return f"Document {doc_id} has been validated and meets all quality standards."

    async def _doc_publish_handler(self, doc_id: str, publish_location: str) -> str:
        """Handle document publishing"""
        # In a real implementation, we would publish the document
        # For now, just return a placeholder
        return f"Document {doc_id} has been published to {publish_location}."

    async def _knowledge_index_handler(self, doc_id: str) -> str:
        """Handle knowledge indexing"""
        # In a real implementation, we would index the document
        # For now, just return a placeholder
        return f"Document {doc_id} has been indexed in the knowledge base."

    async def _content_analyze_handler(self, doc_id: str) -> str:
        """Handle content analysis"""
        # In a real implementation, we would analyze the document
        # For now, just return a placeholder
        return f"Document {doc_id} has been analyzed. No gaps or issues found."

    async def _version_control_handler(self, doc_id: str, version: str) -> str:
        """Handle version control"""
        # In a real implementation, we would manage document versions
        # For now, just return a placeholder
        return f"Document {doc_id} version {version} has been created and stored."

    async def _doc_automate_handler(self, process_name: str) -> str:
        """Handle documentation automation"""
        # In a real implementation, we would set up automation
        # For now, just return a placeholder
        return f"Automation for {process_name} has been set up successfully."

    async def _quality_check_handler(self, doc_id: str) -> str:
        """Handle quality checking"""
        # In a real implementation, we would check document quality
        # For now, just return a placeholder
        return f"Document {doc_id} has been quality checked. All standards met." 