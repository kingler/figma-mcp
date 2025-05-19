#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'devops-engineer-server',
  version: '1.0.0',
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log('DevOps Engineer Server is running');
});