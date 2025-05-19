#!/usr/bin/env node
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class OrchestrationServer {
  private server: MCPServer;

  constructor() {
    const transport = new StdioServerTransport();
    this.server = new MCPServer({
      name: 'orchestration-server',
      version: '1.0.0',
      transport,
    });

    // Error handling
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    this.server.oninitialized = () => {
      console.error('orchestration MCP server initialized and running on stdio');
    };
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new OrchestrationServer();
server.run().catch(console.error);
