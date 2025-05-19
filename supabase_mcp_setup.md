# Supabase MCP Server Setup

## Overview

This document outlines the setup and configuration of the Supabase MCP server for Cursor integration. The implementation uses the official Supabase MCP server created by Alexander Zuev.

## Installation Details

- **Repository Source**: https://github.com/alexander-zuev/supabase-mcp-server
- **Local Location**: `/Users/kinglerbercy/Documents/Cline/MCP/supabase-mcp-server`
- **Virtual Environment**: `.venv` in the supabase-mcp-server directory

## Configuration

### Environment Variables

The Supabase MCP server uses the following environment variables:

```
SUPABASE_URL=http://localhost:8000
SUPABASE_PUBLIC_URL=http://localhost:8000
SUPABASE_REST_URL=http://localhost:8000/rest/v1
SUPABASE_PROJECT_REF=127.0.0.1:8000
SUPABASE_DB_HOST=localhost
SUPABASE_DB_PORT=8000
SUPABASE_DB=postgres
SUPABASE_DB_USER=kinglerbercy
SUPABASE_DB_PASSWORD=postgres
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM5OTkwNTkxLCJleHAiOjE3NzE1MjY1OTF9.5DUk79Bj2R5v2OwrNtfX_d1SMf0LC_OtmbvJGFhy398
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Mzk5OTA1OTEsImV4cCI6MTc3MTUyNjU5MX0.WQgUGtTZ3Txj-iBI_rMk7ek97y5IprQu1W2yAL_C7U4
PYTHONUNBUFFERED=1
```

These variables have been configured both in the `.env` file within the supabase-mcp-server directory and in the MCP configuration file.

### Cursor MCP Configuration

The Supabase MCP server is configured in Cursor's `mcp_config.json` with the following settings:

```json
"supabase": {
  "command": "/Users/kinglerbercy/Documents/Cline/MCP/supabase-mcp-server/.venv/bin/python",
  "args": [
    "-m",
    "supabase_mcp.main"
  ],
  "env": {
    "SUPABASE_PROJECT_REF": "127.0.0.1:8000",
    "SUPABASE_DB_PASSWORD": "postgres",
    "SUPABASE_REGION": "us-east-1",
    "SUPABASE_DB_USER": "kinglerbercy",
    "SUPABASE_DB": "postgres",
    "SUPABASE_URL": "http://localhost:8000",
    "SUPABASE_PUBLIC_URL": "http://localhost:8000",
    "SUPABASE_REST_URL": "http://localhost:8000/rest/v1",
    "SUPABASE_DB_HOST": "localhost",
    "SUPABASE_DB_PORT": "8000",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM5OTkwNTkxLCJleHAiOjE3NzE1MjY1OTF9.5DUk79Bj2R5v2OwrNtfX_d1SMf0LC_OtmbvJGFhy398",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Mzk5OTA1OTEsImV4cCI6MTc3MTUyNjU5MX0.WQgUGtTZ3Txj-iBI_rMk7ek97y5IprQu1W2yAL_C7U4",
    "PYTHONUNBUFFERED": "1"
  },
  "cwd": "/Users/kinglerbercy/Documents/Cline/MCP/supabase-mcp-server"
}
```

## Features

The Supabase MCP server provides the following capabilities:

1. **Database Operations**: Run SQL queries, manage tables, and perform database operations
2. **Authentication**: Manage users, sign in, sign up, and handle authentication
3. **Storage**: Upload, download, and manage files in Supabase storage
4. **Functions**: Call Supabase Edge Functions
5. **Realtime**: Subscribe to database changes

## Usage in Cursor

The Supabase MCP server allows Cursor to interact with your Supabase instance directly, providing database access, authentication capabilities, and other Supabase features through the Model Context Protocol.

## Troubleshooting

If you encounter connection issues:

1. Ensure your Supabase instance is running on port 8000
2. Verify that the environment variables in the `.env` file are correct
3. Check the Supabase MCP server logs for specific error messages
4. Make sure the virtual environment is activated when running the server manually

## Manual Start Command

To start the server manually:

```bash
cd /Users/kinglerbercy/Documents/Cline/MCP/supabase-mcp-server
source .venv/bin/activate
python -m supabase_mcp.main
``` 