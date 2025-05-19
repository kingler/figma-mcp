# Sequential Thinking MCP Server

An MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process.

## Features

- Break down complex problems into manageable steps
- Revise and refine thoughts as understanding deepens
- Branch into alternative paths of reasoning
- Adjust the total number of thoughts dynamically
- Generate and verify solution hypotheses

## Tool

### sequential_thinking

Facilitates a detailed, step-by-step thinking process for problem-solving and analysis.

#### Input Schema

```typescript
{
  thought: string;         // The current thinking step
  thoughtNumber: number;   // Current thought number (min: 1)
  totalThoughts: number;   // Estimated total thoughts needed (min: 1)
  nextThoughtNeeded: boolean; // Whether another thought step is needed
  isRevision?: boolean;    // Whether this revises previous thinking
  revisesThought?: number; // Which thought is being reconsidered
  branchFromThought?: number; // Branching point thought number
  branchId?: string;      // Branch identifier
  needsMoreThoughts?: boolean; // If more thoughts are needed
}
```

#### Example Usage

```typescript
// Initial thought
{
  "thought": "First, we need to analyze the problem requirements",
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true
}

// Branching thought
{
  "thought": "Consider alternative solution using microservices",
  "thoughtNumber": 1,
  "totalThoughts": 2,
  "nextThoughtNeeded": true,
  "branchFromThought": 2,
  "branchId": "microservices"
}

// Revising thought
{
  "thought": "Requirements should include scalability concerns",
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "isRevision": true,
  "revisesThought": 1
}

// Adding more thoughts
{
  "thought": "Need to consider security implications",
  "thoughtNumber": 4,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "needsMoreThoughts": true
}
```

## Error Handling

The server validates:
- Required parameters
- Thought sequence (must be sequential)
- Revision references (must point to existing thoughts)
- Branch points (must exist)
- Total thoughts vs current thought number

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the project:
```bash
npm run build
```

## Configuration

Add to your MCP settings configuration file:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "node",
      "args": ["/path/to/sequential-thinking-mcp/build/index.js"]
    }
  }
}
```

## License

MIT License
