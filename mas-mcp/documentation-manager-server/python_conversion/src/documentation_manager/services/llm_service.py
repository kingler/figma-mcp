import os
from typing import Dict, List, Any, Optional

from ..models.agent import LLMConfig, LLMProvider


class LLMService:
    """Abstract class for LLM providers"""
    
    def __init__(self, config: LLMConfig):
        self.config = config
        self.client = None
        
    async def initialize(self) -> None:
        """Initialize the LLM client"""
        raise NotImplementedError()
        
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generate text from the LLM"""
        raise NotImplementedError()


class AnthropicService(LLMService):
    """Anthropic Claude LLM provider"""
    
    async def initialize(self) -> None:
        """Initialize the Anthropic client"""
        try:
            from anthropic import Anthropic
            
            api_key = self.config.api_key or os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("Anthropic API key is required")
                
            self.client = Anthropic(api_key=api_key)
        except ImportError:
            raise ImportError("Anthropic dependency not installed. Install with 'pip install anthropic'")
            
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generate text using Claude"""
        if not self.client:
            await self.initialize()
            
        messages = []
        
        # Add system prompt if provided
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
            
        # Add the current prompt
        messages.append({"role": "user", "content": prompt})
        
        # Generate response
        response = self.client.messages.create(
            model=self.config.model,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            messages=messages,
        )
        
        return response.content[0].text


class OpenAIService(LLMService):
    """OpenAI LLM provider"""
    
    async def initialize(self) -> None:
        """Initialize the OpenAI client"""
        try:
            from openai import OpenAI
            
            api_key = self.config.api_key or os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key is required")
                
            self.client = OpenAI(api_key=api_key)
        except ImportError:
            raise ImportError("OpenAI dependency not installed. Install with 'pip install openai'")
            
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Generate text using OpenAI"""
        if not self.client:
            await self.initialize()
            
        messages = []
        
        # Add system prompt if provided
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
            
        # Add the current prompt
        messages.append({"role": "user", "content": prompt})
        
        # Generate response
        response = self.client.chat.completions.create(
            model=self.config.model,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            messages=messages,
        )
        
        return response.choices[0].message.content


def get_llm_service(config: LLMConfig) -> LLMService:
    """Factory function to get the appropriate LLM service"""
    if config.provider == LLMProvider.ANTHROPIC:
        return AnthropicService(config)
    elif config.provider == LLMProvider.OPENAI:
        return OpenAIService(config)
    else:
        raise ValueError(f"Unsupported LLM provider: {config.provider}") 