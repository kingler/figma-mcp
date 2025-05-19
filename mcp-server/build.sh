#!/bin/bash

# Build script for MPC server

echo "Building MPC server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Type check
echo "Running type check..."
npm run type-check

# Lint
echo "Running linter..."
npm run lint

# Build
echo "Building project..."
npm run build

# Run tests
echo "Running tests..."
npm test

echo "Build complete!" 