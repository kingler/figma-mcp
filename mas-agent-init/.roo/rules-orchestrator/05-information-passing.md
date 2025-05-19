---
description: Guidelines for passing information between agents in the Neo orchestration layer
globs: .roo/rules-*/*.md
alwaysApply: true
---

# Information Passing Between Agents

This document outlines guidelines and patterns for effectively passing information between specialized agents through the Neo orchestration layer. Proper information passing is critical for creating cohesive, contextual interactions between agents working on different aspects of a task.

## Key Principles

- **Structured Data Exchange:** Always prefer structured data formats over free-text when passing information between agents
- **Context Preservation:** Include relevant context when delegating tasks to specialized agents
- **Minimal and Focused:** Pass only the necessary information to avoid overwhelming the receiving agent
- **Bidirectional Summaries:** Always include summaries of work done when returning from a specialized agent to the parent task
- **Belief-Desire-Intention Aware:** Consider the BDI model when structuring information exchange

## Information Flow Patterns

### 1. Parent-to-Child Information Flow (Delegation)

When delegating a task from a parent agent to a specialized child agent, structure the information as follows:

```javascript
// Standard information packet for delegation
const delegationPacket = {
  // Task identification
  taskId: "unique-task-id",
  parentTaskId: "parent-task-id",
  
  // Core task information
  goal: "Clear description of what the child agent should accomplish",
  context: {
    // Relevant context from parent agent's beliefs
    codebase: { /* Code context relevant to the task */ },
    requirements: { /* Requirements relevant to the task */ },
    constraints: { /* Constraints the child agent should respect */ }
  },
  
  // Belief context (from BDI architecture)
  beliefs: [
    { key: "relevant_belief_1", value: "value1", confidence: 0.9 },
    { key: "relevant_belief_2", value: "value2", confidence: 0.8 }
  ],
  
  // Explicit desires for the child agent
  desires: [
    { name: "primary_goal", priority: 0.9, condition: "goal_condition" },
    { name: "secondary_goal", priority: 0.5, condition: "secondary_condition" }
  ],
  
  // Resources and references
  resources: {
    files: ["path/to/relevant/file1", "path/to/relevant/file2"],
    apis: ["relevant_api_1", "relevant_api_2"],
    documentation: ["doc_reference_1", "doc_reference_2"]
  },
  
  // Expectations for the return information
  expectedResponse: {
    format: "json|markdown|code",
    requiredFields: ["result", "artifacts", "recommendations"]
  }
}
```

#### Example: Architect to Backend Developer Delegation

```javascript
// Architect delegating API design to Backend Developer
const apiDesignDelegation = {
  taskId: "api-design-user-auth",
  parentTaskId: "system-architecture-design",
  goal: "Design RESTful API endpoints for user authentication system",
  context: {
    systemScope: "User authentication and authorization system",
    userTypes: ["regular", "admin", "system"],
    securityRequirements: ["OWASP compliance", "JWT-based auth", "rate limiting"]
  },
  beliefs: [
    { key: "auth_provider", value: "in-house", confidence: 0.95 },
    { key: "db_system", value: "PostgreSQL", confidence: 0.9 }
  ],
  desires: [
    { name: "secure_api_design", priority: 0.9, condition: "meets_security_standards" },
    { name: "performance_optimization", priority: 0.7, condition: "response_time < 200ms" }
  ],
  resources: {
    files: ["architecture/auth-flow-diagram.png", "docs/security-requirements.md"],
    apis: [],
    documentation: ["https://auth0.com/docs/api-auth/tutorials/adoption"]
  },
  expectedResponse: {
    format: "markdown",
    requiredFields: ["endpoints", "request_response_examples", "security_measures", "database_schema"]
  }
}
```

### 2. Child-to-Parent Information Flow (Return)

When a specialized agent returns results to the parent agent, structure the information as follows:

```javascript
// Standard return packet from child to parent
const returnPacket = {
  // Task identification
  taskId: "unique-task-id",
  parentTaskId: "parent-task-id",
  
  // Status and summary
  status: "completed|partial|failed",
  summary: "Brief summary of what was accomplished",
  
  // Detailed results
  results: {
    // Task-specific results
    // This will vary based on the task type
  },
  
  // Belief updates from child agent
  beliefUpdates: [
    { key: "new_belief_1", value: "value1", confidence: 0.9 },
    { key: "updated_belief_2", value: "new_value2", confidence: 0.85 }
  ],
  
  // Artifacts created
  artifacts: [
    { type: "file", path: "path/to/created/file", description: "Description of file" },
    { type: "diagram", data: "diagram-data", description: "Description of diagram" }
  ],
  
  // Recommendations for parent
  recommendations: [
    { type: "action", description: "Recommended next action" },
    { type: "investigation", description: "Area that needs more investigation" }
  ],
  
  // Issues encountered
  issues: [
    { severity: "high|medium|low", description: "Description of issue", suggestions: ["Suggestion 1", "Suggestion 2"] }
  ]
}
```

#### Example: Backend Developer to Architect Return

```javascript
// Backend Developer returning API design to Architect
const apiDesignReturn = {
  taskId: "api-design-user-auth",
  parentTaskId: "system-architecture-design",
  status: "completed",
  summary: "Designed RESTful API for authentication with JWT support, rate limiting, and OWASP compliance",
  results: {
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "User registration endpoint" },
      { method: "POST", path: "/api/auth/login", description: "User login endpoint" },
      { method: "GET", path: "/api/auth/verify", description: "Token verification endpoint" },
      { method: "POST", path: "/api/auth/refresh", description: "Token refresh endpoint" },
      { method: "POST", path: "/api/auth/logout", description: "User logout endpoint" }
    ],
    securityMeasures: [
      "JWT with short expiration (15 minutes)",
      "Refresh tokens with longer expiration (7 days)",
      "Rate limiting: 10 requests per minute for auth endpoints",
      "Password hashing with bcrypt (cost factor 12)",
      "CORS restrictions to known origins"
    ],
    databaseSchema: {
      tables: [
        { name: "users", fields: ["id", "email", "password_hash", "role", "created_at", "updated_at"] },
        { name: "refresh_tokens", fields: ["id", "user_id", "token_hash", "expires_at", "created_at"] }
      ]
    }
  },
  beliefUpdates: [
    { key: "auth_jwt_expiry", value: "15m", confidence: 0.95 },
    { key: "auth_refresh_expiry", value: "7d", confidence: 0.95 },
    { key: "rate_limit_auth", value: "10rpm", confidence: 0.9 }
  ],
  artifacts: [
    { type: "file", path: "backend/docs/auth-api-spec.yaml", description: "OpenAPI specification for auth endpoints" },
    { type: "diagram", data: "auth-flow-sequence", description: "Sequence diagram of authentication flow" }
  ],
  recommendations: [
    { type: "action", description: "Implement OAuth integration for social logins" },
    { type: "action", description: "Set up monitoring for failed login attempts" },
    { type: "investigation", description: "Evaluate need for two-factor authentication" }
  ],
  issues: [
    { 
      severity: "medium", 
      description: "Refresh token rotation may create issues for multiple devices", 
      suggestions: ["Implement per-device refresh tokens", "Use a token family approach to track related tokens"] 
    }
  ]
}
```

## BDI-Aware Information Exchange

When exchanging information between agents that implement the Belief-Desire-Intention architecture, follow these guidelines:

### 1. Belief Exchange

- Include only beliefs relevant to the task being delegated
- Specify confidence levels for all beliefs
- Indicate which beliefs are facts vs. assumptions
- Update beliefs based on the child agent's return packet

### 2. Desire Sharing

- Clearly specify the desires (goals) that the child agent should adopt
- Include priority levels to help the child agent prioritize when goals conflict
- Specify conditions that indicate when a desire has been satisfied

### 3. Intention Transparency

- The parent agent should include high-level plans when relevant
- The child agent should return the actual plan executed
- Document deviations from the original plan with rationales

## Integration with Memory Systems

Information passing should leverage our memory systems for context preservation and reference:

```javascript
// Example of memory-enhanced information passing
async function delegateWithMemory(parentAgent, childAgent, task) {
  // Create basic delegation packet
  const delegationPacket = createBasicDelegationPacket(parentAgent, task);
  
  // Enhance with relevant memories
  const enhancedPacket = await memorySystem.enhanceDelegation(delegationPacket, {
    similarTasks: true,      // Find similar past tasks
    relevantEpisodes: true,  // Include relevant past episodes
    maxEpisodes: 3           // Limit to 3 most relevant episodes
  });
  
  // Pass to child agent
  const result = await childAgent.execute(enhancedPacket);
  
  // Store the interaction in memory
  await memorySystem.storeInteraction({
    type: 'delegation',
    parent: parentAgent.id,
    child: childAgent.id,
    task: task.id,
    delegationPacket: enhancedPacket,
    result: result
  });
  
  return result;
}
```

## Context Preservation Techniques

### 1. Chain-of-Thought Context

Include reasoning and thought processes when delegating complex tasks:

```javascript
// Example of chain-of-thought context
const delegationWithCoT = {
  // Basic delegation info...
  
  chainOfThought: [
    { step: 1, thought: "First considered using OAuth but..." },
    { step: 2, thought: "Then realized JWT would be better because..." },
    { step: 3, thought: "Identified potential security issue with..." }
  ]
}
```

### 2. Historical Context

For tasks that build on previous work, include historical context:

```javascript
// Example of historical context
const delegationWithHistory = {
  // Basic delegation info...
  
  history: [
    { timestamp: "2023-06-15T10:30:00Z", event: "Initial API design completed", reference: "task-id-123" },
    { timestamp: "2023-06-20T14:45:00Z", event: "Security review identified JWT vulnerabilities", reference: "task-id-456" },
    { timestamp: "2023-06-25T09:15:00Z", event: "Decision to implement refresh token rotation", reference: "decision-id-789" }
  ]
}
```

## Visual Context

When relevant, include visual context that helps convey information:

```javascript
// Example of visual context inclusion
const delegationWithVisuals = {
  // Basic delegation info...
  
  visuals: [
    { 
      type: "diagram",
      format: "mermaid", 
      content: `
        sequenceDiagram
          participant Client
          participant API
          participant Auth
          Client->>API: Request with JWT
          API->>Auth: Validate JWT
          Auth-->>API: Valid / Invalid
          API-->>Client: Response / Error
      `,
      description: "Authentication flow sequence diagram"
    }
  ]
}
```

## Common Pitfalls to Avoid

1. **Data Format Mismatches**: Ensure consistent data formats between agents
2. **Missing Context**: Always include sufficient context for the child agent to perform its task
3. **Overloaded Packets**: Avoid sending too much irrelevant information
4. **Belief Contradictions**: Resolve contradicting beliefs before delegating tasks
5. **Lost Summaries**: Always ensure child agents return comprehensive summaries

## Best Practices

1. **Structured Templates**: Use consistent templates for specific types of information exchange
2. **Progressive Enhancement**: Start with minimal context and enhance as needed
3. **Bidirectional Feedback**: Allow agents to request additional information when needed
4. **Agent Capability Awareness**: Tailor information to the receiving agent's capabilities
5. **Confidence Levels**: Always include confidence levels for beliefs and information
6. **Clear Expectations**: Clearly specify what information should be returned

By following these guidelines, we can ensure effective information passing between agents, leading to more coherent, contextual, and intelligent behavior of the system as a whole. 