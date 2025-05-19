#!/bin/bash

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  else
    echo "Error: OPENAI_API_KEY is not set and .env file not found."
    echo "Please set the OPENAI_API_KEY environment variable or create a .env file."
    exit 1
  fi
fi

# Display available tools
echo "QA Engineer MCP Server - Tool Tester"
echo "==================================="
echo "Available tools to test:"
echo "0: generate_test_plan - Generate a comprehensive test plan with test cases"
echo "1: generate_tests - Generate and write test files for a project"
echo "2: generate_automation_script - Generate test automation script"
echo ""

# Get tool index from command line argument or prompt user
TOOL_INDEX=$1
if [ -z "$TOOL_INDEX" ]; then
  read -p "Enter tool number to test (0-2, default: 0): " TOOL_INDEX
  TOOL_INDEX=${TOOL_INDEX:-0}
fi

# Run the test script with the selected tool
echo "Running test with tool index: $TOOL_INDEX"
node test-qa-server.js $TOOL_INDEX
