from enum import Enum
from typing import Dict, List, Optional, Set, Any, Callable

from pydantic import BaseModel, Field


class AgentType(str, Enum):
    """Types of agents in the documentation management system"""
    DOCUMENTATION_MANAGER = "documentation_manager"
    TECHNICAL_WRITER = "technical_writer"
    KNOWLEDGE_BASE_MANAGER = "knowledge_base_manager"
    AUTOMATION_ENGINEER = "automation_engineer"
    QUALITY_ANALYST = "quality_analyst"
    VERSION_CONTROL_SPECIALIST = "version_control_specialist"
    DOCUMENTATION_DEVOPS = "documentation_devops"


class Belief(BaseModel):
    """Represents an agent's belief about the world"""
    name: str = Field(..., description="Name of the belief")
    description: str = Field(..., description="Description of the belief")
    value: Any = Field(..., description="Value of the belief")
    confidence: float = Field(1.0, description="Confidence in this belief (0.0-1.0)")
    source: Optional[str] = Field(None, description="Source of this belief")


class Desire(BaseModel):
    """Represents an agent's desire or goal"""
    name: str = Field(..., description="Name of the desire")
    description: str = Field(..., description="Description of the desire")
    priority: int = Field(1, description="Priority of this desire (higher is more important)")
    satisfied: bool = Field(False, description="Whether this desire is currently satisfied")
    satisfaction_criteria: Optional[str] = Field(None, description="Criteria for satisfaction")


class Intention(BaseModel):
    """Represents an agent's intention or planned action"""
    name: str = Field(..., description="Name of the intention")
    description: str = Field(..., description="Description of the intention")
    priority: int = Field(1, description="Priority of this intention")
    completed: bool = Field(False, description="Whether this intention is completed")
    depends_on: Optional[List[str]] = Field(None, description="Intentions this depends on")


class Rule(BaseModel):
    """Represents a rule the agent must follow"""
    name: str = Field(..., description="Name of the rule")
    description: str = Field(..., description="Description of the rule")
    priority: int = Field(1, description="Priority of this rule")


class Tool(BaseModel):
    """Represents a tool available to the agent"""
    name: str = Field(..., description="Name of the tool")
    description: str = Field(..., description="Description of the tool")
    handler: Optional[Callable] = Field(None, description="Function that implements the tool")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Tool parameters")


class Chain(BaseModel):
    """Represents a chain of tools or operations"""
    name: str = Field(..., description="Name of the chain")
    description: str = Field(..., description="Description of the chain")
    steps: List[str] = Field(..., description="Steps in the chain")
    file_path: Optional[str] = Field(None, description="Path to chain definition file")


class AgentConfig(BaseModel):
    """Configuration for an agent"""
    type: AgentType = Field(..., description="Type of agent")
    name: str = Field(..., description="Agent name")
    description: str = Field(..., description="Agent description")
    beliefs: List[Belief] = Field(default_factory=list, description="Agent beliefs")
    desires: List[Desire] = Field(default_factory=list, description="Agent desires")
    intentions: List[Intention] = Field(default_factory=list, description="Agent intentions")
    rules: List[Rule] = Field(default_factory=list, description="Rules agent must follow")
    tools: List[Tool] = Field(default_factory=list, description="Tools available to the agent")
    chains: List[Chain] = Field(default_factory=list, description="Chains available to the agent")
    dependencies: Optional[List[AgentType]] = Field(None, description="Other agents this depends on")
    system_prompt: str = Field("", description="System prompt for the agent")


class AgentState(BaseModel):
    """Current state of an agent"""
    agent_type: AgentType = Field(..., description="Type of agent")
    current_beliefs: Dict[str, Belief] = Field(default_factory=dict, description="Current beliefs")
    current_desires: Dict[str, Desire] = Field(default_factory=dict, description="Current desires")
    current_intentions: Dict[str, Intention] = Field(default_factory=dict, description="Current intentions")
    working_memory: Dict[str, Any] = Field(default_factory=dict, description="Short-term memory")
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, description="Conversation history")


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


class LLMConfig(BaseModel):
    """Configuration for LLM"""
    provider: LLMProvider = Field(LLMProvider.ANTHROPIC, description="LLM provider")
    model: str = Field("claude-3-sonnet-20240229", description="Model to use")
    api_key: Optional[str] = Field(None, description="API key (can be set via environment variable)")
    max_tokens: int = Field(4000, description="Maximum number of tokens for responses")
    temperature: float = Field(0.7, description="Temperature for response generation")


class AgentSystemConfig(BaseModel):
    """System configuration for all agents"""
    llm_config: LLMConfig = Field(..., description="LLM configuration")
    database_url: Optional[str] = Field(None, description="Database URL") 
    lead_agent: AgentType = Field(AgentType.DOCUMENTATION_MANAGER, description="Lead agent type")
    enabled_agents: Set[AgentType] = Field(default_factory=set, description="Enabled sub-agents") 