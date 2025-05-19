# n8n MCP Server Setup

This guide explains how to set up and use the n8n MCP server with Claude Desktop.

## Overview

The n8n MCP server allows Claude to interact with your n8n instance, giving it the ability to:

- List and manage workflows
- View workflow details
- Execute workflows
- Manage credentials
- Handle tags and executions
- Generate security audits
- And more

## Setup Instructions

### 1. Get your n8n API Key

1. Log into your n8n instance
2. Click your user icon in the bottom left
3. Go to Settings
4. Select API
5. Click "Create API Key"
6. Copy your API key (you won't be able to see it again)

### 2. Install the n8n MCP Server

#### Option 1: Install from npm (Recommended)

```bash
npm install -g @illuminaresolutions/n8n-mcp-server
```

#### Option 2: Install from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/illuminaresolutions/n8n-mcp-server.git
   cd n8n-mcp-server
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

### 3. Configure Claude Desktop

1. Open your Claude Desktop configuration:
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   If the file doesn't exist, create it with the following content:
   ```json
   {
     "mcpServers": {}
   }
   ```

2. Add the n8n configuration:
   ```json
   {
     "mcpServers": {
        "n8n": {
         "command": "n8n-mcp-server",
         "env": {
           "N8N_HOST": "https://your-n8n-instance.com",
           "N8N_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

   Replace `https://your-n8n-instance.com` with your n8n instance URL and `your-api-key-here` with your n8n API key.

### 4. Test the Setup

1. Run the test tool to verify the setup:
   ```bash
   n8n-mcp-test
   ```

   This will check if:
   - The n8n MCP server is properly built
   - The Claude Desktop configuration is correct
   - The connection to your n8n instance is working

2. If the test passes, you should see:
   ```
   === Test Complete ===

   ✓ n8n-mcp-server is properly configured and can connect to the n8n instance
   ℹ You can now restart Claude Desktop to use the n8n-mcp-server
   ℹ After restarting, you should see the n8n tools available in Claude
   ```

### 5. Restart Claude Desktop

1. Quit Claude Desktop completely (not just close the window)
2. Restart Claude Desktop

### 6. Verify the Connection

1. After Claude Desktop starts, look for the hammer icon in the bottom right corner of the chat input
2. Click on the hammer icon to see the available tools
3. You should see tools like `init-n8n`, `list-workflows`, etc.

## Using n8n in Conversations

Now you can ask Claude about your n8n workflows. For example:

- "List my n8n workflows and tell me what they do"
- "Create a new workflow in n8n that sends an email when a file is uploaded"
- "Show me the details of my workflow named 'Process Orders'"
- "Activate my workflow named 'Daily Report'"

## Available Tools

The n8n MCP server provides many tools, including:

- **Workflow Management**: Create, list, update, activate, and delete workflows
- **Credential Management**: Create and manage credentials for various services
- **Execution Monitoring**: View and manage workflow executions
- **Tag Management**: Create and manage tags for organizing workflows
- **Security Audit**: Generate security audits for your n8n instance
- **User Management**: Manage users in your n8n instance
- **Project Management**: Manage projects (requires n8n Enterprise)
- **Variable Management**: Manage variables (requires n8n Enterprise)

## Troubleshooting

If you encounter any issues:

1. **Run the test script again**
   ```
   n8n-mcp-test
   ```

2. **Check Claude Desktop logs**
   - Look for errors in the Claude Desktop logs
   - MacOS: `~/Library/Logs/Claude/mcp*.log`

3. **Verify n8n is running**
   - Make sure your n8n instance is running at the URL you provided
   - Check that your API key is valid

4. **Rebuild the server if needed**
   ```
   cd n8n-mcp-server
   npm run build
   ```

## Additional Resources

- [n8n Documentation](https://docs.n8n.io)
- [MCP Documentation](https://modelcontextprotocol.io)
