#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import datetime
from pathlib import Path

# Base directory
MCP_DIR = "/Users/kinglerbercy/MCP"

# Server categories
SERVER_CATEGORIES = {
    "Database": ["supabase-mcp-server", "qdrant-server", "qdrant-mcp-server"],
    "Integration": ["shopify-mcp-server", "sendgrid-mcp", "n8n-mcp-server", "mcp-server-firecrawl"],
    "AI": ["reasoning-agent-server", "ai-reasoning-mcp", "sequential-thinking-mcp", "context-compression"],
    "Development": [
        "security-engineer-server", 
        "devops-engineer-server", 
        "code-quality-analyst-server",
        "system-architect-server",
        "qa-engineer-server",
        "documentation-manager-server",
        "ux-designer-server",
        "ui-designer-server"
    ]
}

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
    
    # Add category-based breakdown
    md += f"## Category Breakdown\n\n"
    for category, servers in SERVER_CATEGORIES.items():
        category_results = [r for r in report["results"] if r["name"] in servers]
        if category_results:
            passing = sum(1 for r in category_results if r["status"] == "ok")
            total = len(category_results)
            md += f"### {category} Servers\n\n"
            md += f"- Passing: {passing}/{total} ({passing/total*100:.1f}%)\n\n"
            
            for result in category_results:
                status_icon = {"ok": "✅", "warning": "⚠️", "error": "❌"}[result["status"]]
                md += f"- {status_icon} **{result['name']}**"
                if result["issues"]:
                    md += f": {', '.join(result['issues'])}\n"
                else:
                    md += f"\n"
            md += f"\n"
    
    with open(os.path.join(MCP_DIR, "SERVER_TEST_REPORT.md"), "w") as f:
        f.write(md)

def check_env_variables(server_path, server_name):
    """Check if required environment variables are set in .env file"""
    issues = []
    
    # Define required env vars for specific servers
    required_env = {
        "shopify-mcp-server": ["SHOPIFY_ACCESS_TOKEN", "MYSHOPIFY_DOMAIN"],
        "sendgrid-mcp": ["SENDGRID_API_KEY"],
    }
    
    # If server has required env vars, check if they exist
    if server_name in required_env:
        env_file = os.path.join(server_path, ".env")
        if not os.path.exists(env_file):
            issues.append("Missing .env file")
            return issues
        
        # Check if required variables are in .env file
        with open(env_file, "r") as f:
            env_content = f.read()
            
        for var in required_env[server_name]:
            if var not in env_content:
                issues.append(f"Missing environment variable: {var}")
    
    return issues

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
    
    # Check for required files based on server type
    if is_node:
        if not os.path.exists(os.path.join(server_path, "package.json")):
            results["issues"].append("Missing package.json")
    elif is_python:
        if not os.path.exists(os.path.join(server_path, "requirements.txt")):
            results["issues"].append("Missing requirements.txt")
        
        # Check for main Python file
        python_main_files = ["app.py", "main.py", "server.py"]
        if not any(os.path.exists(os.path.join(server_path, f)) for f in python_main_files):
            results["issues"].append("Missing main Python file (app.py, main.py, or server.py)")
    
    # Check environment variables if needed
    env_issues = check_env_variables(server_path, server_name)
    if env_issues:
        results["issues"].extend(env_issues)
    
    # Set final status
    if not results["issues"]:
        results["status"] = "ok"
    elif len(results["issues"]) > 2:
        results["status"] = "error"
    else:
        results["status"] = "warning"
        
    return results

def get_category(server_name):
    """Get the category of a server"""
    for category, servers in SERVER_CATEGORIES.items():
        if server_name in servers:
            return category
    return "Uncategorized"

def main():
    print("Starting MCP server tests...")
    
    # Parse arguments
    import argparse
    parser = argparse.ArgumentParser(description="Test MCP servers")
    parser.add_argument("--server", help="Test a specific server")
    parser.add_argument("--category", help="Test servers in a specific category")
    parser.add_argument("--all", action="store_true", help="Test all servers")
    parser.add_argument("--list", action="store_true", help="List all servers")
    args = parser.parse_args()
    
    # List all servers
    if args.list:
        all_servers = []
        for category, servers in SERVER_CATEGORIES.items():
            print(f"\n{category} Servers:")
            for server in sorted(servers):
                print(f"  - {server}")
                all_servers.append(server)
        
        # Find servers not in any category
        all_dirs = [d for d in os.listdir(MCP_DIR) 
                  if os.path.isdir(os.path.join(MCP_DIR, d)) and 
                  not d.startswith('.') and
                  ("server" in d.lower() or "mcp" in d.lower())]
        
        uncategorized = [d for d in all_dirs if d not in all_servers]
        if uncategorized:
            print("\nUncategorized Servers:")
            for server in sorted(uncategorized):
                print(f"  - {server}")
        
        return
    
    # Determine which servers to test
    servers_to_test = []
    
    if args.server:
        servers_to_test = [args.server]
    elif args.category:
        if args.category in SERVER_CATEGORIES:
            servers_to_test = SERVER_CATEGORIES[args.category]
        else:
            print(f"Error: Category {args.category} not found")
            print("Available categories:")
            for category in SERVER_CATEGORIES.keys():
                print(f"  - {category}")
            return
    else:  # Test all servers
        all_dirs = [d for d in os.listdir(MCP_DIR) 
                  if os.path.isdir(os.path.join(MCP_DIR, d)) and 
                  not d.startswith('.')]
        
        servers_to_test = [d for d in all_dirs if "server" in d.lower() or "mcp" in d.lower()]
    
    results = []
    for server in servers_to_test:
        results.append(test_server(server))
    
    # Generate report
    report = {
        "timestamp": datetime.datetime.now().isoformat(),
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
    
    print(f"\nTesting complete. {report['passing']} passed, {report['warnings']} warnings, {report['errors']} errors")
    print(f"Reports generated:")
    print(f"- JSON: {os.path.join(MCP_DIR, 'server_test_results.json')}")
    print(f"- Markdown: {os.path.join(MCP_DIR, 'SERVER_TEST_REPORT.md')}")

if __name__ == "__main__":
    main() 