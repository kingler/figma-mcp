# QA Engineer MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with tools for software quality assurance and testing tasks.

## Overview

The QA Engineer MCP Server is designed to enhance AI assistants with specialized capabilities for software testing and quality assurance. It leverages large language models (LLMs) to generate test plans, test code, and automation scripts based on code analysis and requirements.

## Features

- **Code Analysis**: Analyzes Python and Node.js code to understand structure, functions, classes, and dependencies
- **Test Plan Generation**: Creates comprehensive test plans with test cases for different test types
- **Test Code Generation**: Generates executable test code based on test plans
- **Test Execution**: Runs tests and provides detailed results
- **Automation Script Generation**: Creates automation scripts for UI and API testing
- **Metrics Collection**: Gathers and analyzes test metrics

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your LLM provider API keys:
   ```
   # LLM Provider API Keys
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OLLAMA_API_KEY=your_ollama_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   DEEPSEEK_API_KEY=your_deepseek_api_key_here

   # LLM Provider Configuration
   DEFAULT_PROVIDER_TYPE=openai  # Options: openai, anthropic, ollama, gemini, deepseek
   DEFAULT_MODEL=gpt-4  # Model name depends on the provider
   DEFAULT_TEMPERATURE=0.2
   DEFAULT_MAX_TOKENS=2000
   ```
4. Build the server:
   ```bash
   npm run build
   ```

## Usage

### Starting the Server

```bash
npm start
```

### Available Tools

The QA Engineer MCP Server provides the following tools through the Model Context Protocol:

#### 1. Generate Test Plan (`generate_test_plan`)

Generates a comprehensive test plan with test cases based on code analysis and requirements.

**Parameters:**
- `scope` (required): Testing scope (e.g., module name, function name)
- `type` (required): Type of testing (`unit`, `integration`, `e2e`, `performance`)
- `language` (required): Programming language (`python`, `nodejs`)
- `sourceFiles` (optional): Array of source files to analyze for test generation
- `requirements` (optional): Array of test requirements
- `coverage` (optional): Target coverage percentage

**Example Request:**
```json
{
  "name": "generate_test_plan",
  "arguments": {
    "scope": "User Authentication Module",
    "type": "unit",
    "language": "python",
    "sourceFiles": ["auth.py", "user.py"],
    "requirements": ["REQ-001: Users must be able to log in", "REQ-002: Passwords must be encrypted"],
    "coverage": 90
  }
}
```

**Example Response:**
```json
{
  "scope": "User Authentication Module",
  "type": "unit",
  "language": "python",
  "requirements": ["REQ-001: Users must be able to log in", "REQ-002: Passwords must be encrypted"],
  "coverage": 90,
  "cases": [
    {
      "id": "TC-001",
      "description": "Test successful user login",
      "steps": ["Create a test user", "Call login function with valid credentials"],
      "assertions": ["User is authenticated", "Session token is returned"],
      "priority": 1
    },
    {
      "id": "TC-002",
      "description": "Test password encryption",
      "steps": ["Create a user with a password", "Retrieve the stored password"],
      "assertions": ["Stored password is encrypted", "Original password cannot be retrieved"],
      "priority": 1
    }
  ],
  "timestamp": "2025-03-16T12:00:00.000Z"
}
```

#### 2. Generate Tests (`generate_tests`)

Generates and writes test files for a project based on a test plan.

**Parameters:**
- `scope` (required): Testing scope (e.g., module name, function name)
- `type` (required): Type of testing (`unit`, `integration`, `e2e`, `performance`)
- `language` (required): Programming language (`python`, `nodejs`)
- `sourceFiles` (optional): Array of source files to analyze for test generation
- `requirements` (optional): Array of test requirements
- `coverage` (optional): Target coverage percentage
- `outputDir` (optional): Directory to write test files to (default: `./tests`)

**Example Request:**
```json
{
  "name": "generate_tests",
  "arguments": {
    "scope": "User Authentication Module",
    "type": "unit",
    "language": "python",
    "sourceFiles": ["auth.py", "user.py"],
    "requirements": ["REQ-001: Users must be able to log in", "REQ-002: Passwords must be encrypted"],
    "coverage": 90,
    "outputDir": "./tests"
  }
}
```

**Example Response:**
```json
{
  "testFiles": [
    "./tests/test_auth.py",
    "./tests/test_user.py"
  ]
}
```

#### 3. Execute Tests (`execute_tests`)

Executes tests in a directory and returns the results.

**Parameters:**
- `testDir` (required): Directory containing tests
- `language` (required): Programming language (`python`, `nodejs`)
- `framework` (optional): Test framework (`pytest`, `unittest`, `jest`, `mocha`)

**Example Request:**
```json
{
  "name": "execute_tests",
  "arguments": {
    "testDir": "./tests",
    "language": "python",
    "framework": "pytest"
  }
}
```

**Example Response:**
```json
{
  "summary": {
    "total": 10,
    "passed": 8,
    "failed": 1,
    "skipped": 1,
    "duration": 1.25
  },
  "tests": [
    {
      "name": "test_user_login",
      "status": "passed",
      "duration": 0.15
    },
    {
      "name": "test_password_encryption",
      "status": "failed",
      "duration": 0.12,
      "error": "AssertionError: Password was not properly encrypted"
    }
  ],
  "timestamp": "2025-03-16T12:05:00.000Z"
}
```

#### 4. Generate Automation Script (`generate_automation_script`)

Generates a test automation script for UI or API testing.

**Parameters:**
- `scenario` (required): Test scenario
- `language` (required): Programming language (`python`, `nodejs`)
- `framework` (required): Automation framework (`selenium`, `playwright`, `puppeteer`)
- `steps` (required): Array of test steps with actions
  - Each step has:
    - `action` (required): Action to perform (e.g., `navigate`, `type`, `click`)
    - `target` (optional): Target element or URL
    - `value` (optional): Value to input
    - `timeout` (optional): Timeout in milliseconds
- `outputFile` (optional): Output file path

**Example Request:**
```json
{
  "name": "generate_automation_script",
  "arguments": {
    "scenario": "User Login Flow",
    "language": "python",
    "framework": "selenium",
    "steps": [
      {
        "action": "navigate",
        "target": "https://example.com/login"
      },
      {
        "action": "type",
        "target": "#username",
        "value": "testuser"
      },
      {
        "action": "type",
        "target": "#password",
        "value": "password123"
      },
      {
        "action": "click",
        "target": "#login-button"
      }
    ],
    "outputFile": "./automation/login_test.py"
  }
}
```

**Example Response:**
```json
{
  "scenario": "User Login Flow",
  "framework": "selenium",
  "language": "python",
  "steps": [...],
  "script": "import unittest\nfrom selenium import webdriver\n...",
  "outputFile": "./automation/login_test.py",
  "timestamp": "2025-03-16T12:10:00.000Z"
}
```

#### 5. Collect Metrics (`collect_metrics`)

Collects and analyzes test metrics.

**Parameters:**
- `metrics` (required): Array of metrics to collect (`cpu`, `memory`, `response_time`, etc.)
- `duration` (required): Collection duration in seconds
- `interval` (required): Collection interval in seconds
- `outputFile` (optional): Output file path for the metrics data

**Example Request:**
```json
{
  "name": "collect_metrics",
  "arguments": {
    "metrics": ["cpu", "memory", "response_time"],
    "duration": 60,
    "interval": 5,
    "outputFile": "./metrics/results.json"
  }
}
```

**Example Response:**
```json
{
  "metrics": {
    "cpu": {
      "values": [12.5, 15.2, 14.8, 13.1, 12.9, 13.5, 14.0, 13.8, 14.2, 13.9, 13.7, 14.1],
      "summary": {
        "min": 12.5,
        "max": 15.2,
        "avg": 13.8
      }
    },
    "memory": {
      "values": [256.3, 258.7, 260.1, 262.5, 265.8, 268.2, 270.5, 272.9, 275.3, 277.6, 280.0, 282.4],
      "summary": {
        "min": 256.3,
        "max": 282.4,
        "avg": 269.2
      }
    },
    "response_time": {
      "values": [0.12, 0.15, 0.11, 0.13, 0.14, 0.12, 0.13, 0.14, 0.15, 0.12, 0.11, 0.13],
      "summary": {
        "min": 0.11,
        "max": 0.15,
        "avg": 0.13
      }
    }
  },
  "collection": {
    "duration": 60,
    "interval": 5,
    "samples": 12
  },
  "timestamp": "2025-03-16T12:15:00.000Z"
}
```

### Using the Tools with MCP

To use these tools through the Model Context Protocol, you need to:

1. Start the QA Engineer MCP Server
2. Connect to it using an MCP client
3. Send a request in the following format:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "mcp/callTool",
  "params": {
    "name": "tool_name",
    "arguments": {
      // Tool-specific arguments
    }
  }
}
```

For example, to generate a test plan:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "mcp/callTool",
  "params": {
    "name": "generate_test_plan",
    "arguments": {
      "scope": "User Authentication Module",
      "type": "unit",
      "language": "python",
      "requirements": ["REQ-001: Users must be able to log in"]
    }
  }
}
```

## Supported Languages and Frameworks

### Languages
- Python
- Node.js (JavaScript/TypeScript)

### Testing Frameworks
- Python: pytest, unittest
- Node.js: Jest, Mocha

### Automation Frameworks
- Selenium
- Playwright
- Puppeteer

## Supported LLM Providers

The QA Engineer MCP Server supports multiple LLM providers:

- **OpenAI**: GPT-4, GPT-3.5-Turbo
- **Anthropic**: Claude 3 (Opus, Sonnet, Haiku)
- **Ollama**: Local models (Llama, Mistral, etc.) - *Coming soon*
- **Google Gemini**: Gemini Pro, Gemini Ultra - *Coming soon*
- **DeepSeek**: DeepSeek Coder, DeepSeek Chat - *Coming soon*

You can configure which provider to use by setting the `DEFAULT_PROVIDER_TYPE` environment variable in your `.env` file.

## Architecture

The server is built using the MCP SDK and follows a modular architecture:

- **Code Analysis**: Analyzes source code to understand structure and behavior
- **LLM Integration**: Connects to multiple LLM providers (OpenAI, Anthropic, etc.) for generating test plans and code
- **Prompt Engineering**: Creates specialized prompts for different test types
- **Test Execution**: Runs tests and collects results
- **MCP Interface**: Exposes tools via the Model Context Protocol

## Development

### Project Structure

```
src/
├── index.ts                    # Main server entry point
├── services/
│   ├── code-analysis/          # Code analysis services
│   │   ├── analyzer-factory.ts
│   │   ├── nodejs-analyzer.ts
│   │   ├── python-analyzer.ts
│   │   └── types.ts
│   ├── llm/                    # LLM integration
│   │   ├── openai-provider.ts  # OpenAI provider implementation
│   │   ├── anthropic-provider.ts # Anthropic provider implementation
│   │   ├── provider-factory.ts # Factory for creating LLM providers
│   │   └── types.ts
│   ├── prompts/                # Prompt engineering
│   │   └── test-prompts.ts
│   └── test-execution/         # Test execution
│       ├── executor-factory.ts
│       ├── nodejs-executor.ts
│       ├── python-executor.ts
│       └── types.ts
```

### Building

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

## License

MIT
