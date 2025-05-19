# Orchestrator MCP Server

An MCP server that orchestrates work across a multi-agent system using BDI (Belief-Desire-Intention) principles.

## Overview

The Orchestrator MCP Server is designed to coordinate and manage distributed work across multiple AI agents. It implements a BDI (Belief-Desire-Intention) model for decision making:

- **Beliefs**: Current knowledge about agent capabilities, task requirements, and system state
- **Desires**: Goals the system wants to achieve (completing tasks efficiently)
- **Intentions**: Specific allocations of tasks to agents

## Features

- Register and manage agents with different capabilities
- Create and track tasks with priorities and requirements
- Automatically allocate tasks to appropriate agents
- Group agents into specialized pools
- Monitor task progress and agent status

## Installation

```bash
git clone https://github.com/yourusername/orchestrator-mcp.git
cd orchestrator-mcp
npm install
npm run build
```

## Available MCP Tools

The server exposes the following MCP tools:

### Agent Management

- `register_agent`: Register a new agent with capabilities
- `set_agent_status`: Update an agent's availability status
- `list_available_agents`: List agents that are currently available
- `create_agent_pool`: Create a pool of agents for specialized work

### Task Management

- `create_task`: Create a new task with requirements
- `assign_task`: Manually assign a task to a specific agent
- `auto_allocate_tasks`: Automatically match tasks to suitable agents
- `get_task_status`: Check the current status of a task

## Example Usage

```javascript
// Register a new agent
const result = await mcpClient.callTool("neo-orchestrator", "register_agent", {
  agent: {
    id: "agent-123",
    type: "developer",
    capabilities: ["javascript", "react", "typescript"],
    status: "available"
  }
});

// Create a new task
const taskResult = await mcpClient.callTool("neo-orchestrator", "create_task", {
  task: {
    id: "task-456",
    title: "Fix UI bug in login form",
    description: "The login form has alignment issues on mobile devices",
    requiredCapabilities: ["javascript", "react"],
    priority: 8,
    status: "pending"
  }
});

// Automatically allocate pending tasks to available agents
const allocations = await mcpClient.callTool("neo-orchestrator", "auto_allocate_tasks", {});
```

## Configuration

Configure the server by adding it to your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "neo-orchestrator": {
      "command": "node",
      "args": [
        "/path/to/orchestrator-mcp/dist/index.js"
      ],
      "env": {
        "LOG_LEVEL": "info",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## License

MIT
