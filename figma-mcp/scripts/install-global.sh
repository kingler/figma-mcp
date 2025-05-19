#!/bin/bash

# Navigate to the package directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Make the CLI executable
chmod +x ./bin/cli.js

# Install package globally
npm install -g .

# Verify installation
echo ""
echo "Figma MCP Unified Server installed globally!"
echo "You can now run the server using:"
echo "  figma-mcp-unified --figma-api-key YOUR_API_KEY"
echo "  figma-mcp --figma-api-key YOUR_API_KEY"
echo "" 