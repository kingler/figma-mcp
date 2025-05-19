# Figma MCP Unified Server

A comprehensive Model Context Protocol (MCP) server that provides integration with Figma's API. This implementation consolidates tools from multiple Figma MCP server implementations to provide a unified interface for AI assistants to interact with Figma.

## Features

- 🔑 **Secure authentication** with Figma API
- 📁 **File operations**
  - Get file data
  - List files in projects/teams
  - Access file nodes
  - Get file comments
  - Export images
- 🎨 **Component operations**
  - Get component data
  - Analyze component structure
  - Find component instances
  - Work with component sets (variants)
- 🔄 **Variable & design token management**
  - Get variables and collections
  - Analyze variable usage
  - Extract design tokens in multiple formats (JSON, CSS, SCSS)
  - Compare variable collections for consistency
- 🚀 **Performance optimized**
  - LRU caching
  - Rate limit handling
  - Connection pooling
- 📊 **Comprehensive monitoring**
  - Health checks
  - Usage statistics
  - Error tracking
- 🌐 **Multiple transport modes**
  - HTTP REST API
  - Server-Sent Events (SSE)

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/figma-mcp-unified.git
cd figma-mcp-unified

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env file with your Figma access token
```

### Global Installation

You can install the server globally to use it from anywhere on your system:

```bash
# From the repository
cd figma-mcp-unified
./scripts/install-global.sh

# Or directly using npm
npm install -g figma-mcp-unified
```

After global installation, you can start the server from anywhere using:

```bash
figma-mcp --figma-api-key YOUR_API_KEY
# or
figma-mcp-unified --figma-api-key YOUR_API_KEY
```

## Usage

### Starting the Server

```bash
# Start the server locally
npm start

# Or if installed globally
figma-mcp --port 3000 --figma-api-key YOUR_API_KEY
```

The server will start on port 3000 by default, or you can specify a different port in the `.env` file.

### Docker Deployment

You can also run the server using Docker:

```bash
# Build the Docker image
docker build -t figma-mcp-unified .

# Run the container
docker run -p 3000:3000 --env-file .env figma-mcp-unified
```

### CLI Options

When running globally, you can use these command line options:

```
Options:
  --port <number>         Set the server port (default: 3000 or PORT env var)
  --figma-api-key <key>   Set the Figma API key (default: FIGMA_ACCESS_TOKEN env var)
  --debug                 Enable debug mode with verbose logging
  --help, -h              Show this help message
```

## API Documentation

### Available Tools

#### File Tools

- `get-file`: Retrieve a Figma file by key
- `list-files`: List files in a Figma project or team
- `get-file-nodes`: Get specific nodes from a Figma file
- `get-file-comments`: Get comments for a Figma file
- `post-file-comment`: Post a comment on a Figma file
- `get-file-versions`: Get version history for a Figma file
- `export-file-images`: Export images from a Figma file
- `get-image-fills`: Get image fill URLs from a Figma file

#### Component Tools

- `get-component`: Get details for a specific component by key
- `get-file-components`: Get all components in a Figma file
- `get-component-instances`: Find all instances of a component in a file
- `analyze-component-structure`: Analyze the structure of a component
- `get-component-sets`: Get component sets (variants) in a file
- `get-file-styles`: Get all styles in a Figma file

#### Variable Tools

- `get-file-variables`: Get all variables and variable collections in a Figma file
- `analyze-variable-usage`: Analyze how variables are used in a Figma file
- `extract-design-tokens`: Extract design tokens from Figma variables in a structured format
- `compare-variable-collections`: Compare variable collections across modes to find inconsistencies

### Available Resources

- `current-user`: Information about the current Figma user
- `file-structure`: Figma file structure and hierarchy

## Configuration

The server can be configured via environment variables:

- `FIGMA_ACCESS_TOKEN`: Your Figma access token (required)
- `PORT`: Port to listen on (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CACHE_TTL`: Cache time-to-live in milliseconds (default: 300000, 5 minutes)
- `CACHE_MAX_ITEMS`: Maximum items in cache (default: 500)
- `LOG_LEVEL`: Logging level (default: info)
- `SUPABASE_URL`: Supabase project URL (for Supabase integration)
- `SUPABASE_KEY`: Supabase API key (for Supabase integration)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for admin operations (optional)

## Supabase Integration

This server can integrate with [Supabase](https://supabase.com/) to store design data and enable persistence across sessions. The Supabase integration provides:

- Storage of design tokens and components
- User feedback tracking
- Design asset management
- Custom SQL queries for advanced data analysis
- Synchronization between Figma and your database

To use the Supabase integration:

1. Create a Supabase project at [supabase.com](https://supabase.com/)
2. Set up the required tables in your Supabase project:
   - `design_projects`
   - `design_components`
   - `design_assets`
   - `design_tokens`
   - `user_feedback`
3. Configure your `.env` file with Supabase credentials
4. Run the server using the Supabase implementation: `node examples/supabase-server.js`

See the `examples/supabase-server.js` file for a complete implementation example.

## MCP Integration

This server implements the [Model Context Protocol](https://modelcontextprotocol.io/), making it compatible with various AI assistants like:

- Claude Desktop
- Anthropic Claude API
- Other MCP-compatible clients

### Claude Desktop Configuration

#### Automatic Installation

The easiest way to configure this server in Claude Desktop is to use the included installation script:

```bash
# Run the installation script
npm run install:claude
```

This script will:
1. Ask for your Figma API token
2. Detect the Claude Desktop configuration location
3. Install the server configuration with the correct paths
4. Prompt you to restart Claude Desktop

#### Manual Configuration

Alternatively, you can manually configure the server in Claude Desktop:

1. Edit your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following configuration:

```json
{
  "mcpServers": {
    "figma": {
      "command": "figma-mcp",
      "args": ["--figma-api-key", "your_token_here"],
      "env": {}
    }
  }
}
```

## Examples

### Using with Claude

```
I need to analyze a Figma file to understand its component structure.

File key: abc123
```

Claude can now use the MCP server to:
1. Get the file data
2. List components in the file
3. Analyze component structures
4. Extract design tokens
5. Provide useful insights about the design system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

This project consolidates tools from several Figma MCP server implementations:
- [TimHolden/figma-mcp-server](https://github.com/TimHolden/figma-mcp-server)
- [moonray/mcp-figma](https://github.com/moonray/mcp-figma)
- [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)
- [sanjeev23oct/figma-mcp](https://github.com/sanjeev23oct/figma-mcp)
- [ai-zerolab/mcp-toolbox](https://github.com/ai-zerolab/mcp-toolbox)
- [yhc984/cursor-talk-to-figma-mcp-main](https://github.com/yhc984/cursor-talk-to-figma-mcp-main)
- [StudentOfJS/mcp-figma-to-react](https://github.com/StudentOfJS/mcp-figma-to-react)
- [kailashAppDev/figma-mcp-toolkit](https://github.com/kailashAppDev/figma-mcp-toolkit)
- [yajihum/design-system-mcp](https://github.com/yajihum/design-system-mcp)
- [ArchimedesCrypto/figma-mcp-chunked](https://github.com/ArchimedesCrypto/figma-mcp-chunked)
- [sichang824/mcp-figma](https://github.com/sichang824/mcp-figma)
- [f2c-ai/f2c-mcp](https://github.com/f2c-ai/f2c-mcp) 