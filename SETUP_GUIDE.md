# Supabase MCP Server Setup Guide

This guide will help you set up the Supabase MCP (Model Context Protocol) server for use with the Claude desktop client.

## Prerequisites

- Docker Desktop installed and running
- Python 3.9+ installed
- Supabase CLI installed (`npm install -g supabase`)
- Claude desktop client installed

## Step 1: Fix the Claude Configuration File

The Claude desktop client uses a configuration file to specify which MCP servers to use. This file is located at:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

If you're experiencing issues with the configuration file, you can use the `force_fix_config.py` script to create a new configuration file with just the Supabase MCP server:

```bash
cd ~/Documents/Cline/MCP/
python3 force_fix_config.py
```

This script will:
1. Back up your existing configuration file
2. Create a new configuration file with just the Supabase MCP server
3. Ensure the file is properly formatted without a BOM (Byte Order Mark)

## Step 2: Start Docker

Make sure Docker Desktop is running. You can check this by running:

```bash
docker info
```

If Docker is not running, start Docker Desktop from your Applications folder.

## Step 3: Start the Supabase Server

The Supabase server needs to be running for the MCP server to connect to it. You can start it using the `check_and_start_supabase.py` script:

```bash
cd ~/Documents/Cline/MCP/
python3 check_and_start_supabase.py
```

This script will:
1. Check if Docker is running
2. Check if the Supabase CLI is installed
3. Check if the Supabase server is already running
4. Start the Supabase server if it's not running

The Supabase server will be available at:
- URL: http://localhost:8000
- REST URL: http://localhost:8000/rest/v1
- GraphQL URL: http://localhost:8000/graphql/v1
- Studio URL: http://localhost:8000/studio

## Step 4: Start the MCP Server

Once the Supabase server is running, you can start the MCP server using the `check_mcp_server_running.py` script:

```bash
cd ~/Documents/Cline/MCP/
python3 check_mcp_server_running.py
```

This script will:
1. Read the Claude configuration file
2. Find the Supabase MCP server configuration
3. Start the MCP server with the correct command, arguments, environment variables, and working directory
4. Monitor the server's output for errors or success messages

## Step 5: Restart the Claude Client

After starting the MCP server:
1. Quit the Claude client completely (Cmd+Q)
2. Restart the Claude client

The Claude client should now connect to the Supabase MCP server.

## Troubleshooting

If you're experiencing issues, you can use the `troubleshoot_mcp.py` script to diagnose problems:

```bash
cd ~/Documents/Cline/MCP/
python3 troubleshoot_mcp.py
```

This script will:
1. Check the JSON format of the configuration file
2. Check if the Claude client is running
3. Check the MCP logs for errors
4. Validate the MCP configuration
5. Provide troubleshooting steps based on the checks performed

### Common Issues

1. **JSON Parsing Error**: If you see a JSON parsing error in the logs, use the `force_fix_config.py` script to create a new configuration file.

2. **Docker Not Running**: Make sure Docker Desktop is running before starting the Supabase server.

3. **Supabase Server Not Running**: Use the `check_and_start_supabase.py` script to start the Supabase server.

4. **MCP Server Not Starting**: Check the MCP server logs for errors. The logs are located in `~/Library/Logs/Claude/`.

5. **Command Not Found**: Make sure the command specified in the configuration file exists and is executable.

## Logs

- Supabase server logs: `~/Documents/Cline/MCP/logs/supabase_server.log`
- MCP logs: `~/Library/Logs/Claude/`

## Scripts

- `force_fix_config.py`: Creates a new configuration file with just the Supabase MCP server
- `check_and_start_supabase.py`: Checks if the Supabase server is running and starts it if needed
- `check_mcp_server_running.py`: Starts the MCP server and monitors its output
- `troubleshoot_mcp.py`: Diagnoses issues with the MCP setup
- `inspect_json.py`: Inspects a JSON file for hidden characters or encoding issues

## Environment Variables

The Supabase MCP server uses the following environment variables:

- `SUPABASE_PROJECT_REF`: The Supabase project reference (e.g., `127.0.0.1:5432`)
- `SUPABASE_DB_PASSWORD`: The Supabase database password (e.g., `postgres`)
- `SUPABASE_DB_USER`: The Supabase database user (e.g., `kinglerbercy`)
- `SUPABASE_DB`: The Supabase database name (e.g., `postgres`)
- `SUPABASE_REGION`: The Supabase region (e.g., `us-east-1`)
- `SUPABASE_URL`: The Supabase URL (e.g., `http://localhost:8000`)
- `SUPABASE_PUBLIC_URL`: The Supabase public URL (e.g., `http://localhost:8000`)
- `SUPABASE_REST_URL`: The Supabase REST URL (e.g., `http://localhost:8000/rest/v1`)

These variables are specified in the Claude configuration file under the `env` section of the Supabase MCP server configuration. 