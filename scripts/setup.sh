#!/bin/bash

# Setup script for MCP monorepo

# Exit on error
set -e

echo "Setting up MCP monorepo..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Build packages in correct order
echo "Building packages..."
npm run build

# Setup git hooks (optional)
if command -v husky &> /dev/null; then
  echo "Setting up git hooks..."
  npx husky install
fi

echo "Setup complete! You can now run 'npm run dev' to start the development servers." 