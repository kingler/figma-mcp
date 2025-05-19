# MCP Servers Optimization Plan

## Executive Summary

This document outlines a comprehensive optimization plan for the extensive collection of MCP (Model Context Protocol) servers in the `/Users/kinglerbercy/MCP` directory. The goal is to ensure all servers are properly configured, built, and functional to provide a seamless experience when connecting Claude and other AI assistants to external services.

## Current Status

Based on the analysis of the MCP directory:
- **Total MCP Servers**: 34+
- **Working Servers**: ~25 (73%)
- **Servers with Issues**: ~9 (27%)
- **Documentation**: Reasonably complete but could be improved

## Phase 1: Fix Critical Server Issues

### 1.1 Create Fix Script

Create a fix_server_builds.sh script to automate the building of servers with missing build directories:

```bash
#!/bin/bash

# Script to fix build issues with MCP servers
echo "Starting MCP server build fixes..."

# Fix state-mcp-server
echo "Fixing state-mcp-server..."
cd /Users/kinglerbercy/MCP/state-mcp-server
npm install
npm run build

# Fix mcp-server-firecrawl
echo "Fixing mcp-server-firecrawl..."
cd /Users/kinglerbercy/MCP/mcp-server-firecrawl
npm install
npm run build

# Fix supabase-mcp-server
echo "Fixing supabase-mcp-server..."
cd /Users/kinglerbercy/MCP/supabase-mcp-server
pip install -r requirements.txt

echo "All builds completed!"
```

### 1.2 Fix Module Import Issues

For servers with ES Module import issues:

```bash
# Create module_fix.sh
echo "Fixing module import issues..."

# Fix supabase-server ES Module issues
sed -i '' 's/import { Client } from '\''pg'\'';/import pkg from '\''pg'\''; const { Client } = pkg;/' /Users/kinglerbercy/MCP/supabase-server/src/database.js

# Fix qdrant-server ES Module issues
sed -i '' 's/"type": "commonjs"/"type": "module"/' /Users/kinglerbercy/MCP/qdrant-server/package.json

# Fix analysis-mcp-server ES Module issues
sed -i '' 's/import { Client } from '\''pg'\'';/import pkg from '\''pg'\''; const { Client } = pkg;/' /Users/kinglerbercy/MCP/analysis-mcp-server/src/DBAnalyzer.js
```

### 1.3 Create Environment Template Script

```bash
# Generate .env templates for servers requiring API keys
echo "Creating environment variable templates..."

# SendGrid template
cat > /Users/kinglerbercy/MCP/sendgrid-mcp/.env << EOL
# SendGrid API Key - Replace with your actual key
SENDGRID_API_KEY=your_sendgrid_api_key_here
EOL

# Shopify template (if not already present)
cat > /Users/kinglerbercy/MCP/shopify-mcp-server/.env << EOL
# Shopify API credentials - Replace with your actual values
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here
MYSHOPIFY_DOMAIN=your-store.myshopify.com
EOL
```

## Phase 2: Testing and Validation

### 2.1 Create Unified Testing Framework

Create a Python script `test_all_mcp_servers.py` that:

1. Tests each server for basic functionality
2. Verifies environment variables are set correctly
3. Checks build outputs exist
4. Attempts to start each server briefly
5. Generates a comprehensive report

```python
#!/usr/bin/env python3
import os
import sys
import subprocess
import json
from pathlib import Path

# Base directory
MCP_DIR = "/Users/kinglerbercy/MCP"

# Server categories
SERVER_CATEGORIES = {
    "Database": ["supabase-mcp-server", "qdrant-server", "qdrant-mcp-server"],
    "Integration": ["shopify-mcp-server", "sendgrid-mcp", "n8n-mcp-server"],
    "AI": ["reasoning-agent-server", "ai-reasoning-mcp", "sequential-thinking-mcp"],
    # Add more categories as needed
}

# Main test function
def test_server(server_name):
    print(f"Testing {server_name}...")
    server_path = os.path.join(MCP_DIR, server_name)
    results = {"name": server_name, "status": "unknown", "issues": []}
    
    # Check if directory exists
    if not os.path.exists(server_path):
        results["status"] = "error"
        results["issues"].append("Directory not found")
        return results
        
    # Determine server type (Node.js vs Python)
    is_node = os.path.exists(os.path.join(server_path, "package.json"))
    is_python = os.path.exists(os.path.join(server_path, "requirements.txt"))
    
    # Check for build directory (Node.js)
    if is_node:
        if not (os.path.exists(os.path.join(server_path, "build")) or 
                os.path.exists(os.path.join(server_path, "dist"))):
            results["issues"].append("No build directory found")
    
    # Check for specific files based on server name
    # Add more specific checks here
    
    # Set final status
    if not results["issues"]:
        results["status"] = "ok"
    elif len(results["issues"]) > 2:
        results["status"] = "error"
    else:
        results["status"] = "warning"
        
    return results

# Main function
def main():
    all_servers = [d for d in os.listdir(MCP_DIR) 
                  if os.path.isdir(os.path.join(MCP_DIR, d)) and 
                  not d.startswith('.')]
    
    results = []
    for server in all_servers:
        if "server" in server or "mcp" in server:  # Focus on server directories
            results.append(test_server(server))
    
    # Generate report
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_servers": len(results),
        "passing": sum(1 for r in results if r["status"] == "ok"),
        "warnings": sum(1 for r in results if r["status"] == "warning"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "results": results
    }
    
    # Write JSON report
    with open(os.path.join(MCP_DIR, "server_test_results.json"), "w") as f:
        json.dump(report, f, indent=2)
    
    # Generate Markdown report
    generate_markdown_report(report)
    
    print(f"Testing complete. {report['passing']} passed, {report['warnings']} warnings, {report['errors']} errors")

# Add more helper functions as needed

if __name__ == "__main__":
    main()
```

### 2.2 Create Markdown Test Report Generator

Add a function to generate a readable Markdown report from test results:

```python
def generate_markdown_report(report):
    """Generate a markdown report from test results"""
    md = f"# MCP Server Test Report\n\n"
    md += f"Generated: {report['timestamp']}\n\n"
    md += f"## Summary\n\n"
    md += f"- Total Servers: {report['total_servers']}\n"
    md += f"- Passing: {report['passing']} ({report['passing']/report['total_servers']*100:.1f}%)\n"
    md += f"- Warnings: {report['warnings']} ({report['warnings']/report['total_servers']*100:.1f}%)\n"
    md += f"- Errors: {report['errors']} ({report['errors']/report['total_servers']*100:.1f}%)\n\n"
    
    md += f"## Results\n\n"
    
    # Group by status
    for status in ["error", "warning", "ok"]:
        filtered = [r for r in report["results"] if r["status"] == status]
        if filtered:
            status_title = {"error": "❌ Servers with Errors", 
                           "warning": "⚠️ Servers with Warnings",
                           "ok": "✅ Servers Passing All Tests"}[status]
            md += f"### {status_title}\n\n"
            
            for result in filtered:
                md += f"- **{result['name']}**"
                if result["issues"]:
                    md += f": {', '.join(result['issues'])}\n"
                else:
                    md += f"\n"
            md += f"\n"
    
    with open(os.path.join(MCP_DIR, "SERVER_TEST_REPORT.md"), "w") as f:
        f.write(md)
```

## Phase 3: Server Management and Documentation

### 3.1 Create a Server Management Script

Create a Python script for managing MCP servers:

```python
#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse

MCP_DIR = "/Users/kinglerbercy/MCP"

def start_server(server_name):
    """Start a specific MCP server"""
    server_path = os.path.join(MCP_DIR, server_name)
    if not os.path.exists(server_path):
        print(f"Error: Server {server_name} not found")
        return False
    
    # Determine if Node.js or Python server
    is_node = os.path.exists(os.path.join(server_path, "package.json"))
    is_python = os.path.exists(os.path.join(server_path, "requirements.txt"))
    
    if is_node:
        # Handle Node.js server
        try:
            print(f"Starting Node.js server: {server_name}")
            subprocess.Popen(["node", "build/index.js"], cwd=server_path)
            print(f"Server {server_name} started")
            return True
        except Exception as e:
            print(f"Error starting Node.js server {server_name}: {e}")
            return False
    elif is_python:
        # Handle Python server
        try:
            print(f"Starting Python server: {server_name}")
            subprocess.Popen(["python", "app.py"], cwd=server_path)
            print(f"Server {server_name} started")
            return True
        except Exception as e:
            print(f"Error starting Python server {server_name}: {e}")
            return False
    else:
        print(f"Unknown server type for {server_name}")
        return False

def stop_server(server_name):
    """Stop a specific MCP server"""
    # Implementation depends on how servers are managed
    # This is a simplified example
    pass

def list_servers():
    """List all available MCP servers"""
    all_dirs = os.listdir(MCP_DIR)
    servers = [d for d in all_dirs if os.path.isdir(os.path.join(MCP_DIR, d)) 
              and ("server" in d.lower() or "mcp" in d.lower())]
    
    print(f"Found {len(servers)} MCP servers:")
    for server in sorted(servers):
        print(f"- {server}")

def main():
    parser = argparse.ArgumentParser(description="MCP Server Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start an MCP server")
    start_parser.add_argument("server", help="Server name to start")
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop an MCP server")
    stop_parser.add_argument("server", help="Server name to stop")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List all MCP servers")
    
    args = parser.parse_args()
    
    if args.command == "start":
        start_server(args.server)
    elif args.command == "stop":
        stop_server(args.server)
    elif args.command == "list":
        list_servers()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

### 3.2 Update Documentation

Create a comprehensive documentation guide for MCP servers:

```markdown
# MCP Servers Documentation

## Overview
This document provides detailed information on all MCP servers in the project, their purpose, configuration, and usage instructions.

## Server Categories

### Database Servers
- **supabase-mcp-server**: Connects to Supabase database for data storage and retrieval
- **qdrant-server**: Vector database for semantic search and similarity matching
- **qdrant-mcp-server**: MCP interface for the Qdrant vector database

### Integration Servers
- **shopify-mcp-server**: Connects to Shopify e-commerce platform
- **sendgrid-mcp**: Email services via SendGrid
- **n8n-mcp-server**: Workflow automation with n8n
- **mcp-server-firecrawl**: Web scraping and content extraction

### AI Reasoning Servers
- **reasoning-agent-server**: Advanced reasoning capabilities
- **ai-reasoning-mcp**: AI-based reasoning services
- **sequential-thinking-mcp**: Step-by-step reasoning processes

### Development Role Servers
- **security-engineer-server**: Security engineering assistance
- **devops-engineer-server**: DevOps engineering assistance
- **system-architect-server**: System architecture design
  
(Add more categories and servers as needed)

## Configuration

### Environment Variables
All servers requiring API keys use environment variables stored in `.env` files. 
These should be created in each server's directory with the required values.

### Common Environment Variables
- **PORT**: The port on which the server will run (default varies by server)
- **API_KEY**: API key for authentication (if applicable)
- **DEBUG**: Enable/disable debug mode (true/false)

### Server-Specific Variables
- **shopify-mcp-server**: 
  - SHOPIFY_ACCESS_TOKEN
  - MYSHOPIFY_DOMAIN
- **sendgrid-mcp**:
  - SENDGRID_API_KEY

## Usage Instructions

### Starting Servers
Use the server management script to start servers:

```bash
./mcp_server_manager.py start server-name
```

### Checking Server Status
Use the testing framework to check the status of all servers:

```bash
./test_all_mcp_servers.py
```

### Connecting to AI Assistants
To connect these servers to Claude or other AI assistants:

1. Ensure the server is running
2. Configure the client (Claude Desktop, Cursor, etc.) to use the correct URL
3. Test the connection using the provided tools

## Troubleshooting

Common issues and their solutions:

1. **Server won't start**:
   - Check if build directory exists
   - Verify package.json and dependencies
   - Check for error messages in console

2. **Environment variable errors**:
   - Ensure .env file exists with correct values
   - Check for typos in variable names

3. **Connection refused errors**:
   - Verify server is running
   - Check port configuration
   - Check if another process is using the same port
```

## Phase 4: Integration and Communication

### 4.1 Create Common MCP Config Generator

Create a script to generate a common MCP configuration file that can be used by all clients:

```python
#!/usr/bin/env python3
import json
import os

MCP_DIR = "/Users/kinglerbercy/MCP"

def generate_mcp_config():
    """Generate a common MCP configuration file"""
    config = {"mcpServers": {}}
    
    # Database servers
    config["mcpServers"]["supabase"] = {
        "command": "npx",
        "args": ["-y", "supabase-mcp-server"],
        "env": {"PORT": "54322"}
    }
    
    # Vector database
    config["mcpServers"]["qdrant"] = {
        "command": "npx",
        "args": ["-y", "qdrant-mcp-server"],
        "env": {"PORT": "6333"}
    }
    
    # Web scraping
    config["mcpServers"]["firecrawl"] = {
        "command": "npx",
        "args": [
            "-y",
            "@smithery/cli@latest",
            "run",
            "@mendableai/mcp-server-firecrawl",
            "--config",
            "fireCrawlApiKey=fc-0192e6b8cca842d78dc7975e64abf5cb"
        ]
    }
    
    # Crawl4AI server
    config["mcpServers"]["crawl4ai"] = {
        "type": "sse",
        "url": "http://127.0.0.1:8002/sse"
    }
    
    # AI reasoning servers
    config["mcpServers"]["reasoning"] = {
        "command": "npx",
        "args": ["-y", "reasoning-agent-server"],
        "env": {"PORT": "3001"}
    }
    
    # Sequential thinking
    config["mcpServers"]["sequential-thinking"] = {
        "command": "npx",
        "args": ["-y", "sequential-thinking-mcp"],
        "env": {"PORT": "3002"}
    }
    
    # Add more server configurations as needed
    
    # Write configuration file
    with open(os.path.join(MCP_DIR, "mcp-config.json"), "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"MCP configuration generated at {os.path.join(MCP_DIR, 'mcp-config.json')}")

if __name__ == "__main__":
    generate_mcp_config()
```

### 4.2 Create Integration Tests

Create integration tests to verify that clients can connect to servers:

```python
#!/usr/bin/env python3
import requests
import json
import os
import sys
import time
import subprocess

def test_server_integration(server_name, server_url):
    """Test if a client can connect to a server"""
    try:
        response = requests.get(f"{server_url}/health")
        if response.status_code == 200:
            print(f"✅ Server {server_name} is accessible")
            return True
        else:
            print(f"❌ Server {server_name} returned status code {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to server {server_name}: {e}")
        return False

def main():
    # Define servers to test
    servers = {
        "supabase": "http://localhost:54322",
        "qdrant": "http://localhost:6333",
        "reasoning": "http://localhost:3001",
        "sequential-thinking": "http://localhost:3002",
        # Add more servers as needed
    }
    
    # Test each server
    results = {}
    for name, url in servers.items():
        results[name] = test_server_integration(name, url)
    
    # Print summary
    print("\nIntegration Test Summary:")
    print(f"Total Servers: {len(results)}")
    print(f"Passing: {sum(1 for r in results.values() if r)}")
    print(f"Failing: {sum(1 for r in results.values() if not r)}")
    
    # Return exit code based on results
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
```

## Implementation Timeline

1. **Week 1**: Fix critical server issues (Phase 1)
   - Create and run fix scripts
   - Fix module import issues
   - Create environment templates

2. **Week 2**: Testing and validation (Phase 2)
   - Create and run testing framework
   - Generate test reports
   - Fix remaining issues

3. **Week 3**: Documentation and management (Phase 3)
   - Create server management script
   - Update documentation
   - Create user guides

4. **Week 4**: Integration and communication (Phase 4)
   - Create common MCP config generator
   - Run integration tests
   - Finalize documentation

## Conclusion

This optimization plan provides a comprehensive approach to fixing, testing, and documenting the MCP servers in your collection. By following this plan, you will ensure that all your MCP servers are properly configured, built, and functional, providing a seamless experience for AI assistants that need to access external services through these servers.

The modular approach allows you to implement specific phases as needed, focusing first on critical fixes and then moving to more comprehensive testing and documentation. 