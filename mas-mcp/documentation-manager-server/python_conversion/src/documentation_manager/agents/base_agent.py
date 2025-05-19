import asyncio
import uuid
from typing import Dict, List, Optional, Any, Callable, Set, Union, Tuple

from pydantic import ValidationError
from pydantic_ai import Agent as PydanticAgent, ChatContext

from ..models.agent import (
    AgentConfig,
    AgentState,
    AgentType,
    Belief,
    Desire,
    Intention,
    Rule,
    Tool,
    Chain,
    LLMConfig,
)
from ..services.llm_service import LLMService, get_llm_service


class BaseAgent:
    """Base class for all agents in the documentation manager"""

    def __init__(
        self,
        agent_type: AgentType,
        name: str,
        description: str,
        llm_config: LLMConfig,
        parent_agent: Optional["BaseAgent"] = None,
    ):
        self.agent_type = agent_type
        self.name = name
        self.description = description
        self.llm_config = llm_config
        self.parent_agent = parent_agent
        
        # Initialize state
        self.state = AgentState(agent_type=agent_type)
        
        # Initialize BDI components
        self.beliefs: Dict[str, Belief] = {}
        self.desires: Dict[str, Desire] = {}
        self.intentions: Dict[str, Intention] = {}
        self.rules: Dict[str, Rule] = {}
        
        # Initialize tools and chains
        self.tools: Dict[str, Tool] = {}
        self.chains: Dict[str, Chain] = {}
        
        # Initialize sub-agents
        self.sub_agents: Dict[AgentType, "BaseAgent"] = {}
        
        # Initialize LLM service
        self.llm_service: Optional[LLMService] = None
        
        # Initialize Pydantic agent
        self.pydantic_agent: Optional[PydanticAgent] = None
        
        self.system_prompt = self._generate_system_prompt()

    async def initialize(self) -> None:
        """Initialize the agent"""
        # Initialize LLM service
        self.llm_service = get_llm_service(self.llm_config)
        await self.llm_service.initialize()
        
        # Initialize Pydantic agent
        self._initialize_pydantic_agent()

    def _initialize_pydantic_agent(self) -> None:
        """Initialize the Pydantic agent with tools"""
        if self.llm_config.provider.value == "anthropic":
            model = self.llm_config.model
        else:
            model = self.llm_config.model

        self.pydantic_agent = PydanticAgent(
            model=model,
            system_prompt=self.system_prompt,
        )
        
        # Register tools with the Pydantic agent
        self._register_pydantic_tools()

    def _register_pydantic_tools(self) -> None:
        """Register tools with the Pydantic agent"""
        for tool_name, tool in self.tools.items():
            if tool.handler and self.pydantic_agent:
                self.pydantic_agent.tool(tool.handler)

    def _generate_system_prompt(self) -> str:
        """Generate the system prompt for the agent"""
        prompt = f"You are {self.name}, a {self.description}.\n\n"
        
        # Add BDI framework components
        prompt += "# BDI Framework\n\n"
        
        if self.beliefs:
            prompt += "## Beliefs\n"
            for belief in self.beliefs.values():
                prompt += f"- {belief.name}: {belief.description}\n"
            prompt += "\n"
        
        if self.desires:
            prompt += "## Desires\n"
            for desire in self.desires.values():
                prompt += f"- {desire.name}: {desire.description}\n"
            prompt += "\n"
        
        if self.intentions:
            prompt += "## Intentions\n"
            for intention in self.intentions.values():
                prompt += f"- {intention.name}: {intention.description}\n"
            prompt += "\n"
        
        if self.rules:
            prompt += "## Rules\n"
            for rule in self.rules.values():
                prompt += f"- {rule.name}: {rule.description}\n"
            prompt += "\n"
        
        # Add tools and chains
        if self.tools:
            prompt += "# Available Tools\n"
            for tool in self.tools.values():
                prompt += f"- {tool.name}: {tool.description}\n"
            prompt += "\n"
        
        if self.chains:
            prompt += "# Available Chains\n"
            for chain in self.chains.values():
                prompt += f"- {chain.name}: {chain.description}\n"
            prompt += "\n"
        
        return prompt

    def add_belief(self, belief: Belief) -> None:
        """Add a belief to the agent"""
        self.beliefs[belief.name] = belief
        self.state.current_beliefs[belief.name] = belief

    def update_belief(self, name: str, value: Any, confidence: float = 1.0) -> None:
        """Update an existing belief"""
        if name in self.beliefs:
            self.beliefs[name].value = value
            self.beliefs[name].confidence = confidence
            self.state.current_beliefs[name] = self.beliefs[name]

    def add_desire(self, desire: Desire) -> None:
        """Add a desire to the agent"""
        self.desires[desire.name] = desire
        self.state.current_desires[desire.name] = desire

    def update_desire(self, name: str, satisfied: bool = False) -> None:
        """Update an existing desire"""
        if name in self.desires:
            self.desires[name].satisfied = satisfied
            self.state.current_desires[name] = self.desires[name]

    def add_intention(self, intention: Intention) -> None:
        """Add an intention to the agent"""
        self.intentions[intention.name] = intention
        self.state.current_intentions[intention.name] = intention

    def update_intention(self, name: str, completed: bool = False) -> None:
        """Update an existing intention"""
        if name in self.intentions:
            self.intentions[name].completed = completed
            self.state.current_intentions[name] = self.intentions[name]

    def add_rule(self, rule: Rule) -> None:
        """Add a rule to the agent"""
        self.rules[rule.name] = rule

    def add_tool(self, tool: Tool) -> None:
        """Add a tool to the agent"""
        self.tools[tool.name] = tool
        # Re-register tools with Pydantic agent if already initialized
        if self.pydantic_agent and tool.handler:
            self.pydantic_agent.tool(tool.handler)

    def add_chain(self, chain: Chain) -> None:
        """Add a chain to the agent"""
        self.chains[chain.name] = chain

    def add_sub_agent(self, agent: "BaseAgent") -> None:
        """Add a sub-agent to this agent"""
        self.sub_agents[agent.agent_type] = agent
        agent.parent_agent = self

    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Run the agent with user input"""
        if not self.pydantic_agent:
            await self.initialize()
        
        # Update conversation history
        if context:
            msg = {"role": "user", "content": user_input, "context": context}
        else:
            msg = {"role": "user", "content": user_input}
        
        self.state.conversation_history.append(msg)
        
        # Run the Pydantic agent
        chat_context = ChatContext(
            messages=[{"role": "user", "content": user_input}],
            context=context or {},
        )
        
        result = await self.pydantic_agent.run_async(chat_context)
        
        # Update conversation history with the response
        self.state.conversation_history.append({"role": "assistant", "content": result})
        
        return result

    async def delegate_to_sub_agent(
        self, agent_type: AgentType, user_input: str, context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Delegate a task to a sub-agent"""
        if agent_type in self.sub_agents:
            return await self.sub_agents[agent_type].run(user_input, context)
        return None

    def to_config(self) -> AgentConfig:
        """Convert agent to AgentConfig"""
        return AgentConfig(
            type=self.agent_type,
            name=self.name,
            description=self.description,
            beliefs=list(self.beliefs.values()),
            desires=list(self.desires.values()),
            intentions=list(self.intentions.values()),
            rules=list(self.rules.values()),
            tools=list(self.tools.values()),
            chains=list(self.chains.values()),
            dependencies=[agent.agent_type for agent in self.sub_agents.values()],
            system_prompt=self.system_prompt,
        )

    @classmethod
    def from_config(
        cls, config: AgentConfig, llm_config: LLMConfig, parent_agent: Optional["BaseAgent"] = None
    ) -> "BaseAgent":
        """Create an agent from AgentConfig"""
        agent = cls(
            agent_type=config.type,
            name=config.name,
            description=config.description,
            llm_config=llm_config,
            parent_agent=parent_agent,
        )
        
        for belief in config.beliefs:
            agent.add_belief(belief)
            
        for desire in config.desires:
            agent.add_desire(desire)
            
        for intention in config.intentions:
            agent.add_intention(intention)
            
        for rule in config.rules:
            agent.add_rule(rule)
            
        for tool in config.tools:
            agent.add_tool(tool)
            
        for chain in config.chains:
            agent.add_chain(chain)
            
        agent.system_prompt = config.system_prompt or agent._generate_system_prompt()
        
        return agent 