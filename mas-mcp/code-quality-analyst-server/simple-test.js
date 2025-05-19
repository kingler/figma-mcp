#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function runSimpleTest() {
  console.log('Starting simple MCP client test...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'simple-test-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test: List available tools
    console.log('\n--- Test: List Tools ---');
    const toolsResponse = await client.listTools();
    console.log('Tools response:', JSON.stringify(toolsResponse, null, 2));
    
    if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
      console.log(`Server has ${toolsResponse.tools.length} tools available:`);
      toolsResponse.tools.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
      });
    } else {
      console.log('No tools available or unexpected response format');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

runSimpleTest().catch(console.error);
