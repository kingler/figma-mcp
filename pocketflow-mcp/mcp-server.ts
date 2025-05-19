#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

// Create the MCP server
const server = new McpServer({
  name: "PocketFlow MCP",
  version: "1.0.0",
});

interface CommandResult {
  stdout?: string;
  stderr?: string;
  error?: string;
}

// Helper function to execute Python commands
function executePythonCommand(command: string, callback: (result: CommandResult) => void): void {
  const pythonPath = process.env.PYTHON_PATH || "python";
  const fullCommand = `${pythonPath} -c "${command}"`;

  exec(fullCommand, { cwd: path.join(__dirname, "PocketFlow") }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python command: ${error.message}`);
      callback({ error: error.message, stderr });
      return;
    }

    if (stderr) {
      console.error(`Python command stderr: ${stderr}`);
    }

    callback({ stdout, stderr });
  });
}

// Define interfaces for our parameters
interface CreateNodeParams {
  nodeType: string;
  nodeName: string;
}

interface CreateFlowParams {
  flowType: string;
  flowName: string;
  startNodeName: string;
}

interface ExecuteFlowParams {
  code: string;
}

interface GetDocumentationParams {
  topic: string;
}

// Tool to create a new PocketFlow node
server.tool(
  "createNode",
  "Create a new PocketFlow node",
  {},
  async (params, extra) => {
    const { nodeType, nodeName } = params as unknown as CreateNodeParams;

    const pythonCode = `
import pocketflow

class ${nodeName}(pocketflow.${nodeType}):
    def prep(self, shared):
        # Preparation logic
        return {}

    def exec(self, prep_res):
        # Execution logic
        return "default"

    def post(self, shared, prep_res, exec_res):
        # Post-processing logic
        return "default"

print(f"Created {nodeType} named {nodeName}")
`;

    return new Promise((resolve) => {
      executePythonCommand(pythonCode, (result: CommandResult) => {
        if (result.error) {
          resolve({
            content: [
              {
                type: "text",
                text: `Error creating node: ${result.error}`,
              },
            ],
          });
        } else {
          resolve({
            content: [
              {
                type: "text",
                text: `Successfully created ${nodeType} named ${nodeName}:\n\n${result.stdout}`,
              },
            ],
          });
        }
      });
    });
  }
);

// Tool to create a new PocketFlow flow
server.tool(
  "createFlow",
  "Create a new PocketFlow flow",
  {},
  async (params, extra) => {
    const { flowType, flowName, startNodeName } = params as unknown as CreateFlowParams;

    const pythonCode = `
import pocketflow

# Assume ${startNodeName} is already defined
${startNodeName} = pocketflow.Node()

${flowName} = pocketflow.${flowType}(${startNodeName})

print(f"Created {flowType} named {flowName} with start node {startNodeName}")
`;

    return new Promise((resolve) => {
      executePythonCommand(pythonCode, (result: CommandResult) => {
        if (result.error) {
          resolve({
            content: [
              {
                type: "text",
                text: `Error creating flow: ${result.error}`,
              },
            ],
          });
        } else {
          resolve({
            content: [
              {
                type: "text",
                text: `Successfully created ${flowType} named ${flowName}:\n\n${result.stdout}`,
              },
            ],
          });
        }
      });
    });
  }
);

// Tool to execute a PocketFlow node or flow
server.tool(
  "executeFlow",
  "Execute a PocketFlow node or flow",
  {},
  async (params, extra) => {
    const { code } = params as unknown as ExecuteFlowParams;

    return new Promise((resolve) => {
      executePythonCommand(code, (result: CommandResult) => {
        if (result.error) {
          resolve({
            content: [
              {
                type: "text",
                text: `Error executing code: ${result.error}`,
              },
            ],
          });
        } else {
          resolve({
            content: [
              {
                type: "text",
                text: `Execution result:\n\n${result.stdout}`,
              },
            ],
          });
        }
      });
    });
  }
);

// Tool to get PocketFlow documentation
server.tool(
  "getDocumentation",
  "Get PocketFlow documentation",
  {},
  async (params, extra) => {
    const { topic } = params as unknown as GetDocumentationParams;

    let documentation = "";

    switch (topic) {
      case "overview":
        documentation = `
# PocketFlow Overview

PocketFlow is a minimalist LLM framework in just 100 lines of code. It provides:

- Lightweight: Just 100 lines. Zero bloat, zero dependencies, zero vendor lock-in.
- Expressive: Everything you love—Agents, Workflow, RAG, and more.
- Agentic Coding: Let AI Agents build Agents—10x productivity boost!
`;
        break;
      case "nodes":
        documentation = `
# PocketFlow Nodes

PocketFlow provides several types of nodes:

- Node: Basic node with retry capability
- BatchNode: Process multiple items in sequence
- AsyncNode: Asynchronous node
- AsyncBatchNode: Process multiple items asynchronously in sequence
- AsyncParallelBatchNode: Process multiple items asynchronously in parallel
`;
        break;
      case "flows":
        documentation = `
# PocketFlow Flows

PocketFlow provides several types of flows:

- Flow: Basic flow
- BatchFlow: Process multiple items in sequence
- AsyncFlow: Asynchronous flow
- AsyncBatchFlow: Process multiple items asynchronously in sequence
- AsyncParallelBatchFlow: Process multiple items asynchronously in parallel
`;
        break;
      case "examples":
        documentation = `
# PocketFlow Examples

## Basic Node Example

\`\`\`python
import pocketflow

class MyNode(pocketflow.Node):
    def prep(self, shared):
        return {"message": "Hello, World!"}

    def exec(self, prep_res):
        print(prep_res["message"])
        return "default"

    def post(self, shared, prep_res, exec_res):
        return "default"

node = MyNode()
node.run({})
\`\`\`

## Basic Flow Example

\`\`\`python
import pocketflow

class NodeA(pocketflow.Node):
    def prep(self, shared):
        return {"message": "Hello from NodeA"}

    def exec(self, prep_res):
        print(prep_res["message"])
        return "default"

    def post(self, shared, prep_res, exec_res):
        return "default"

class NodeB(pocketflow.Node):
    def prep(self, shared):
        return {"message": "Hello from NodeB"}

    def exec(self, prep_res):
        print(prep_res["message"])
        return "default"

    def post(self, shared, prep_res, exec_res):
        return "default"

nodeA = NodeA()
nodeB = NodeB()

# Connect nodes
nodeA >> nodeB

# Create flow
flow = pocketflow.Flow(nodeA)
flow.run({})
\`\`\`
`;
        break;
      default:
        documentation = "Documentation topic not found.";
    }

    return {
      content: [
        {
          type: "text",
          text: documentation,
        },
      ],
    };
  }
);

// Start receiving messages on stdio
(async () => {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to initialize MCP server:", error);
    process.exit(1);
  }
})();
