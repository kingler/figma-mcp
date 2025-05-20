# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start server
npm start

# Start server with auto-restart on changes
npm run dev

# Start NeDB server
npm run start:nedb

# Build TypeScript
npm run build

# Run tests
npm test
npm run test -- --unit    # Unit tests only
npm run test -- --integration  # Integration tests only

# Run single test file
npx jest test-tools.js    # Specific test file

# Linting & formatting
npm run lint              # Check for issues
npm run lint:fix          # Fix issues automatically
npm run format            # Prettier formatting
```

## Docker Commands

```bash
npm run docker:build      # Build Docker image
npm run docker:run        # Run Docker container
```

## Code Style Guidelines

- **Imports**: Use CommonJS `require()` for imports
- **Error Handling**: Use try/catch blocks with detailed error messages; log errors with Winston logger
- **Logging**: Use the logger from `src/utils/logger.js` for consistent logging
- **Validation**: Use Zod schemas for parameter validation
- **Promises**: Use async/await for asynchronous code
- **Documentation**: JSDoc comments for functions and tools
- **Tool Definition Pattern**: 
  - `name`: Kebab-case tool name
  - `description`: Clear purpose description
  - `parameters`: Zod schema for validation
  - `examples`: Sample usage examples
  - `handler`: Async function returning `{success: bool, ...}`
- **Error Responses**: Return `{success: false, error: message}` for failures
- **Naming Conventions**: 
  - camelCase for variables and functions
  - kebab-case for tool names
  - PascalCase for classes