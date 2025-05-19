# MCP Servers Catalog

## Overview
This document catalogs all MCP servers found in the project, organized by their functional categories: Servers, Tools, and Prompts.

## Categories

### 1. Servers (Backend Services)

#### Database and Storage Servers
- `supabase-mcp-server/` - Supabase integration for MCP
- `supabase-server/` - Standalone Supabase server
- `qdrant-server/` - Vector database server
- `qdrant-mcp-server/` - Vector database integration for MCP

#### Analysis and Processing Servers
- `analysis-mcp-server/` - Data analysis capabilities
- `state-mcp-server/` - State management server
- `validation-mcp-server/` - Validation services
- `llm-selection-server/` - LLM model selection services
- `neo-orchestrator-server/` - Service orchestration
- `morpheus-validator-server/` - Data validation services
- `mcp-server-firecrawl/` - Web crawling services

#### Integration Servers
- `n8n-mcp-server/` - n8n workflow automation integration
- `shopify-mcp-server/` - Shopify integration
- `shopify-hydrogen-mcp/` - Shopify Hydrogen framework integration
- `sendgrid-mcp/` - SendGrid email integration
- `fetch-mcp/` - Data fetching services
- `openapi-management-server/` - OpenAPI specification management
- `neo4j-mcp/` - Neo4j graph database integration

### 2. Development Role Servers
- `security-engineer-server/` - Security engineering assistance
- `devops-engineer-server/` - DevOps engineering assistance
- `sre-server/` - Site Reliability Engineering assistance
- `code-quality-analyst-server/` - Code quality analysis
- `system-architect-server/` - System architecture design
- `qa-engineer-server/` - Quality Assurance engineering
- `documentation-manager-server/` - Documentation management
- `performance-optimization-server/` - Performance optimization
- `development-team-server/` - Development team assistance
- `ui-designer-server/` - UI design assistance
- `ux-designer-server/` - UX design assistance
- `integration-specialist-server/` - Integration specialist assistance

### 3. AI/Reasoning Servers
- `reasoning-agent-server/` - Reasoning agent capabilities
- `ai-reasoning-mcp/` - AI reasoning services
- `sequential-thinking-mcp/` - Sequential thinking processing
- `context-compression/` - Context compression services
- `project-knowledge-mcp/` - Project knowledge management

## Tools (Utility Scripts)

### Configuration Management
- `create_new_config.py` - Creates a new configuration file
- `sync_mcp_configs.py` - Synchronizes MCP configurations
- `fix_claude_config.py` - Fixes Claude configuration issues
- `restore_config.py` - Restores configuration from backup
- `minimal_config.py` - Creates a minimal configuration
- `alternate_config.py` - Creates an alternate configuration
- `force_fix_config.py` - Forces configuration fixes

### Testing and Validation
- `test_mcp_connection.py` - Tests MCP connection
- `test_mcp_response.py` - Tests MCP response
- `test_mcp_json.py` - Tests MCP JSON handling
- `test_supabase_server.py` - Tests Supabase server
- `test_supabase_mcp.py` - Tests Supabase MCP integration
- `check_claude.py` - Checks Claude integration
- `check_json_format.py` - Checks JSON format validity

### Debugging and Maintenance
- `debug_mcp_server.py` - Debugs MCP server issues
- `debug_supabase_mcp.py` - Debugs Supabase MCP integration
- `troubleshoot_mcp.py` - Troubleshoots MCP issues
- `check_mcp_installation.py` - Checks MCP installation
- `check_mcp_server_running.py` - Checks if MCP server is running
- `check_and_start_supabase.py` - Checks and starts Supabase
- `start_supabase.py` - Starts Supabase server
- `check_supabase_mcp_setup.py` - Checks Supabase MCP setup
- `run_supabase_mcp.py` - Runs Supabase MCP server

### JSON and Module Fixing
- `fix_json_error.py` - Fixes JSON errors
- `fix_position_4.py` - Fixes position errors
- `inspect_json.py` - Inspects JSON for issues
- `fix_pg_module.py` - Fixes PostgreSQL module issues
- `fix_pg_module_core.py` - Fixes PostgreSQL module core issues
- `reinstall_pg_module.py` - Reinstalls PostgreSQL module
- `no_bom_config.py` - Removes BOM from configuration
- `empty_config.py` - Creates an empty configuration

## Prompts (AI Interaction Templates)
Based on the project structure, there are no clearly defined prompt directories. However, many of the servers likely contain prompts within their implementation for interacting with AI models.

## Status Summary

### Working Servers
- ✅ supabase-mcp-server (confirmed running)
- ✅ supabase-server (confirmed running)

### Servers with Unknown Status
- All other servers require individual testing

### Working Tools
- ✅ check_mcp_installation.py
- ✅ check_mcp_server_running.py
- ✅ check_and_start_supabase.py
- ✅ troubleshoot_mcp.py

## Next Steps
1. Test each server individually by checking if it can be started
2. Verify that Claude Desktop and IDEs can connect to each server
3. Document any servers with issues and troubleshoot them
4. Create a standardized configuration across all clients 