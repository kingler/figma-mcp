# Multi-Agent Context Sharing Memory System: Cursor Tab Agents

A starter framework for building multi-agent systems using Cursor's native features. This system enables multiple AI agents to collaborate effectively by maintaining shared context and continuity of information across sessions.

## Overview

The Multi-Agent Memory System (MAMS) leverages Cursor's Chat Tabs and Custom Modes to create a powerful collaboration framework with:

1. **Specialized Agent Roles** - Four specialized agents working in dedicated tabs
2. **Memory Bank System** - Structured documentation for shared context
3. **Cursor Rules Integration** - Role-specific behavior based on file patterns
4. **Orchestrator Computer Control** - Workflow automation across agents

This approach provides superior code-based context maintenance for LLMs through:
- Structured, hierarchical documentation
- Explicit code-context mapping
- Role-based specialization
- Clear communication protocols
- Comprehensive context reset handling

## Getting Started

### Prerequisites

- [Cursor](https://cursor.sh/) (latest version)
- Understand the Cursor Chat Tabs (⌘T) and Custom Modes features

### Initialization Process

There are multiple ways to initialize the multi-agent system:

#### Option 1: Simple Initialization (Recommended)

1. Clone this repository to start a new multi-agent project:

```bash
git clone https://github.com/yourusername/mas-agent-init.git your-project-name
cd your-project-name
```

2. Run the convenience script:

```bash
node init-agents.js
# On Unix/Linux/macOS with execute permissions:
# ./init-agents.js
```

This is the simplest way to start the initialization process.

#### Option 2: Direct Initialization

If you prefer to run the initialization script directly:

```bash
node .cursor/agent-system/scripts/init_agents.js
```

This script will:
- Ask if this is a new project or existing one
- For new projects: Create project directory and structure
- For existing projects: Set up multi-agent system in current directory
- Launch Cursor with the appropriate configuration
- Guide you through the initial setup

#### Option 3: Clean Project Setup

If you prefer to have a project with minimal files in the root directory:

```bash
git clone https://github.com/yourusername/mas-agent-init.git
cd mas-agent-init
node .cursor/agent-system/scripts/setup.js
```

The setup script will:
- Create a new project directory
- Copy only the necessary files (.cursor directory and template)
- Create a minimal project_description.md file
- Add a simple init script (not package.json)
- Keep all agent system files within the .cursor directory

This gives you a clean project structure with only essential files in the root directory.

#### Option 4: Manual Initialization

1. Clone this repository or open your existing project in Cursor:

```bash
git clone https://github.com/yourusername/mas-agent-init.git your-project-name
cd your-project-name
```

2. Open the project in Cursor and set up your agent tabs:
   - Press ⌘T (or Ctrl+T on Windows/Linux) to create a new tab
   - Select "Orchestrator (Agent 4)" from the custom modes dropdown
   - Enter the command "start mas-agents" to trigger initialization
   - The Orchestrator will use computer control to create tabs for other agents
   - Follow the Orchestrator's instructions to complete the setup

#### Option 5: Quick Start for Experienced Users

If you're familiar with the system, you can manually create the agent tabs:

1. Open the project in Cursor
2. Press ⌘T to create a tab for Orchestrator (Agent 4)
3. Press ⌘T to create a tab for System Architect (Agent 1)
4. Press ⌘T to create a tab for Development Agent (Agent 2)
5. Press ⌘T to create a tab for UX Agent (Agent 3)
6. Use the Orchestrator to initialize the Memory Bank structure
7. Begin development with the multi-agent system

### Project Description

For all initialization methods, you'll need a project description. You have three options:

1. **Manual Creation**: Complete the `project_description.md` file using the template structure.

2. **Orchestrator-Assisted**: Start with a minimal description and let the Orchestrator help you complete it through an interactive interview process:
   - The Orchestrator will ask you key questions about your project
   - Based on your answers, it will generate a comprehensive description
   - You can review and approve the generated description

3. **Template Reference**: Use the included `project_description_template.md` as a reference for the recommended structure and details to include.

A good project description should include:
- Project goals and objectives
- Key features and functionality
- Technical requirements and preferences
- User experience considerations
- Any specific constraints or preferences

### Human-in-the-Loop Workflow

The Multi-Agent Memory System follows a human-in-the-loop workflow:

1. **Project Description Approval**
   - After initialization, the system generates a detailed project brief based on your description
   - You review and approve the project brief or request changes
   - Once approved, the multi-agent system begins work

2. **Milestone Approvals**
   - The system works autonomously, with agents collaborating through the Memory Bank
   - You are only consulted for milestone approvals
   - Agents handle all implementation details without requiring human intervention for tasks

3. **Progress Monitoring**
   - You can monitor progress through the Memory Bank files
   - The `progress.md` file provides an overview of completed work and next steps
   - The `activeContext.md` file shows the current focus of the system

## System Structure

The Multi-Agent System uses a clean, consolidated file structure to minimize clutter in your project's root directory:

```
project-root/               # Your project's root directory
├── project_description.md  # The only project-specific file in root
├── project_description_template.md  # Template for project descriptions
├── .cursor/                # Cursor configuration (standard Cursor directory)
│   ├── modes.json         # Custom modes configuration
│   ├── rules/             # Cursor rules for agent behavior
│   │   ├── agent1-system-architect.mdc   # System Architect rules
│   │   ├── agent2-development-agent.mdc  # Development Agent rules
│   │   ├── agent3-ux-agent.mdc           # UX Agent rules
│   │   ├── agent4-orchestrator.mdc       # Orchestrator rules
│   │   ├── memory-bank-protocol.mdc      # Memory Bank protocols
│   │   ├── communication-protocol.mdc    # Communication protocols
│   │   └── orchestrator-starter.mdc      # Startup orchestration
│   ├── agent/             # Computer use capabilities
│   │   ├── use_yourself.py               # Computer control script
│   │   └── get_cordinates.py             # Screen coordinate utility
│   └── agent-system/      # All agent-related files consolidated here
│       ├── shared/        # Shared resources
│       │   ├── communication/            # Communication channels
│       │   ├── agent_chat.md             # Global communication
│       │   └── memory-bank/              # Memory Bank structure
│       │       ├── core/                 # Core Memory Bank files
│       │       │   ├── projectbrief.md   # Foundation document
│       │       │   ├── productContext.md # Product context
│       │       │   ├── activeContext.md  # Current focus
│       │       │   ├── systemPatterns.md # System architecture
│       │       │   ├── techContext.md    # Technical context
│       │       │   ├── progress.md       # Implementation status
│       │       │   └── codeContext.md    # Code-documentation mapping
│       ├── rules/         # Agent-specific rules
│       ├── workspace/     # Agent workspaces
│       ├── templates/     # Documentation templates
│       └── scripts/       # Initialization scripts
```

This structure keeps your project organized with:
1. Only project-specific files in the root directory
2. All agent system files consolidated under `.cursor/agent-system/`
3. Standard Cursor configuration in the `.cursor/` directory
4. Clear separation between project code and agent infrastructure

## Core Components

### Memory Bank

The Memory Bank is a hierarchical documentation structure that serves as the central source of truth for the project:

1. **projectbrief.md** - Foundation document defining core requirements and goals
2. **productContext.md** - Why the project exists and how it should work
3. **activeContext.md** - Current work focus, recent changes, and next steps
4. **systemPatterns.md** - System architecture and key technical decisions
5. **techContext.md** - Technologies used and technical constraints
6. **progress.md** - Implementation status and known issues
7. **codeContext.md** - Explicit mapping between code and documentation

### Agent Roles

Each agent has specific responsibilities within the system:

1. **System Architect (Agent 1)** - Architecture and technical design specialist
   - Focus on system patterns and technical documentation
   - Primary owner of systemPatterns.md and techContext.md
   - Creates technical diagrams and documents architecture decisions

2. **Development Agent (Agent 2)** - Implementation specialist 
   - Focus on code quality, testing, and code-context mapping
   - Primary owner of codeContext.md
   - Implements features based on architectural decisions

3. **UX Agent (Agent 3)** - User experience specialist
   - Focus on interface design, usability, and product context
   - Primary owner of productContext.md
   - Creates user interfaces and documents user flows

4. **Orchestrator (Agent 4)** - Project coordinator and system controller
   - Focus on project management and team coordination
   - Primary owner of activeContext.md, progress.md, and projectbrief.md
   - Exclusive access to computer use capabilities for workflow automation

## Cursor Integration

The Multi-Agent Memory System fully integrates with Cursor's Chat Tabs and Custom Modes features for an enhanced multi-agent experience.

### Chat Tabs for Agent Separation

Each agent operates in its own dedicated tab, allowing for:
- Parallel agent conversations
- Independent context preservation
- Visual indication of awaiting input (orange dot)
- Clear separation of agent responsibilities

To create a new agent tab:
1. Press `⌘T` (or `Ctrl+T` on Windows/Linux)
2. Select the appropriate agent custom mode
3. Name the tab according to the agent role

### Custom Modes for Agent Roles

Four custom modes are configured for each agent role:

1. **System Architect (Agent 1)** - `Alt+1`
   - Architecture and technical design specialist
   - Focus on system patterns and technical documentation
   
2. **Development Agent (Agent 2)** - `Alt+2`
   - Implementation specialist
   - Focus on code quality, testing, and code-context mapping
   
3. **UX Agent (Agent 3)** - `Alt+3`
   - User experience specialist
   - Focus on interface design, usability, and product context
   
4. **Orchestrator (Agent 4)** - `Alt+4`
   - Project coordinator with exclusive computer use capabilities
   - Focus on project management and team coordination

### Cursor Rules Integration

The system leverages Cursor's Rules feature for role-specific behavior:

- File-specific rules automatically apply agent context
- Memory Bank protocols ensure consistent documentation
- Communication protocols standardize inter-agent messaging
- Computer use capabilities restricted to the Orchestrator

### Orchestrator as System Controller

The Orchestrator Agent (Agent 4) serves as the system controller with exclusive computer use capabilities:

1. **Computer Use Authority**
   - Only the Orchestrator can use `use_yourself.py` for computer interaction
   - Can approve other agents' suggestions by clicking UI elements
   - Can type instructions for other agents in their tabs
   - Can take screenshots to verify system state
   - Can navigate between components without human intervention

2. **Execution Flow**
   - Other agents make suggestions that require approval
   - Orchestrator reviews and approves changes
   - Orchestrator executes cross-agent workflows
   - Orchestrator documents all interactions in logs

3. **Implementation Details**
   - Uses the `use_yourself.py` script with explicit safety protocols
   - Follows strict formatting: `I am cursor, please instruct me to [task]`
   - Maintains 5-second safety delay for human verification
   - Uses screenshots for visual confirmation
   - Coordinates through the Memory Bank and agent chat

This design creates a secure, controlled environment where only the designated Orchestrator can perform actions that would normally require human intervention, enabling true automation across the multi-agent system while maintaining security boundaries.

## Quick Start Guide

To quickly set up and start using the Multi-Agent system:

1. **Open the Project in Cursor**
   - Ensure you have the latest version of Cursor installed
   - Open the project directory in Cursor

2. **Create Agent Tabs**
   - Press `⌘T` to create a new tab for System Architect
   - Select "System Architect (Agent 1)" from the Custom Modes dropdown
   - Repeat for Development Agent, UX Agent, and Orchestrator

3. **Initialize the Memory Bank**
   - In the Orchestrator tab, instruct the agent to initialize the Memory Bank
   - The Orchestrator will create the necessary directory structure
   - Initial files will be populated based on your project description

4. **Begin Development**
   - The System Architect will design the system architecture
   - The Development Agent will implement features
   - The UX Agent will design the user interface
   - The Orchestrator will coordinate all activities

5. **Monitor Progress**
   - Check `activeContext.md` for current focus
   - Review `progress.md` for implementation status
   - Review agent communications in `agent_chat.md`

## Key Protocols

### Agent Bootstrap Protocol

The Agent Bootstrap Protocol (`AGENT_BOOTSTRAP.md`) provides the initial bootstrap process for agents joining the system:

1. **Initial Setup**
   - Read the bootstrap file
   - Review the Executive Summary
   - Check the Role Registry
   - Navigate to agent-specific rules
   - Initialize workspace
   - Connect to shared memory system
   - Register in the Agent Directory
   - Join appropriate communication channels

### Memory Bank Update Protocol

1. Announce update intention in the appropriate communication channel
2. Specify files to be modified
3. Make changes to owned Memory Bank files
4. Add version header with changelog
5. Cross-reference with other Memory Bank files
6. Request review from relevant agents
7. Notify completion in the appropriate communication channel

### Context Reset Protocol

When an agent's context resets between sessions, they follow this protocol:

1. **Initial Orientation**
   - Read `projectbrief.md` and `activeContext.md`
   - Review agent-specific rules

2. **Role-Specific Context**
   - Read owned Memory Bank files
   - Review recent entries in communication channels
   - Check agent-specific `.clinerules`

3. **Task-Specific Context**
   - Read additional Memory Bank files based on the current task
   - Examine relevant workspace files

4. **Cross-Reference and Validation**
   - Verify alignment between documents
   - Validate understanding

5. **Context Confirmation**
   - Seek clarification if needed
   - Confirm readiness to proceed

## Examples and Use Cases

### Startup Project Initialization

Perfect for quickly bootstrapping a new project:
1. Create a project description
2. Let the agents generate initial structure and documentation
3. Review and iterate on the architecture
4. Begin implementation with clear documentation

### Existing Codebase Analysis

Efficiently analyze and document existing codebases:
1. Let agents explore the codebase
2. System Architect creates architecture documentation
3. Development Agent maps code to documentation
4. UX Agent documents user flows
5. Orchestrator creates a development roadmap

### Collaborative Development

Enable efficient collaboration between human developers:
1. Document architecture and decisions
2. Maintain shared understanding through Memory Bank
3. Track progress and next steps
4. Resolve conflicts through structured protocols

## Contributing

Contributions to the Multi-Agent Memory System are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Tutorial-Cursor Integration

Integration of Tutorial-Cursor's code operation capabilities into a multi-agent system.

## Overview

This project implements file operation capabilities from Tutorial-Cursor, including reading files, searching code, and listing directories, adapted to work within a multi-agent architecture.

## Features

- **File Operations**: Reading and parsing files with format detection
- **Code Modification**: Framework for analyzing and modifying code
- **Memory Bank**: Action history tracking across operations
- **Structured Response Parsing**: YAML-formatted LLM responses for tool selection
- **Agent Integration**: Connecting agents to file operation capabilities

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tutorial-cursor-integration.git
cd tutorial-cursor-integration

# Install dependencies
npm install
```

## Usage

```javascript
const tutorialCursor = require('./src/index');

// Initialize with default configuration
const api = tutorialCursor.initialize();

// Example: Read a file
const fileContent = await api.cursor.readFile('path/to/file.js');

// Example: Using the FileReader for more advanced operations
const FileReader = api.cursor.FileReader;
const reader = new FileReader({
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedExtensions: ['.json', '.js', '.ts'],
  parseFiles: true
});

// Read and automatically parse a JSON file
const jsonData = await reader.readFile('config.json');
console.log(jsonData); // Already parsed as JavaScript object
```

## Architecture

The integration follows a modular architecture with clear separation of concerns:

- **Cursor Operations** - Core file reading, listing, and searching capabilities
- **Agent Integration** - Connection points between agents and cursor operations
- **Memory Bank** - Action history tracking and context preservation
- **Response Parser** - Structured response handling for tool selection

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
src/
├── agents/         # Agent integration components
├── config/         # Configuration handling
├── cursor/         # Core cursor operations 
│   ├── fileReader.js  # File reading and parsing
│   ├── parsers.js     # Format-specific parsers
│   └── index.js       # Main cursor API
├── utils/          # Utility functions
└── index.js        # Main entry point

tests/
├── agents/         # Agent integration tests
├── cursor/         # Cursor operations tests
└── utils/          # Utility tests
```

## License

MIT
