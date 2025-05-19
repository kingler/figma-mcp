# Neo Orchestrator Server

A Model Context Protocol (MCP) server that implements a BDI (Belief-Desire-Intention) architecture for orchestrating AI agents.

## Features

- **Belief Management**: Add, remove, and update beliefs in the system
- **Desire Formation**: Form desires based on goals with priorities
- **Intention Selection**: Select intentions based on desires and constraints
- **Workflow Management**: Track SDLC and agent-specific workflows
- **Configurable**: Environment-based configuration
- **Logging**: Structured logging with different levels
- **Type Safety**: Full TypeScript support with runtime validation

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
LOG_LEVEL=info
SERVER_NAME=neo-orchestrator-server
SERVER_VERSION=0.1.0
```

## Usage

### Starting the Server

```bash
npm run build
npm start
```

### Running Tests

```bash
npm test
```

## API

### Belief Management

```typescript
// Add or update a belief
{
  name: 'belief_management',
  arguments: {
    belief: 'example-belief',
    action: 'add',
    value: 'example-value'
  }
}

// Remove a belief
{
  name: 'belief_management',
  arguments: {
    belief: 'example-belief',
    action: 'remove'
  }
}
```

### Desire Formation

```typescript
{
  name: 'desire_formation',
  arguments: {
    goal: 'example-goal',
    priority: 5,
    context: 'optional-context'
  }
}
```

### Intention Selection

```typescript
{
  name: 'intention_selection',
  arguments: {
    desire: 'example-desire',
    options: ['option1', 'option2'],
    constraints: ['constraint1', 'constraint2']
  }
}
```

## Resources

The server provides access to the following resources:

- `neo://workflows/sdlc`: SDLC workflow status
- `neo://workflows/agent`: Agent-specific workflow status
- `neo://workflows/sdlc/{phase}`: Phase-specific SDLC workflow
- `neo://workflows/agent/{agent}`: Agent-specific workflow details

## Development

### Project Structure

```
neo-orchestrator-server/
├── src/
│   ├── index.ts        # Main server implementation
│   └── config.ts       # Configuration management
├── tests/
│   └── server.test.ts  # Server tests
├── .env               # Environment variables
└── package.json       # Project dependencies
```

### Adding New Features

1. Add new command schemas in `src/index.ts`
2. Implement handler methods in the `NeoOrchestratorServer` class
3. Add corresponding tests in `tests/server.test.ts`
4. Update documentation in this README

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 