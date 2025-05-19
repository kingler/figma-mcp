#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testEcho() {
  console.log('Testing echo tool...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-echo-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test echo tool
    console.log('\n--- Testing echo tool ---');
    try {
      const echoResult = await client.callTool('echo', {
        message: 'Hello, world!'
      });
      console.log('Echo result:', echoResult);
    } catch (error) {
      console.error('Error calling echo tool:', error);
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testEcho().catch(console.error);
