#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { OrchestratorService } from './orchestrator.js';
import { AgentRegistry } from './agentRegistry.js';

// Define schema types
const AgentSchema = z.object({
  id: z.string().describe("Unique identifier for the agent"),
  type: z.string().describe("Type of agent (e.g., 'analyst', 'developer', 'designer')"),
  capabilities: z.array(z.string()).describe("List of capabilities this agent has"),
  status: z.enum(['available', 'busy', 'offline']).describe("Current status of the agent")
});

const TaskSchema = z.object({
  id: z.string().describe("Unique identifier for the task"),
  title: z.string().describe("Title of the task"),
  description: z.string().describe("Description of the task"),
  requiredCapabilities: z.array(z.string()).describe("Capabilities required to complete this task"),
  priority: z.number().min(1).max(10).describe("Priority of the task (1-10)"),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).describe("Current status of the task")
});

const AgentPoolSchema = z.object({
  name: z.string().describe("Name of the agent pool"),
  agentIds: z.array(z.string()).describe("List of agent IDs in this pool"),
  specialization: z.string().optional().describe("Optional specialization of this agent pool")
});

// Create services
const agentRegistry = new AgentRegistry();
const orchestratorService = new OrchestratorService(agentRegistry);

// Create the MCP server
const server = new McpServer({
  name: "neo-orchestrator",
  version: "1.0.0",
  description: "An MCP server that orchestrates work across a multi-agent system using BDI principles"
});

// Define tools for agent management
server.tool(
  "register_agent",
  "Register a new agent with the orchestrator",
  {
    agent: z.any().describe("Agent information to register")
  },
  async ({ agent }) => {
    try {
      const registeredAgent = await orchestratorService.registerAgent(agent);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Agent '${agent.id}' registered successfully`,
              agent: registeredAgent
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "set_agent_status",
  "Update the status of an agent",
  {
    agentId: z.string().describe("ID of the agent to update"),
    status: z.enum(["available", "busy", "offline"]).describe("New status for the agent")
  },
  async ({ agentId, status }) => {
    try {
      const updatedAgent = await orchestratorService.updateAgentStatus(
        agentId,
        status as 'available' | 'busy' | 'offline'
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Agent '${agentId}' status updated to '${status}'`,
              agent: updatedAgent
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

// Define tools for task management
server.tool(
  "create_task",
  "Create a new task for agents to work on",
  {
    task: z.any().describe("Task information to create")
  },
  async ({ task }) => {
    try {
      const createdTask = await orchestratorService.createTask(task);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Task '${task.id}' created successfully`,
              task: createdTask
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "assign_task",
  "Assign a task to a specific agent",
  {
    taskId: z.string().describe("ID of the task to assign"),
    agentId: z.string().describe("ID of the agent to assign the task to")
  },
  async ({ taskId, agentId }) => {
    try {
      const assignment = await orchestratorService.assignTask(taskId, agentId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Task '${taskId}' assigned to agent '${agentId}'`,
              assignment: assignment
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "auto_allocate_tasks",
  "Automatically allocate pending tasks to available agents based on capabilities and priorities",
  {
    maxAllocations: z.number().optional().describe("Maximum number of allocations to make (default: all pending tasks)")
  },
  async ({ maxAllocations }) => {
    try {
      const allocations = await orchestratorService.autoAllocateTasks(maxAllocations);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `${allocations.length} tasks allocated automatically`,
              allocations: allocations
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "create_agent_pool",
  "Create a pool of agents for specialized work",
  {
    pool: z.any().describe("Agent pool information")
  },
  async ({ pool }) => {
    try {
      const createdPool = await orchestratorService.createAgentPool(pool);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Agent pool '${pool.name}' created successfully`,
              pool: createdPool
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "get_task_status",
  "Get the current status of a task",
  {
    taskId: z.string().describe("ID of the task to check")
  },
  async ({ taskId }) => {
    try {
      const task = await orchestratorService.getTaskStatus(taskId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Task '${taskId}' status: ${task.status}`,
              task: task
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

server.tool(
  "list_available_agents",
  "List all agents that are currently available",
  {
    capability: z.string().optional().describe("Optional capability to filter agents by")
  },
  async ({ capability }) => {
    try {
      const agents = await orchestratorService.listAvailableAgents(capability);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Found ${agents.length} available agents`,
              agents: agents
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

// Start the server
console.log('Orchestrator MCP server starting...');
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log('Orchestrator MCP server running');
});

// Handle exit
process.on('SIGINT', async () => {
  console.log('Shutting down Orchestrator MCP server...');
  process.exit(0);
});
