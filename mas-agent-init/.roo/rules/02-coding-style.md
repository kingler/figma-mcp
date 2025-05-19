# Neo Project Coding Style Guidelines

This document provides coding style guidelines for all code in the Neo project. These rules apply across all specialized agent modes that write or modify code.

## General Principles

- **Readability**: Code should be written to be read and understood by humans
- **Consistency**: Follow established patterns within the codebase
- **Simplicity**: Prefer simple solutions over complex ones
- **Maintainability**: Write code that can be easily maintained and extended

## Naming Conventions

- **Variables**: Use descriptive, camelCase variable names
  ```typescript
  // ✅ DO: Clear, descriptive name
  const userProfile = getUserProfile(userId);
  
  // ❌ DON'T: Unclear abbreviation
  const up = gup(uid);
  ```

- **Functions**: Use verb phrases that describe the action
  ```typescript
  // ✅ DO: Clear verb phrase
  function validateUserInput(input) { /* ... */ }
  
  // ❌ DON'T: Unclear noun
  function inputValidation(input) { /* ... */ }
  ```

- **Classes**: Use PascalCase noun phrases
  ```typescript
  // ✅ DO: PascalCase class name
  class UserAuthentication { /* ... */ }
  
  // ❌ DON'T: camelCase or unclear name
  class userAuth { /* ... */ }
  ```

- **Constants**: Use UPPER_SNAKE_CASE for true constants
  ```typescript
  // ✅ DO: UPPER_SNAKE_CASE for true constants
  const MAX_RETRY_ATTEMPTS = 3;
  
  // ❌ DON'T: camelCase for true constants
  const maxRetryAttempts = 3;
  ```

## Code Structure

- **File Organization**: Group related functionality in the same file or directory
- **Function Length**: Keep functions focused on a single task, typically under 50 lines
- **Line Length**: Limit lines to 80-100 characters for better readability
- **Comments**: Use comments to explain "why", not "what"
  ```typescript
  // ✅ DO: Explain why
  // Retry 3 times to handle intermittent network failures
  const MAX_RETRY_ATTEMPTS = 3;
  
  // ❌ DON'T: Just repeat what the code does
  // Set max retry attempts to 3
  const MAX_RETRY_ATTEMPTS = 3;
  ```

## Error Handling

- Always handle potential errors and edge cases
- Use try/catch blocks for operations that may throw exceptions
- Provide meaningful error messages
- Consider fallback behavior when appropriate

## Testing

- Write tests for all new functionality
- Follow the Arrange-Act-Assert pattern for test structure
- Test both success cases and error conditions
- Use descriptive test names that explain the expected behavior

## Language-Specific Guidelines

### JavaScript/TypeScript

- Use modern ES6+ features when available
- Prefer `const` over `let`, and avoid `var`
- Use TypeScript interfaces and types for better type safety
- Use async/await instead of raw promises for asynchronous code

### Python

- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Write docstrings for functions and classes
- Use virtual environments for dependency management

### Other Languages

- Follow the official style guide for the language
- Be consistent with existing code in the project
- Document any deviations from standard conventions

## Documentation

- Document public APIs with JSDoc, docstrings, or equivalent
- Include examples for non-obvious functionality
- Keep documentation up-to-date with code changes
- Use markdown for documentation files 