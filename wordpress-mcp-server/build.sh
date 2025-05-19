#!/bin/bash

# Build and run the WordPress MCP server

# Change to the script directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the server
echo "Building the server..."
npm run build

echo ""
echo "Build complete!"
echo ""
echo "To use the WordPress MCP server with Cline:"
echo "1. Make sure your WordPress site is running"
echo "2. Update the WP_BASE_URL, WP_USERNAME, and WP_PASSWORD in the Cline MCP settings"
echo "3. Restart Cline to load the new MCP server"
echo ""
echo "You can now use the WordPress MCP server with Cline!"