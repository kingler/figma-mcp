# Agent Capability Mapping

This document maps specialized agent modes to their specific capabilities and task types. Use this as a reference when delegating subtasks.

## Core Agent Modes

### 💻 Code Engineer
- **Capabilities**: Writing code, implementing features, refactoring, optimization
- **Ideal for tasks involving**:
  - Implementation of defined features
  - Code refactoring and cleanup
  - Performance optimization
  - Bug fixing (implementation level)
  - Code integration
- **Example subtask message**: "Implement the user authentication service based on the design from the architect. Use JWT for token management and include user registration, login, and password reset functionality."

### 🏗️ Architect
- **Capabilities**: System design, architecture planning, pattern selection, technical decision-making
- **Ideal for tasks involving**:
  - High-level system design
  - Technology selection
  - Architecture pattern decisions
  - Scalability planning
  - Database schema design
- **Example subtask message**: "Design the system architecture for our e-commerce platform. Include service boundaries, communication patterns, database schema, and key technical decisions. Consider scalability requirements from the project requirements document."

### 🪲 Debug
- **Capabilities**: Problem diagnosis, debugging, error tracing, root cause analysis
- **Ideal for tasks involving**:
  - Identifying and fixing bugs
  - Troubleshooting errors
  - Performance bottleneck analysis
  - Issue reproduction and verification
  - Root cause analysis
- **Example subtask message**: "Investigate the login failure issue reported in the authentication service. The error occurs after successful credential validation but before token generation. Debug the issue, identify root cause, and propose a solution."

### ❓ Ask/Analysis
- **Capabilities**: Research, information gathering, requirement analysis, documentation
- **Ideal for tasks involving**:
  - Requirement clarification
  - Technology research
  - Documentation creation
  - Code analysis and understanding
  - Learning and knowledge accumulation
- **Example subtask message**: "Research available payment gateway APIs that would meet our requirements for the e-commerce platform. Compare options based on features, pricing, security, and integration complexity. Provide a summary with recommendations."

### 🧪 Test
- **Capabilities**: Test strategy, test case creation, quality verification
- **Ideal for tasks involving**:
  - Test planning
  - Test case development
  - Unit test creation
  - Integration test setup
  - Testing framework configuration
- **Example subtask message**: "Develop a comprehensive test strategy for the user authentication service. Include unit tests for all functions, integration tests for API endpoints, and security testing for the token management system."

### 📊 UX Researcher
- **Capabilities**: User experience design, UI mockups, usability testing
- **Ideal for tasks involving**:
  - User interface design
  - User experience planning
  - Usability testing
  - UI component creation
  - User flow mapping
- **Example subtask message**: "Design the user interface for the checkout process in our e-commerce platform. Focus on creating an intuitive, accessible flow that minimizes friction. Include mockups for desktop and mobile views."

### 📈 Business Analyst
- **Capabilities**: Business requirements, process analysis, stakeholder management
- **Ideal for tasks involving**:
  - Business requirement gathering
  - Process mapping
  - ROI analysis
  - Stakeholder communication
  - Feature prioritization
- **Example subtask message**: "Analyze the business requirements for the loyalty program feature. Identify key stakeholders, map the process flow, and determine success metrics. Provide recommendations for feature prioritization based on business impact."

## Task Type to Agent Mode Mapping

| Task Type | Primary Agent Mode | Secondary Agent Mode |
|-----------|-------------------|---------------------|
| System Design | 🏗️ Architect | 💻 Code Engineer |
| Feature Implementation | 💻 Code Engineer | 🏗️ Architect |
| Bug Fixing | 🪲 Debug | 💻 Code Engineer |
| Testing | 🧪 Test | 🪲 Debug |
| Documentation | ❓ Ask/Analysis | 📊 UX Researcher |
| UI/UX Design | 📊 UX Researcher | 🏗️ Architect |
| Requirements | 📈 Business Analyst | ❓ Ask/Analysis |
| Research | ❓ Ask/Analysis | 📈 Business Analyst |
| Performance Optimization | 💻 Code Engineer | 🪲 Debug |
| Security Implementation | 💻 Code Engineer | 🏗️ Architect |

## Decision Making Process

When determining which agent mode to use for a subtask:

1. Identify the primary nature of the task (design, implementation, debugging, etc.)
2. Consult the table above for the recommended agent mode
3. Consider task complexity and whether multiple aspects require different specializations
4. For complex tasks, consider breaking down further into multiple subtasks with different agent modes
5. When in doubt, choose the agent mode that best matches the core skill needed for the task 