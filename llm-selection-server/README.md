# LLM Selection MCP Server

An MCP server that helps select the optimal Large Language Model (LLM) for specific tasks based on requirements and cost considerations.

## Overview

The LLM Selection MCP Server provides tools to:

1. **List available LLM models** with their capabilities and costs
2. **Select the optimal model** for a specific task based on requirements
3. **Estimate the cost** of using a specific model for a task
4. **Calculate tokens** for a given text and model
5. **Get available providers** that are configured in the system

This server helps users make informed decisions about which LLM to use for different tasks, balancing performance needs with cost considerations.

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Setup

1. Clone the repository or navigate to the server directory:

```bash
cd /Users/kinglerbercy/Documents/Cline/MCP/llm-selection-server
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Copy the `.env.example` file to `.env` and update the API keys for the providers you want to use:

```bash
cp .env.example .env
```

4. Build the server:

```bash
npm run build
```

5. Add the server to your MCP settings file:

```json
{
  "mcpServers": {
    "llm-selection": {
      "command": "node",
      "args": ["/Users/kinglerbercy/Documents/Cline/MCP/llm-selection-server/build/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Available Tools

### 1. `list_models`

Lists all available LLM models with their capabilities and costs.

**Parameters:**
- `capability` (optional): Filter models by capability (e.g., "reasoning", "vision", "code-generation")
- `provider` (optional): Filter models by provider (e.g., "OpenAI", "Anthropic", "Google")
- `max_cost` (optional): Maximum cost per 1K output tokens

**Example:**
```json
{
  "capability": "vision",
  "provider": "Anthropic",
  "max_cost": 0.05
}
```

### 2. `select_model`

Selects the optimal LLM model for a specific task based on requirements.

**Parameters:**
- `task_description` (required): Description of the task to be performed
- `required_capabilities` (optional): List of capabilities required for the task
- `context_length` (optional): Estimated context length needed for the task (in tokens)
- `priority` (required): Priority for model selection: "cost", "performance", or "balanced"
- `max_budget` (optional): Maximum budget for the task (in USD)
- `specialized_domain` (optional): Specialized domain for the task (e.g., "medical", "legal", "finance")
- `preferred_provider` (optional): Preferred provider (e.g., "OpenAI", "Anthropic", "Google")
- `requires_fine_tuning` (optional): Whether the task requires a fine-tuned model
- `min_performance_rating` (optional): Minimum performance rating (1-10 scale)

**Example:**
```json
{
  "task_description": "Generate a creative story about space exploration",
  "required_capabilities": ["creative-writing"],
  "priority": "balanced",
  "max_budget": 0.1,
  "preferred_provider": "Anthropic"
}
```

### 3. `estimate_cost`

Estimates the cost of using a specific LLM model for a task.

**Parameters:**
- `model_id` (required): ID of the LLM model
- `input_tokens` (required): Estimated number of input tokens
- `output_tokens` (required): Estimated number of output tokens
- `num_requests` (optional): Number of requests/calls to the model (default: 1)

**Example:**
```json
{
  "model_id": "gpt-4-turbo",
  "input_tokens": 1000,
  "output_tokens": 2000,
  "num_requests": 5
}
```

### 4. `calculate_tokens`

Calculates the number of tokens in a text for a specific model.

**Parameters:**
- `text` (required): The text to calculate tokens for
- `model_id` (required): ID of the LLM model to use for calculation

**Example:**
```json
{
  "text": "This is a sample text to calculate tokens for.",
  "model_id": "gpt-4-turbo"
}
```

### 5. `get_available_providers`

Gets a list of available LLM providers.

**Parameters:**
- `configured_only` (optional): Whether to return only configured providers (default: true)

**Example:**
```json
{
  "configured_only": true
}
```

## Supported Models

The server currently supports models from the following providers:

### OpenAI
- GPT-4o
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo
- Text Embedding 3 (Large and Small)
- DALL-E 3

### Anthropic
- Claude 3.7 Sonnet
- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude 2.1
- Claude 2.0
- Claude Instant

### Google
- Gemini Ultra
- Gemini Pro
- Gemini Flash

### Meta
- Llama 3 70B
- Llama 3 8B
- Llama 2 70B
- Llama 2 13B
- Llama 2 7B

### Mistral AI
- Mistral Large
- Mistral Medium
- Mistral Small
- Mistral 7B
- Mixtral 8x7B

### Cohere
- Command R
- Command R+
- Command
- Command Light

### DeepSeek
- DeepSeek Coder
- DeepSeek-V2
- DeepSeek-V2-Chat
- DeepSeek-LLM-7B
- DeepSeek-Math
- DeepSeek-VL

### Other Providers
- AI21 (Jamba, Jurassic)
- Together AI
- Groq
- Perplexity
- Replicate
- Open Router (aggregator)

## Model Capabilities

The server categorizes models by the following capabilities:

- `text-generation`: General text generation
- `code-generation`: Code writing and editing
- `reasoning`: Complex reasoning and problem-solving
- `creative-writing`: Creative content generation
- `vision`: Image understanding and generation
- `audio`: Audio transcription and generation
- `embedding`: Vector embeddings for semantic search
- `fine-tuning`: Support for fine-tuning
- `function-calling`: Function/tool calling capabilities
- `tool-use`: Ability to use external tools
- `multilingual`: Strong multilingual support
- `long-context`: Support for very long contexts

## Environment Variables

The server uses the following environment variables for configuration:

```
# Provider API Keys and Base URLs
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
MISTRAL_API_KEY=your_mistral_api_key
COHERE_API_KEY=your_cohere_api_key
GOOGLE_API_KEY=your_google_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
AI21_API_KEY=your_ai21_api_key
TOGETHER_API_KEY=your_together_api_key
GROQ_API_KEY=your_groq_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
REPLICATE_API_KEY=your_replicate_api_key

# Rate Limiting and Cache Configuration
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_PERIOD=60
CACHE_ENABLED=true
CACHE_TTL=3600
```

## Development

### Project Structure

```
llm-selection-server/
├── src/
│   ├── config/
│   │   └── config.ts       # Configuration loader
│   ├── models/
│   │   └── llm-model.ts    # Model interfaces
│   ├── providers/
│   │   ├── provider.interface.ts  # Provider interface
│   │   ├── provider-registry.ts   # Provider registry
│   │   ├── openai.provider.ts     # OpenAI provider
│   │   └── ...                    # Other providers
│   ├── services/
│   │   └── model-selection.service.ts  # Business logic
│   └── index.ts            # Main server implementation
├── build/                  # Compiled JavaScript files
├── .env.example            # Example environment variables
├── .env                    # Environment variables (not in git)
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Documentation
```

### Adding New Providers

To add a new provider:

1. Create a new file in the `src/providers` directory (e.g., `anthropic.provider.ts`)
2. Implement the `LLMProvider` interface
3. Register the provider in the `provider-registry.ts` file
4. Update the README.md with the new provider's models

### Adding New Models

To add new models for an existing provider:

1. Update the provider's `getPredefinedModels` method
2. Add the model's capabilities, costs, and other metadata

## Troubleshooting

### Common Issues

1. **Server not loading**
   - Check the path in the MCP settings file
   - Ensure the build file exists and has execute permissions
   - Check server logs for startup errors

2. **API key issues**
   - Verify API keys are correctly set in the .env file
   - Check for API key expiration or rate limiting

3. **Model not found**
   - Ensure the model ID is correct
   - Check if the provider for that model is configured

4. **Type errors**
   - Run `npm run build` to check for TypeScript errors
   - Fix any type issues in the code

## License

This project is licensed under the ISC License.