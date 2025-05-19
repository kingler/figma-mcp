# Supabase MCP Server Setup Guide

This guide will help you set up and troubleshoot the Supabase MCP server for the Claude desktop client.

## Prerequisites

- Docker Desktop installed and running
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Python 3.8+ installed

## Step 1: Fix the Claude Configuration File

The troubleshooting script identified JSON parsing errors in the Claude configuration file. This is likely due to a Byte Order Mark (BOM) or other formatting issues.

1. Quit the Claude client completely (Cmd+Q)
2. Run the fix script:
   ```bash
   cd ~/Documents/Cline/MCP/
   python3 fix_claude_config.py
   ```

## Step 2: Start Docker

The Supabase server requires Docker to be running:

1. Open Docker Desktop
2. Wait for Docker to start completely (the whale icon in the menu bar should stop animating)

## Step 3: Start the Supabase Server

1. Run the Supabase checker script:
   ```bash
   cd ~/Documents/Cline/MCP/
   python3 check_and_start_supabase.py
   ```
2. Wait for the Supabase server to start (this may take a few minutes)
3. Verify that the Supabase server is running by visiting http://localhost:8000/health in your browser

## Step 4: Verify the Supabase MCP Server Setup

1. Run the setup checker script:
   ```bash
   cd ~/Documents/Cline/MCP/
   python3 check_supabase_mcp_setup.py
   ```
2. This script will check if the Supabase MCP server is properly installed and set up
3. It will also check if the required dependencies are installed and install them if needed

## Step 5: Restart the Claude Client

1. Start the Claude client
2. Wait for it to fully load
3. Check if the Supabase MCP server appears in the MCP servers list

## Troubleshooting

If the Supabase MCP server still doesn't appear in the Claude client, try the following:

### Check the Logs

1. Check the Claude logs:
   ```bash
   cd ~/Library/Logs/Claude/
   cat mcp.log | grep -i supabase
   ```

2. Check the Supabase MCP server logs:
   ```bash
   cd ~/Library/Logs/Claude/
   cat mcp-server-supabase-server.log
   ```

### Common Issues and Solutions

#### JSON Parsing Error

If you see "Unexpected non-whitespace character after JSON" errors in the logs:

1. Quit the Claude client
2. Run the fix script again:
   ```bash
   cd ~/Documents/Cline/MCP/
   python3 fix_claude_config.py
   ```
3. Restart the Claude client

#### Module Import Error

If you see "Named export 'Client' not found. The requested module 'pg' is a CommonJS module" errors:

1. Install the required dependencies:
   ```bash
   cd ~/Documents/Cline/MCP/supabase-mcp-server/
   source .venv/bin/activate
   pip install psycopg2-binary
   deactivate
   ```
2. Restart the Claude client

#### Server Disconnection Error

If you see "Server disconnected" errors in the logs:

1. Make sure the Supabase server is running:
   ```bash
   curl -s http://localhost:8000/health
   ```
2. If it's not running, start it using the script:
   ```bash
   cd ~/Documents/Cline/MCP/
   python3 check_and_start_supabase.py
   ```
3. Restart the Claude client

## Advanced Troubleshooting

### Enable Developer Mode

1. Open the Claude client
2. Click on the Claude menu in the top-left corner
3. Select 'Help' > 'Enable Developer Mode'
4. This will give you access to additional debugging tools

### Check for Updates

1. Open the Claude client
2. Click on the Claude menu in the top-left corner
3. Select 'Check for Updates...'

### Reinstall the Claude Client

If all else fails, you may need to reinstall the Claude client:

1. Uninstall the Claude client
2. Download the latest version from the Claude website
3. Install the new version

## Support

If you continue to experience issues, please contact Claude support for assistance. 