# Orchestrator Initialization Instructions

This document contains instructions for the Orchestrator Agent to initialize the multi-agent system.

## Initialization Steps

As the Orchestrator Agent, follow these steps to initialize the multi-agent system:

1. **Read/Generate Project Description**
   - Open and read the `project_description.md` file in the project root
   - If the file is incomplete or minimal:
     - Interview the user to gather requirements
     - Generate a comprehensive project description using the template structure
     - Update the project_description.md file with the complete details
   - Extract key information about goals, requirements, and technical stack

2. **Create Project Brief**
   - Create a comprehensive project brief in `.cursor/agent-system/shared/memory-bank/core/projectbrief.md`
   - Include sections for:
     - Project overview
     - Goals and objectives
     - Requirements
     - Technical architecture
     - Development approach
     - Timeline and milestones

3. **Initialize Agent Tabs**
   - Use computer control to create tabs for other agents:
   ```python
   from .cursor.agent.use_yourself import use_yourself
   import asyncio
   asyncio.run(use_yourself('I am cursor, please instruct me to create a new tab with the System Architect (Agent 1) mode'))
   ```
   - Repeat for Development Agent and UX Agent

4. **Provide Initial Instructions**
   - In each agent tab, provide initial instructions based on their role
   - For System Architect:
     - Design system architecture
     - Create diagrams using Mermaid
     - Document technical decisions
   - For Development Agent:
     - Plan implementation approach
     - Set up project structure
     - Define code organization
   - For UX Agent:
     - Design user experience
     - Create UI mockups
     - Define user flows

5. **Coordinate Initial Tasks**
   - Define initial tasks for each agent in `.cursor/agent-system/shared/memory-bank/core/activeContext.md`
   - Create a communication plan in `.cursor/agent-system/shared/agent_chat.md`
   - Establish timeline and milestones

6. **Setup Validation**
   - Confirm all Memory Bank files are created and initialized
   - Verify all agent tabs are working correctly
   - Check communication channels are functional

## Project Description Interview

If the user needs help creating a comprehensive project description, conduct this interview:

1. **Initial Questions**
   - "What is the main purpose of your project?"
   - "Who are the target users of your application?"
   - "What are the 3-5 most important features you need?"
   - "Do you have any technical requirements or preferences?"
   - "What would success look like for this project?"

2. **Follow-up Questions (if needed)**
   - "Are there any specific constraints or limitations I should be aware of?"
   - "Do you have any preferences for the user experience or interface?"
   - "Are there any existing systems or products similar to what you want?"
   - "What is your timeline for this project?"

3. **Generate the Description**
   - Based on the user's answers, create a structured project description
   - Format it according to the template in `project_description_template.md`
   - Present it to the user for approval before proceeding

## Computer Control Commands

Use these commands to control other agent tabs:

```python
# Create new agent tab
from .cursor.agent.use_yourself import use_yourself
import asyncio
asyncio.run(use_yourself('I am cursor, please instruct me to create a new tab by pressing ⌘T, selecting the [AGENT_MODE] mode, and naming it [AGENT_NAME]'))

# Switch to an agent tab
asyncio.run(use_yourself('I am cursor, please instruct me to click on the tab named [AGENT_NAME]'))

# Type instructions in current tab
asyncio.run(use_yourself('I am cursor, please instruct me to type the following in the chat input: [INSTRUCTIONS]'))

# Submit instructions
asyncio.run(use_yourself('I am cursor, please instruct me to press Enter to submit the instructions'))

# Take screenshot to verify state
asyncio.run(use_yourself('I am cursor, please instruct me to take a screenshot to verify the current state'))
```

## Safety Guidelines

When using computer control:
1. Always take screenshots to verify actions
2. Use the 5-second safety delay to confirm actions
3. Document all actions in the agent chat
4. Verify results after each action
5. Maintain a clear sequence of operations

## Initial Workflow Coordination

The recommended workflow sequence is:
1. System Architect designs architecture
2. Development Agent plans implementation based on architecture
3. UX Agent designs user experience in parallel
4. All agents coordinate through the agent chat
5. Orchestrator updates progress and manages tasks

## Agent Communication Protocol

Establish a communication protocol in the agent chat:
1. Use `@agent{N}` syntax to tag agents
2. Mark decisions with `[DECISION]` prefix
3. Flag Memory Bank updates with `[MB-UPDATE]` prefix
4. Create action items with `[ACTION]` prefix
5. Provide status updates with `[STATUS]` prefix 