# Task Routing Rules & Decision Logic

This document provides detailed guidance on how to analyze tasks and route them to the appropriate specialized agents in the Neo SDLC ecosystem. Effective routing ensures tasks are handled by the most qualified agents while maintaining workflow efficiency.

## Task Analysis Process

Before routing a task, perform the following analysis:

1. **Identify Task Type**:
   - Determine the primary category of work involved
   - Identify any secondary aspects that may require multiple agents
   - Consider the SDLC phase the task belongs to

2. **Assess Required Expertise**:
   - Match task requirements with specialized agent capabilities
   - Consider domain knowledge requirements
   - Evaluate technical skills needed

3. **Determine Complexity Level**:
   - Simple tasks (1-3): Can be handled by a single agent
   - Moderate tasks (4-7): May require coordination across 2-3 agents
   - Complex tasks (8-10): Require decomposition and multiple agent interactions

4. **Check Dependencies**:
   - Identify prerequisite tasks and their completion status
   - Determine any outputs needed from other tasks
   - Consider parallel execution possibilities

## Routing Decision Matrix

Use this decision matrix to route tasks to the appropriate agents:

| Task Focus Area               | Primary Agent       | Secondary Agent(s)           | Task Master Tool            |
|-------------------------------|---------------------|------------------------------|----------------------------|
| Requirements Gathering        | Business Analyst    | UX Researcher                | `add_task`                 |
| User Research                 | UX Researcher       | Business Analyst             | `add_task`                 |
| System Architecture           | Architect           | Security Specialist          | `add_task`                 |
| API Design                    | Architect           | Code Engineer                | `expand_task`              |
| Database Design               | Architect           | Code Engineer                | `expand_task`              |
| Technology Selection          | Architect           | Business Analyst             | `update_subtask`           |
| Frontend Implementation       | Code Engineer       | UX Researcher                | `expand_task`              |
| Backend Implementation        | Code Engineer       | Architect                    | `expand_task`              |
| Test Strategy                 | Test Agent          | Business Analyst             | `add_task`                 |
| Test Implementation           | Test Agent          | Code Engineer                | `expand_task`              |
| Performance Optimization      | Debug Agent         | Code Engineer                | `update_task`              |
| Security Assessment           | Security Specialist | Architect                    | `add_task`                 |
| Bug Troubleshooting           | Debug Agent         | Code Engineer                | `add_subtask`              |
| UX/UI Design                  | UX Researcher       | Code Engineer                | `expand_task`              |
| Documentation                 | Business Analyst    | Relevant technical agent     | `update_task`              |

## Routing Decision Criteria

For each specialized agent, consider these key factors when deciding to route tasks:

### Architect Agent

**Route to Architect when**:
- System structure or component organization needs to be defined
- Technology evaluation or selection is required
- Non-functional requirements must be addressed architecturally
- Integration patterns need to be established
- Significant technical decisions with long-term impact are needed

**Tasks requiring Architect participation**:
- Creating high-level system designs
- Selecting architectural patterns
- Evaluating technology options
- Defining system boundaries and interfaces
- Creating reference architectures
- Documenting architecture decisions (ADRs)

### Business Analyst Agent

**Route to Business Analyst when**:
- Business requirements need clarification or elaboration
- User stories or acceptance criteria must be developed
- Business processes need to be documented or analyzed
- Stakeholder needs must be captured and prioritized
- Product backlog management is needed

**Tasks requiring Business Analyst participation**:
- Requirements gathering and documentation
- User story creation and refinement
- Process flow documentation
- Acceptance criteria definition
- Feature prioritization
- ROI and business case development

### UX Researcher Agent

**Route to UX Researcher when**:
- User needs and behavior must be understood
- Interface design decisions are needed
- Usability evaluation is required
- User journeys or flows need to be mapped
- Information architecture needs definition

**Tasks requiring UX Researcher participation**:
- User research and interviews
- Persona development
- Wireframing and prototyping
- Usability testing
- User journey mapping
- Information architecture design

### Code Engineer Agent

**Route to Code Engineer when**:
- Implementation of features is required
- Code reviews are needed
- Technical debt assessment and refactoring is necessary
- Development standards need establishment
- Integration of components or services is required

**Tasks requiring Code Engineer participation**:
- Feature implementation
- Code refactoring
- Development environment setup
- Integration work
- Technical documentation
- Development standards creation

### Debug Agent

**Route to Debug Agent when**:
- System failures or anomalies need investigation
- Performance bottlenecks need identification
- Root cause analysis is required
- Error resolution strategies need development
- System behavior needs to be analyzed

**Tasks requiring Debug Agent participation**:
- Bug identification and diagnosis
- Performance profiling
- Root cause analysis
- Error pattern recognition
- Fix implementation guidance
- System monitoring setup

### Test Agent

**Route to Test Agent when**:
- Test strategy or plans need development
- Test cases need creation
- Automated testing frameworks need setup
- Quality criteria need definition
- Testing execution and reporting is required

**Tasks requiring Test Agent participation**:
- Test planning
- Test case development
- Test automation framework setup
- Integration testing
- Quality metrics definition
- Test execution and reporting

### Security Specialist Agent

**Route to Security Specialist when**:
- Security requirements need analysis
- Threat modeling is required
- Security controls need selection or design
- Compliance requirements must be addressed
- Security testing or assessment is needed

**Tasks requiring Security Specialist participation**:
- Security requirements definition
- Threat modeling
- Security architecture review
- Selection of security controls
- Compliance assessment
- Security testing

## Multi-Agent Coordination

Some tasks require coordination between multiple agents:

1. **Sequential Coordination**:
   - Pass outputs from one agent to another in sequence
   - Ensure clean handoffs with clear context
   - Example: Architect → Code Engineer → Test Agent

2. **Parallel Coordination**:
   - Have multiple agents work simultaneously on different aspects
   - Integrate outputs at defined coordination points
   - Example: Code Engineer and Test Agent working in parallel

3. **Consultative Coordination**:
   - Primary agent leads with secondary agents providing input
   - Maintain clear decision authority
   - Example: Business Analyst leads with UX Researcher input

## SPARC Framework Mapping

When working with the SPARC framework, route tasks according to this mapping:

1. **Specification**:
   - Primary: Business Analyst Agent
   - Secondary: UX Researcher Agent, Architect Agent
   - Focus: Requirements gathering, project goals, user needs

2. **Pseudocode**:
   - Primary: Code Engineer Agent
   - Secondary: Architect Agent
   - Focus: High-level implementation approach, logical structure

3. **Architecture**:
   - Primary: Architect Agent
   - Secondary: Security Specialist Agent, Code Engineer Agent
   - Focus: System design, technology selection, patterns

4. **Refinement**:
   - Primary: Varies (typically Code Engineer or Architect)
   - Secondary: Debug Agent, Test Agent
   - Focus: Optimization, improvements, revisions

5. **Completion**:
   - Primary: Orchestrator Agent
   - Secondary: All relevant agents
   - Focus: Integration, final documentation, delivery

## Routing Process Flow

Follow this process when routing tasks:

1. **Initial Assessment**:
   - Analyze task type and requirements
   - Identify primary agent based on decision matrix
   - Determine if secondary agents are needed

2. **Task Creation**:
   - Use `add_task` with appropriate details
   - Set priority and dependencies
   - Tag with relevant agent identifiers

3. **Delegation Command**:
   - Use the appropriate routing command trigger (e.g., `#route-to-architect`)
   - Include essential context and requirements
   - Set clear expectations and deliverables

4. **Tracking Setup**:
   - Monitor task status in Task Master
   - Set up notification points for task completion
   - Prepare for handoffs between agents

5. **Results Integration**:
   - Collect outputs from completed agent tasks
   - Synthesize and integrate results
   - Route to next agent as needed

## Common Routing Scenarios

### New Feature Development

1. Requirements → Business Analyst
2. User Experience → UX Researcher
3. Architecture → Architect
4. Implementation → Code Engineer
5. Testing → Test Agent

### Bug Resolution

1. Initial Assessment → Debug Agent
2. Root Cause Analysis → Debug Agent
3. Fix Implementation → Code Engineer
4. Verification → Test Agent

### Performance Optimization

1. Performance Analysis → Debug Agent
2. Architecture Review → Architect
3. Implementation Changes → Code Engineer
4. Verification → Test Agent

### Security Enhancement

1. Security Requirements → Security Specialist
2. Architecture Adjustments → Architect
3. Implementation → Code Engineer
4. Security Testing → Security Specialist

## Route Escalation Criteria

Escalate routing decisions to human stakeholders when:

- Task doesn't clearly fit any specialization
- Multiple agents claim or reject task ownership
- Task requires external business knowledge
- Critical decisions with significant business impact
- Unforeseen blockers or dependencies arise
- Specialized knowledge outside agent capabilities is required

## Routing Decision Documentation

For each routing decision, document:

- Task ID and description
- Selected primary and secondary agents
- Routing justification
- Expected outputs and acceptance criteria
- Dependencies and coordination requirements
- Escalation conditions (if any)

This documentation helps maintain transparency and provides a basis for future routing improvements. 