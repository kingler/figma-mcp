# Agent Bootstrap Protocol

## Overview
This document provides the initial bootstrap protocol for agents joining the Multi-Agent Memory System. For a comprehensive understanding of the system, refer to the [Executive Summary](.cursor/agent-system/docs/EXECUTIVE_SUMMARY.md).

## Initial Setup
1. Read this file first
2. Review the [Executive Summary](.cursor/agent-system/docs/EXECUTIVE_SUMMARY.md) for system overview
3. Check the [Role Registry](.cursor/agent-system/shared/role_registry.md) to understand your role and responsibilities
4. Review the [SDLC Role Registry](.cursor/agent-system/shared/sdlc_role_registry.md) for comprehensive SDLC roles
5. Navigate to `rules/agent{N}_rules.md` based on your agent number
6. Initialize your workspace in `.cursor/agent-system/workspace/agent{N}/`
7. Connect to the shared memory system
8. Register your profile in the [Agent Directory](.cursor/agent-system/shared/agent_directory.md)
9. Register in the appropriate communication channels

## Directory Structure
```
.cursor/agent-system/
├── shared/                     # Shared resources
│   ├── communication/          # Communication channels
│   │   ├── global_chat.md      # Global communication
│   │   ├── teams/              # Team-based channels
│   │   ├── topics/             # Topic-based threads
│   │   └── direct/             # Direct agent communication
│   ├── agent_directory.md      # Agent profiles and capabilities
│   ├── role_registry.md        # Role definitions and responsibilities
│   ├── sdlc_role_registry.md   # Comprehensive SDLC roles
│   ├── conflict_resolution.md  # Conflict resolution protocols
│   └── memory-bank/            # Memory Bank structure
│       ├── core/               # Core Memory Bank files
│       │   ├── projectbrief.md # Foundation document
│       │   ├── productContext.md # Product context
│       │   ├── activeContext.md # Current focus
│       │   ├── systemPatterns.md # System architecture
│       │   ├── techContext.md  # Technical context
│       │   ├── progress.md     # Implementation status
│       │   └── codeContext.md  # Code-documentation mapping
│       ├── context/            # Additional context files
│       └── .clinerules         # Project intelligence
├── rules/                      # Agent rules
├── workspace/                  # Agent workspaces
├── templates/                  # Documentation templates
├── docs/                       # System documentation
└── scripts/                    # Initialization scripts
```

## Agent Custom Instructions

Each agent in the Multi-Agent Memory System has a specialized role with specific capabilities. The custom instruction files provide detailed guidance for each agent's role, responsibilities, and communication protocols. These files should be added to each agent's system prompt in their respective VS Code extensions.

### Available Custom Instructions

1. **Base Agent Instructions** (`custom_instruction/base_agent_instructions_template.md`)
   - Template for creating new agent instructions
   - Contains common sections and protocols for all agents

2. **Agent-Specific Instructions**
   - **Composer** (`custom_instruction/composer_custom_instructions.md`)
     - Specializes in documentation access and knowledge retrieval
   - **Augment** (`custom_instruction/augment_custom_instructions.md`)
     - Specializes in enhancing and extending existing code and documentation
   - **Kudo (QODO)** (`custom_instruction/kudo_custom_instructions.md`)
     - Specializes in quality, testing, and validation
   - **Cline** (`custom_instruction/cline_custom_instructions.md`)
     - Specializes in software development and implementation
   - **Roo Code** (`custom_instruction/roo_code_custom_instructions.md`)
     - Specializes in code generation and transformation

3. **VS Code TabView Messaging** (`custom_instruction/vscode_tabview_messaging.md`)
   - Provides implementation details for inter-agent communication using VS Code's TabView to TabView messaging feature
   - Includes message protocols, examples, and integration with the Memory Bank

### Using Custom Instructions

1. Identify your agent role (Composer, Augment, Kudo, Cline, or Roo Code)
2. Add the corresponding custom instruction file to your system prompt in your VS Code extension
3. Follow the instructions in the file to initialize your role in the system
4. Use the VS Code TabView Messaging feature to communicate with other agents

## Core Principles
1. Clear communication through structured channels
2. Structured knowledge sharing via the Memory Bank
3. Consistent documentation with versioning
4. Role-based responsibilities and authority boundaries
5. Collaborative decision-making with clear documentation
6. Regular status updates and progress tracking

## Role Registry vs. SDLC Role Registry

As an agent in the Multi-Agent Memory System, it's important to understand the difference between the two role registries:

### Role Registry
The [Role Registry](.cursor/agent-system/shared/role_registry.md) defines the core agent roles in our current system:
- System Architect (Agent 1)
- Development Agent (Agent 2)
- UX Agent (Agent 3)
- Orchestrator (Agent 4)

It includes primary and secondary responsibilities, domain expertise areas, authority boundaries, relationships with other roles, and evolution paths for these core roles.

### SDLC Role Registry
The [SDLC Role Registry](.cursor/agent-system/shared/sdlc_role_registry.md) is a more comprehensive registry that defines all roles involved in the entire Software Development Life Cycle (SDLC). It expands beyond our core agent roles to include the full spectrum of roles in software development, such as:
- Planning and Requirements Phase Roles (Product Owner, Requirements Analyst, etc.)
- Design Phase Roles (UX Designer, UI Designer, etc.)
- Development Phase Roles (Frontend Developer, Backend Developer, etc.)
- Testing and Quality Assurance Roles (QA Engineer, Automation Engineer, etc.)
- Deployment and Operations Roles (DevOps Engineer, SRE, etc.)
- Support and Maintenance Roles (Technical Support Engineer, Technical Writer, etc.)
- Cross-Functional Roles (Data Scientist, Accessibility Specialist, etc.)

The SDLC Role Registry enables our system to scale to support enterprise-level software development with specialized agents for each aspect of the SDLC. It provides a comprehensive framework for role definitions, responsibilities, and interactions that persists throughout the entire software development lifecycle.

**Important**: All agents should be familiar with both registries. Even if your current role is defined in the Role Registry, understanding the broader SDLC Role Registry will help you collaborate effectively with specialized agents as the system scales.

## Onboarding Process
1. **Preparation Phase**
   - Review your role in the [Role Registry](.cursor/agent-system/shared/role_registry.md)
   - Understand your responsibilities and authority boundaries
   - Identify your primary and secondary Memory Bank files
   - Familiarize yourself with the [SDLC Role Registry](.cursor/agent-system/shared/sdlc_role_registry.md)

2. **Initialization Phase**
   - Read your role-specific rules
   - Initialize your workspace
   - Set up your development environment
   - Register your profile in the [Agent Directory](.cursor/agent-system/shared/agent_directory.md)

3. **Integration Phase**
   - Join the appropriate communication channels
   - Introduce yourself in the global chat
   - Connect with your buddy agent (if assigned)
   - Review the current project status in `progress.md`

4. **Orientation Phase**
   - Read the `projectbrief.md` for project scope
   - Review `activeContext.md` for current focus
   - Understand the system architecture in `systemPatterns.md`
   - Review the technical context in `techContext.md`
   - Examine the code-context mapping in `codeContext.md`

5. **Activation Phase**
   - Complete the onboarding checklist
   - Announce your active status
   - Begin contributing to your assigned responsibilities

## Key Protocols

### Memory Bank Update Protocol
1. Announce update intention in the appropriate communication channel
2. Specify files to be modified
3. Make changes to owned Memory Bank files
4. Add version header with changelog
5. Cross-reference with other Memory Bank files
6. Request review from relevant agents
7. Notify completion in the appropriate communication channel

### Context Reset Protocol
1. Read `projectbrief.md` for project scope
2. Read `activeContext.md` for current focus
3. Review owned Memory Bank files
4. Check recent entries in communication channels
5. Review `.clinerules` for project-specific patterns
6. Validate understanding through cross-references

### Communication Protocol
- Use structured message formats in communication channels
- Tag other agents using @agent{N} syntax
- Mark decisions with [DECISION] prefix
- Flag Memory Bank updates with [MB-UPDATE] prefix
- Use appropriate channels based on message scope and audience
- Follow the hierarchical communication structure

### Conflict Resolution Protocol
1. Identify conflict type and severity
2. Follow the escalation path based on severity
3. Document the resolution process
4. Update affected Memory Bank files
5. Notify stakeholders of the resolution

## Getting Started Checklist
- [ ] Read the Agent Bootstrap Protocol
- [ ] Review the Executive Summary
- [ ] Check the Role Registry for your role
- [ ] Review the SDLC Role Registry for comprehensive role definitions
- [ ] Read your role-specific rules
- [ ] Initialize your workspace
- [ ] Register in the Agent Directory
- [ ] Join appropriate communication channels
- [ ] Review core Memory Bank files
- [ ] Complete the onboarding process
- [ ] Announce your active status
