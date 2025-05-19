#!/bin/bash

# Script to start the development environment for MCP

# Exit on error
set -e

echo "Starting MCP development environment..."

# Run turborepo dev command
echo "Starting all services in development mode..."
npm run dev

# This script will continue to run until you press Ctrl+C 