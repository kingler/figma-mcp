# Tools Directory Overview

This directory is a central component of the Neo_v0 SDLC Orchestration system. It houses a diverse collection of tools implemented as TypeScript modules (and some Python modules at the root level) that enable our multi-agent system to perform a wide variety of tasks via the Model Context Protocol (MCP).

The tools are broadly categorized into **Agent Tools** and **Function/Task Tools**. There are also some duplicate implementations of functionality—one as a standalone file and another as part of a sub-project (directory). This README provides an organized overview, identifies the duplicates, and explains how agents leverage these tools.

---

## Directory Structure

The directory is organized as follows:

- **Agent Tools**: Modules that represent high-level agents responsible for orchestration, design decisions, reasoning, testing, and other domain-specific roles.
- **Function/Task Tools**: Modules that provide specific functionalities such as database interactions, web scraping, file generation, and utility services.
- **Duplicate Implementations**: Some functionalities exist both as standalone files and within subdirectories. These duplicates should be reviewed for consolidation to ensure a clean, maintainable architecture.

---

## Agent Tools

These tools encapsulate the roles and responsibilities of agents within the system. They typically handle high-level decision making, workflow orchestration, and domain-specific tasks.

- **neoOrchestrator.ts**: Acts as the central orchestrator for the multi-agent system, coordinating tasks and tool invocations across agents.
- **componentLayoutAgent.ts**: Responsible for generating and managing UI component layouts.
- **designSystemAgent.ts**: Manages design systems, style guides, and standard UI elements.
- **reasoningAgent.ts**: Executes advanced reasoning routines, breaking down complex problems into manageable steps.
- **testingAgent.ts**: Orchestrates testing tasks and quality assurance processes.
- **uiDesigner.ts**: Focuses on the design and optimization of user interface elements.
- **uxDesigner.ts**: Addresses user experience design challenges and improvements.
- **productOwner.ts**: Simulates product management decisions, prioritizing features and tasks.
- **uxResearcher.ts**: Conducts research to inform user experience improvements.

---

## Function/Task Tools

These modules provide targeted functionalities to support the tasks required by the agents, including integrations with external systems, automated processes, and utility operations.

- **braveSearch.ts**: Integrates Brave Search capabilities for retrieving online information.
- **sequentialThinking.ts**: Implements sequential reasoning to help agents break down tasks step by step.
- **redis.ts**: Provides connectivity and operations with Redis databases.
- **puppeteer.ts**: Enables browser automation for web scraping and dynamic interactions.
- **postgres.ts**: Facilitates interactions with PostgreSQL databases.
- **memory.ts**: Manages in-memory data storage for context and short-term caching.
- **gdrive.ts**: Connects with Google Drive to manage and retrieve files.
- **techStackManager.ts**: Assists in managing technology stacks and related configurations.
- **rootFileGenerator.ts**: Generates root file structures for initializing projects.
- **svgComponentGenerator.ts**: Automates the generation of SVG components for UI design.
- **wireframeGenerator.ts**: Creates wireframe prototypes to visualize UI layouts.
- **uxWorkflowManager.ts**: Coordinates workflows and processes related to user experience design.
- **designTokenGenerator.ts**: Produces design tokens to ensure consistency across UI elements.
- **codeQuality.ts**: Analyzes and reports on code quality metrics within the system.
- **projectInit.ts**: Automates project initialization and scaffolding tasks.
- **morpheusValidator.ts**: Validates outputs or structures to ensure they meet expected standards.
- **auditProcessor.ts**: Processes audit logs and system events for compliance and monitoring.
- **vectorDb.ts**: Provides tools for interacting with vector databases.
- **knowledgeGraph.ts**: Manages and queries knowledge graphs built from project data.
- **contextManager.ts**: Handles context storage and propagation across agent interactions.
- **docGenerator.ts**: Automates the creation of documentation based on system data.
- **everything.ts**: A catch-all module for miscellaneous or experimental tasks.

---

## Consolidation of Duplicate Implementations

All duplicate implementations present in separate directories have been consolidated into the primary standalone files. Only one unified implementation exists for each of the following functionalities:

- **Brave Search** (implemented in `braveSearch.ts`)
- **Everything** (implemented in `everything.ts`)
- **Sequential Thinking** (implemented in `sequentialThinking.ts`)
- **PostgreSQL Integration** (implemented in `postgres.ts`)
- **Redis Integration** (implemented in `redis.ts`)
- **Puppeteer Automation** (implemented in `puppeteer.ts`)
- **Google Drive Integration** (implemented in `gdrive.ts`)
- **Memory Management** (implemented in `memory.ts`)

This consolidation ensures that the correct logic is maintained while unnecessary functions have been removed, leading to a cleaner and more maintainable architecture.

---

## How Agents Use These Tools

The multi-agent system leverages these tools through the Model Context Protocol (MCP). Here's how the agents interact with the tools:

- **Orchestration & Delegation**: The `neoOrchestrator.ts` acts as the central command, delegating tasks to both agent tools and function/task tools based on the current workflow.
- **Role-Specific Automation**: Agent tools like `reasoningAgent.ts`, `uiDesigner.ts`, and `uxResearcher.ts` automatically invoke function tools (e.g., `sequentialThinking.ts`, `svgComponentGenerator.ts`, `wireframeGenerator.ts`) to complete specific tasks.
- **External System Integrations**: Tools such as `postgres.ts`, `redis.ts`, and `gdrive.ts` enable agents to interact with external systems, facilitating data retrieval, storage, and processing.
- **Error Handling & Logging**: Following MCP best practices, each tool is designed with error handling, progress reporting, and logging to ensure robust operation during automated workflows.

---

## Contributing & Best Practices

- **Clear Documentation**: Each tool is documented with descriptive names and purpose statements. Maintain this clarity when adding or updating tools.
- **Modular Design**: Keep tools focused and atomic. Each tool should perform one primary task to simplify integration and debugging.
- **Follow MCP Guidelines**: Ensure proper error handling, input validation, and logging as per the Model Context Protocol recommendations.
- **Review Duplicates**: Regularly review the existing duplicate projects and plan for consolidation to improve maintainability.

---

## Summary

This tools directory is a pivotal component of the Neo_v0 SDLC Orchestration system. It encapsulates all the high-level agent tools and supporting function/task tools that drive the multi-agent operations via the Model Context Protocol. As the project evolves, regular maintenance and consolidation of duplicate implementations will be essential for ensuring a clean and efficient architecture.

For further details on the Model Context Protocol and best practices for tool implementation, please refer to the MCP documentation:
- [MCP Full Documentation](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Concepts: Tools](https://modelcontextprotocol.io/docs/concepts/tools) 