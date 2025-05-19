# MCP Server Fix and Test Plan

## Overview

This document outlines the plan to fix the 9 non-functioning MCP servers and implement comprehensive testing for all servers in the project.

## Servers with Issues

### 1. Environment Variable Issues (2)

- **shopify-mcp-server** - Missing SHOPIFY_ACCESS_TOKEN
- **sendgrid-mcp** - Missing SENDGRID_API_KEY

### 2. Module/Build Issues (3)

- **supabase-server** - ES Module import issue with pg
- **qdrant-server** - ES Module syntax issue
- **analysis-mcp-server** - ES Module import issue with pg

### 3. Build/Entry Point Missing (3)

- **supabase-mcp-server** - No build directory
- **state-mcp-server** - No build directory
- **mcp-server-firecrawl** - No index.js entry point

### 4. Not Found (1)

- **neo4j-mcp** - Directory not found

## Fix Implementation

### 1. Environment Variable Fixes

#### shopify-mcp-server

- The server already has a .env file with SHOPIFY_ACCESS_TOKEN and MYSHOPIFY_DOMAIN
- No additional fixes needed for the server itself
- Client configurations need to include these environment variables

#### sendgrid-mcp

- Created a .env file with placeholder for SENDGRID_API_KEY
- User needs to replace with actual API key from SendGrid

### 2. Module Import Fixes

#### supabase-server

- Fixed ES Module import issue with pg by changing:

  ```javascript
  import { Client } from 'pg';
  ```
  to:
  ```javascript
  import pkg from 'pg';
  const { Client } = pkg;
  ```

#### qdrant-server

- Changed package.json type from "commonjs" to "module" to fix ES module imports

#### analysis-mcp-server

- Fixed ES Module import issue with pg in DBAnalyzer.js using the same approach as supabase-server

### 3. Build/Entry Point Fixes

Created a shell script `fix_server_builds.sh` that:

- Builds state-mcp-server using npm run build
- Builds mcp-server-firecrawl using npm run build
- Sets up supabase-mcp-server Python environment and installs dependencies

### 4. Missing Directory

- neo4j-mcp is missing and needs to be cloned from its repository

## Testing Framework

Created a comprehensive testing framework in `server_test_framework.py` that:

1. **Provides a base test infrastructure** for all MCP servers
2. **Supports server-specific tests** in the tests/ directory
3. **Handles different server types** (Node.js and Python)
4. **Manages environment variables** for testing
5. **Generates detailed test reports**

### Server-Specific Tests

Created test files for:

- **supabase-mcp-server** - Tests environment, Supabase connection, and Python package
- **shopify-mcp-server** - Tests environment variables, dependencies, and build output

## Usage Instructions

### Fixing Servers

1. **Fix Module Import Issues**:

   ```bash
   # The fixes have been applied directly to the files
   ```

2. **Fix Build/Entry Point Issues**:

   ```bash
   chmod +x fix_server_builds.sh
   ./fix_server_builds.sh
   ```

3. **Fix Environment Variables**:
   - Edit sendgrid-mcp/.env to add your SendGrid API key
   - Ensure shopify-mcp-server/.env has valid credentials

### Running Tests

1. **Test a specific server**:

   ```bash
   ./server_test_framework.py --server supabase-mcp-server
   ```

2. **Test a category of servers**:

   ```bash
   ./server_test_framework.py --category "Database Servers"
   ```

3. **Test all servers**:

   ```bash
   ./server_test_framework.py --all
   ```

4. **List available servers**:

   ```bash
   ./server_test_framework.py --list
   ```

## Next Steps

1. **Run the fix script** to build missing components
2. **Update environment variables** with actual API keys
3. **Run the test framework** to verify fixes
4. **Add more server-specific tests** for comprehensive coverage
5. **Update client configurations** to use the fixed servers 