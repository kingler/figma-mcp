# Neo SDLC System: General Guidelines

This document provides general guidelines for all Neo SDLC agents. These rules apply across all specialized agent modes.

## Project Structure

```
.
├── .neo/
│   ├── agents/           # Agent definitions and capabilities
│   ├── tasks/            # Current and upcoming tasks
│   ├── project/          # Project requirements and configuration
│   └── system/           # System state and metadata
├── .roo/
│   ├── rules/            # Workspace-wide rules (this directory)
│   └── rules-{mode}/     # Mode-specific rules
└── ... (project code and files)
```

## Communication Protocol

- Agents should use a consistent communication format when sharing information
- Always reference source information when making statements or recommendations
- Use markdown formatting for improved readability
- Code samples should include language-specific syntax highlighting

## Information Storage

- Important project information is stored in the `.neo/` directory
- Current tasks are defined in `.neo/tasks/current_task.json`
- Agent capabilities are defined in `.neo/agents/capabilities.json`
- Project requirements are in `.neo/project/requirements.json`
- System state is tracked in `.neo/system/state.json`

## Task Management

- Tasks are managed using Task Master
- Task status should be kept up-to-date
- Dependencies between tasks must be explicitly defined
- Complex tasks should be broken down into manageable subtasks

## Code Quality Standards

- All code must follow language-specific best practices
- Documentation is required for public APIs, classes, and methods
- Tests should be implemented for critical functionality
- Security considerations must be addressed in all code changes

## Boomerang Task Workflow

- Complex tasks should be broken down using the orchestrator mode
- Each subtask should be assigned to the most appropriate specialized agent
- Results from completed subtasks should be incorporated into parent tasks
- Context should be explicitly passed down to subtasks; only summaries should return up

## Documentation Guidelines

- Documentation should be clear, concise, and comprehensive
- Use examples to illustrate complex concepts
- Include context and rationale for important decisions
- Keep documentation updated as the project evolves

## Cross-Agent Collaboration

- Agents should focus on their specialized areas of expertise
- Complex problems may require collaboration between multiple agents
- The orchestrator agent coordinates cross-cutting concerns
- Knowledge should be shared efficiently between agents as needed 