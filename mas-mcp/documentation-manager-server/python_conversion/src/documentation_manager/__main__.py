#!/usr/bin/env python
import os
import json
import argparse
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, Set

from mcp.server import Server
from mcp.server.stdio import StdioServerTransport

from .database.database_service import InMemoryDatabaseService, SupabaseDatabaseService
from .services.document_service import DocumentService
from .services.template_service import TemplateService
from .services.generator_service import GeneratorService
from .models.agent import AgentSystemConfig, LLMConfig, LLMProvider, AgentType
from .handlers.document_handlers import register_document_handlers
from .agents.documentation_manager_agent import DocumentationManagerAgent


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration from file or use defaults"""
    default_config = {
        "llm": {
            "provider": "anthropic",
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 4000,
            "temperature": 0.7,
        },
        "database": {
            "use_in_memory": True,
            "supabase_url": None,
            "supabase_key": None,
        },
        "agents": {
            "lead_agent": "documentation_manager",
            "enabled_agents": [
                "technical_writer",
                "knowledge_base_manager",
                "automation_engineer",
                "quality_analyst",
                "version_control_specialist",
                "documentation_devops",
            ],
        },
    }

    if config_path:
        try:
            with open(config_path, "r") as f:
                user_config = json.load(f)
                
            # Merge user config with defaults
            if "llm" in user_config:
                default_config["llm"].update(user_config["llm"])
            if "database" in user_config:
                default_config["database"].update(user_config["database"])
            if "agents" in user_config:
                default_config["agents"].update(user_config["agents"])
        except Exception as e:
            print(f"Error loading config from {config_path}: {str(e)}")
            print("Using default configuration")

    return default_config


async def setup_services(config: Dict[str, Any]):
    """Set up services based on configuration"""
    # Set up database service
    if config["database"]["use_in_memory"]:
        print("Using in-memory database")
        db_service = InMemoryDatabaseService()
    else:
        print("Using Supabase database")
        supabase_url = config["database"]["supabase_url"] or os.environ.get("SUPABASE_URL")
        supabase_key = config["database"]["supabase_key"] or os.environ.get("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print("Supabase URL and key required. Using in-memory database instead.")
            db_service = InMemoryDatabaseService()
        else:
            db_service = SupabaseDatabaseService(supabase_url, supabase_key)
            await db_service.initialize()

    # Set up document and template services
    document_service = DocumentService(db_service)
    template_service = TemplateService(db_service)
    generator_service = GeneratorService(template_service, document_service)
    
    # Initialize default templates
    await template_service.initialize_default_templates()
    
    return db_service, document_service, template_service, generator_service


async def setup_agents(
    config: Dict[str, Any],
    document_service: DocumentService,
    template_service: TemplateService,
    generator_service: GeneratorService,
):
    """Set up agent system based on configuration"""
    # Create LLM config
    llm_config = LLMConfig(
        provider=LLMProvider(config["llm"]["provider"]),
        model=config["llm"]["model"],
        max_tokens=config["llm"]["max_tokens"],
        temperature=config["llm"]["temperature"],
    )
    
    # Create agent system config
    agent_system_config = AgentSystemConfig(
        llm_config=llm_config,
        lead_agent=AgentType(config["agents"]["lead_agent"]),
        enabled_agents=set(AgentType(agent) for agent in config["agents"]["enabled_agents"]),
    )
    
    # Create documentation manager (lead agent)
    lead_agent = DocumentationManagerAgent(
        llm_config=llm_config,
        document_service=document_service,
        template_service=template_service,
        generator_service=generator_service,
    )
    
    await lead_agent.initialize()
    
    # TODO: Create and initialize sub-agents
    
    return lead_agent, agent_system_config


async def run_server(config_path: Optional[str] = None):
    """Run the MCP server"""
    # Load configuration
    config = load_config(config_path)
    
    # Set up services
    db_service, document_service, template_service, generator_service = await setup_services(
        config
    )
    
    # Set up agents
    lead_agent, agent_system_config = await setup_agents(
        config, document_service, template_service, generator_service
    )
    
    # Create MCP server
    server = Server(
        name="documentation-manager-server",
        version="1.0.0",
    )
    
    # Register handlers
    register_document_handlers(server, document_service, template_service, generator_service)
    
    # Connect to transport
    transport = StdioServerTransport()
    await server.connect(transport)
    
    print("Documentation Manager Server is running")
    
    try:
        # Keep server running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        await db_service.close()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Documentation Manager Server")
    parser.add_argument(
        "--config", 
        type=str, 
        help="Path to configuration file"
    )
    
    args = parser.parse_args()
    
    asyncio.run(run_server(args.config))


if __name__ == "__main__":
    main()
