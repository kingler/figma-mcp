#!/usr/bin/env python3
import json
import os
import argparse

MCP_DIR = "/Users/kinglerbercy/MCP"

def generate_mcp_config(output_path=None, include_all=False):
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
    
    # Context compression
    config["mcpServers"]["context-compression"] = {
        "command": "npx",
        "args": ["-y", "context-compression"],
        "env": {"PORT": "3003"}
    }
    
    # Development role servers (include only if include_all=True)
    if include_all:
        # Security engineer
        config["mcpServers"]["security-engineer"] = {
            "command": "npx",
            "args": ["-y", "security-engineer-server"],
            "env": {"PORT": "3010"}
        }
        
        # DevOps engineer
        config["mcpServers"]["devops-engineer"] = {
            "command": "npx",
            "args": ["-y", "devops-engineer-server"],
            "env": {"PORT": "3011"}
        }
        
        # System architect
        config["mcpServers"]["system-architect"] = {
            "command": "npx",
            "args": ["-y", "system-architect-server"],
            "env": {"PORT": "3012"}
        }
        
        # QA engineer
        config["mcpServers"]["qa-engineer"] = {
            "command": "npx",
            "args": ["-y", "qa-engineer-server"],
            "env": {"PORT": "3013"}
        }
        
        # UI designer
        config["mcpServers"]["ui-designer"] = {
            "command": "npx",
            "args": ["-y", "ui-designer-server"],
            "env": {"PORT": "3014"}
        }
        
        # UX designer
        config["mcpServers"]["ux-designer"] = {
            "command": "npx",
            "args": ["-y", "ux-designer-server"],
            "env": {"PORT": "3015"}
        }
        
        # Documentation manager
        config["mcpServers"]["documentation-manager"] = {
            "command": "npx",
            "args": ["-y", "documentation-manager-server"],
            "env": {"PORT": "3016"}
        }
    
    # Integration servers
    config["mcpServers"]["n8n"] = {
        "command": "npx",
        "args": ["-y", "n8n-mcp-server"],
        "env": {"PORT": "5678"}
    }
    
    # Shopify (requires API key)
    config["mcpServers"]["shopify"] = {
        "command": "npx",
        "args": ["-y", "shopify-mcp-server"],
        "env": {
            "PORT": "3020",
            "SHOPIFY_ACCESS_TOKEN": "your_shopify_access_token_here",
            "MYSHOPIFY_DOMAIN": "your-store.myshopify.com"
        }
    }
    
    # SendGrid (requires API key)
    config["mcpServers"]["sendgrid"] = {
        "command": "npx",
        "args": ["-y", "sendgrid-mcp"],
        "env": {
            "PORT": "3021",
            "SENDGRID_API_KEY": "your_sendgrid_api_key_here"
        }
    }
    
    # Determine output path
    if output_path is None:
        output_path = os.path.join(MCP_DIR, "mcp-config.json")
    
    # Write configuration file
    with open(output_path, "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"MCP configuration generated at {output_path}")
    print(f"Total servers configured: {len(config['mcpServers'])}")
    print("\nRemember to:")
    print("1. Replace API keys with actual values where needed")
    print("2. Customize ports if there are conflicts")
    
    return output_path

def generate_cursor_config(source_config_path=None, output_path=None):
    """Generate a Cursor-specific configuration based on the MCP config"""
    if source_config_path is None:
        source_config_path = os.path.join(MCP_DIR, "mcp-config.json")
    
    if output_path is None:
        output_path = os.path.join(os.path.expanduser("~"), ".cursor", "mcp.json")
    
    if not os.path.exists(source_config_path):
        print(f"Error: Source config not found at {source_config_path}")
        return None
    
    # Read source config
    with open(source_config_path, "r") as f:
        mcp_config = json.load(f)
    
    # Write to cursor config
    with open(output_path, "w") as f:
        json.dump(mcp_config, f, indent=2)
    
    print(f"Cursor MCP configuration generated at {output_path}")
    return output_path

def main():
    parser = argparse.ArgumentParser(description="Generate MCP server configuration files")
    parser.add_argument("--all", action="store_true", help="Include all server types in configuration")
    parser.add_argument("--output", "-o", help="Output file path for MCP config")
    parser.add_argument("--cursor", action="store_true", help="Generate Cursor-specific configuration file")
    parser.add_argument("--cursor-output", help="Output file path for Cursor config")
    
    args = parser.parse_args()
    
    # Generate base MCP config
    mcp_config_path = generate_mcp_config(args.output, args.all)
    
    # Generate Cursor config if requested
    if args.cursor:
        generate_cursor_config(mcp_config_path, args.cursor_output)

if __name__ == "__main__":
    main() 