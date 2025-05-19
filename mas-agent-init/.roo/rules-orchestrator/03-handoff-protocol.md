# Agent Handoff Protocol

This document defines the standardized protocol for transferring context, requirements, and outputs between specialized agents in the Neo ecosystem. Following this protocol ensures context continuity and coherent workflows across agent boundaries.

## Core Handoff Principles

1. **Context Preservation**: All relevant context must be preserved and transferred during handoffs
2. **Explicit Requirements**: Clear and unambiguous requirements must accompany each handoff
3. **Structured Format**: Handoffs must follow a consistent structured format for predictability
4. **Information Sufficiency**: Each handoff must contain enough information for the receiving agent to work independently
5. **Bi-directional Validation**: Both sending and receiving agents must validate handoff completeness

## Handoff Structure

Every agent handoff should include the following components:

### 1. Task Metadata

```
Task ID: [ID from Task Master]
Title: [Concise task title]
Origin Agent: [Agent sending the task]
Target Agent: [Agent receiving the task]
Priority: [high|medium|low]
Due Date: [If applicable]
Dependencies: [IDs of prerequisite tasks]
```

### 2. Context Summary

```
Context:
- [Brief summary of the overall project/feature this task belongs to]
- [Relevant background information essential for understanding]
- [Previous decisions that impact this task]
- [Constraints or limitations to be aware of]
```

### 3. Requirements Specification

```
Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
- [...]

Acceptance Criteria:
- [Criterion 1]
- [Criterion 2]
- [...]
```

### 4. Prior Work Reference

```
Prior Work:
- [Description of relevant work already completed]
- [References to specific files/components affected]
- [Links to relevant documentation]
- [Important decisions made upstream]
```

### 5. Expected Outputs

```
Expected Outputs:
- [Detailed description of deliverable 1]
- [Detailed description of deliverable 2]
- [...]

Format: [Required format for deliverables]
```

### 6. Handoff-Specific Questions

```
Clarification Questions:
- [Question 1 the receiving agent might need answered]
  - [Answer 1]
- [Question 2 the receiving agent might need answered]
  - [Answer 2]
- [...]
```

### 7. Return Instructions

```
Return Path:
- [How the completed work should be returned]
- [Any specific integration requirements]
- [Next agent in the workflow]
```

## Handoff Types

Different types of handoffs have specific additional requirements:

### Design → Implementation Handoff

Additional sections:
```
Design Documentation:
- [Links to design documents/diagrams]
- [Design patterns to follow]
- [Component interfaces]

Technical Constraints:
- [Performance requirements]
- [Security requirements]
- [Compatibility requirements]
```

### Implementation → Testing Handoff

Additional sections:
```
Implementation Details:
- [Files/components changed]
- [New functionality introduced]
- [Known limitations]

Test Focus Areas:
- [Critical paths to test]
- [Edge cases to verify]
- [Non-functional requirements to validate]
```

### Research → Decision Handoff

Additional sections:
```
Research Findings:
- [Summary of key findings]
- [Data points and evidence]
- [Comparative analysis]

Decision Requirements:
- [Decision to be made]
- [Decision criteria]
- [Impact assessment]
```

## Context Packaging Technique

To effectively package context for handoff:

1. **Summarize Relevant History**:
   - Condense the history of the task to essential elements
   - Include only decision points that impact the current work
   - Exclude routine or procedural details

2. **Highlight Key Constraints**:
   - Explicitly state all constraints that affect the work
   - Include technical, business, and timeline constraints
   - Note non-negotiable requirements versus flexible aspects

3. **Provide Concrete Examples**:
   - Include examples of similar work or expected results
   - Reference existing components with similar patterns
   - Provide sample inputs/outputs where applicable

4. **Establish Clear Boundaries**:
   - Define what is in-scope versus out-of-scope
   - Clarify where creative latitude is allowed
   - Set specific limits on resource usage or complexity

## Context Compression Guidelines

When transferring large contexts between agents:

1. **Hierarchical Summarization**:
   - Provide a 1-paragraph executive summary
   - Follow with 3-5 key points in order of importance
   - Add detailed context in decreasing order of relevance

2. **Essential Knowledge Principle**:
   - Include only information needed for task completion
   - Omit details that don't impact decision-making
   - Focus on actionable insights rather than background

3. **Link Rather Than Copy**:
   - Reference files, documents, and artifacts by link
   - Provide specific pointers to relevant sections
   - Use task IDs to reference related work

4. **Progressive Disclosure**:
   - Start with critical information
   - Provide mechanism for recipient to request more details
   - Structure information in layers of increasing detail

## Boomerang Task Handoff Pattern

For the Boomerang pattern (where a task returns to the originating agent):

1. **Initial Handoff**:
   - Tag task with `#boomerang` flag
   - Clearly specify return conditions
   - Include acceptance criteria for the intermediate work

2. **Intermediate Work**:
   - Specialized agent works within defined boundaries
   - Documents actions and decisions
   - Prepares return package with outputs

3. **Return Handoff**:
   - Package completed work with original context
   - Provide summary of changes/decisions
   - Include any new constraints discovered
   - Flag any open questions or issues

4. **Receiving Return**:
   - Validate return against original requirements
   - Integrate returned work into larger context
   - Document integration decisions

## Handoff Validation Checklist

Before completing a handoff, the sending agent must verify:

- [ ] All metadata is complete and accurate
- [ ] Context summary covers all relevant background
- [ ] Requirements are specific and actionable
- [ ] Prior work references are accessible
- [ ] Expected outputs are clearly defined
- [ ] Anticipated questions are answered
- [ ] Return instructions are clear
- [ ] Type-specific requirements are included

The receiving agent must verify:

- [ ] Task purpose and context are understood
- [ ] All requirements are clear and complete
- [ ] Sufficient information is provided to begin work
- [ ] References and resources are accessible
- [ ] Questions and clarifications have been addressed
- [ ] Acceptance criteria are understood
- [ ] Return mechanism is clear

## Example Handoff Document

```markdown
# Task Handoff: API Authentication Implementation

## Task Metadata
Task ID: 47
Title: Implement JWT Authentication for User API
Origin Agent: Architect Agent
Target Agent: Code Engineer Agent
Priority: High
Dependencies: Task 43 (API Endpoints Definition)

## Context Summary
- This task is part of the User Management System overhaul
- The system is transitioning from session-based to token-based auth
- Security requirements mandate short-lived tokens with refresh capability
- Performance targets require auth checks to add <10ms latency

## Requirements Specification
Requirements:
- Implement JWT authentication middleware for Express.js
- Create token issuance, validation, and refresh endpoints
- Store token blacklist in Redis for revoked tokens
- Implement proper error handling for auth failures

Acceptance Criteria:
- All user API endpoints correctly enforce authentication
- Tokens expire after 15 minutes
- Refresh tokens work and expire after 7 days
- Invalid/expired tokens return 401 with appropriate error message

## Prior Work Reference
- User API endpoints defined in /src/routes/users.js
- Authentication interfaces designed in Task 43 documentation
- JWT strategy documented in Architecture Decision Record #12

## Expected Outputs
Expected Outputs:
- JWT middleware implementation in /src/middleware/auth.js
- Token management functions in /src/services/auth.js
- Redis integration for token blacklisting
- Updated API documentation with authentication details

Format: Pull request with all implementation and tests

## Clarification Questions
- Should social login tokens be handled in this task?
  - No, social login will be addressed in Task 52
- Are there specific JWT libraries to use?
  - Prefer jsonwebtoken for backend and jwt-decode for frontend

## Return Instructions
Return Path:
- Create PR and assign to Architect Agent for review
- Include test coverage report
- Next agent will be Test Agent for integration testing

## Technical Constraints
- Must use Redis for token storage
- Must implement rate limiting for token endpoints
- All token operations must be logged for audit
- Implementation must follow OWASP security guidelines
```

## Common Handoff Errors to Avoid

1. **Insufficient Context**:
   - Too little background information
   - Missing critical constraints
   - Unclear relationship to overall system

2. **Ambiguous Requirements**:
   - Vague or open-ended requirements
   - Missing acceptance criteria
   - Subjective quality measures

3. **Overloaded Handoffs**:
   - Too many requirements in a single task
   - Scope too broad for effective execution
   - Multiple unrelated deliverables bundled together

4. **Implied Knowledge Assumptions**:
   - Assuming domain knowledge the recipient doesn't have
   - Not explaining project-specific terminology
   - Omitting context that seems "obvious"

5. **Incomplete Return Instructions**:
   - Unclear integration expectations
   - Missing validation requirements
   - No specified next steps

## Handoff Escalation Process

If issues are encountered during the handoff process:

1. **Receiving Agent Clarification Request**:
   - Document specific questions or missing information
   - Request clarification using `#request-clarification` command
   - Continue with other tasks while awaiting response

2. **Sending Agent Response**:
   - Prioritize clarification requests
   - Provide missing information
   - Update handoff documentation

3. **Unresolvable Issues**:
   - If clarification doesn't resolve issues, escalate to Orchestrator
   - Use `#escalate-handoff` command with specific blocker details
   - Orchestrator will intervene to resolve handoff issues

4. **Handoff Rejection**:
   - In rare cases, receiving agent may reject handoff with `#reject-handoff`
   - Must provide specific reasons for rejection
   - Orchestrator reviews and determines next steps

## Measuring Handoff Effectiveness

The following metrics help assess and improve handoff quality:

1. **Clarification Rate**:
   - Number of clarification requests per handoff
   - Target: Less than 2 clarifications per handoff

2. **First-Time Acceptance Rate**:
   - Percentage of handoffs accepted without clarification
   - Target: >80%

3. **Handoff-to-Work Ratio**:
   - Time spent processing handoff relative to doing the work
   - Target: <15% of total task time

4. **Return Acceptance Rate**:
   - Percentage of returned work accepted without revision
   - Target: >90%

## References & Tools

- [Task Master Documentation](link)
- [Neo Orchestration System](link)
- [Handoff Template Generator](link)
- [Context Packaging Best Practices](link) 