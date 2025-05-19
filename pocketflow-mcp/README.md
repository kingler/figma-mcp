# PocketFlow MCP Server

This is an MCP (Model Context Protocol) server for PocketFlow, a minimalist LLM framework in just 100 lines of code.

## Features

- Create PocketFlow nodes and flows
- Execute PocketFlow code
- Get PocketFlow documentation

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the server: `npm run build`
4. Start the server: `npm start`

## Usage

The PocketFlow MCP server provides the following tools:

### createNode

Creates a new PocketFlow node.

Parameters:
- `nodeType`: Type of node to create (Node, BatchNode, AsyncNode, etc.)
- `nodeName`: Name of the node

### createFlow

Creates a new PocketFlow flow.

Parameters:
- `flowType`: Type of flow to create (Flow, BatchFlow, AsyncFlow, etc.)
- `flowName`: Name of the flow
- `startNodeName`: Name of the starting node

### executeFlow

Executes a PocketFlow node or flow.

Parameters:
- `code`: Python code to execute

### getDocumentation

Gets PocketFlow documentation.

Parameters:
- `topic`: Documentation topic (overview, nodes, flows, examples)

## Configuration

The PocketFlow MCP server can be configured using the following environment variables:

- `PYTHON_PATH`: Path to the Python executable (default: `python`)

## License

MIT
