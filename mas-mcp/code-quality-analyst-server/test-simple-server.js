#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testSimpleServer() {
  console.log('Testing simple server...');
  
  // Create a client that connects to the simple server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['simple-server.js']
  });
  const client = new Client({
    name: 'test-simple-server-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to simple server...');
    await client.connect(transport);
    console.log('Connected to simple server successfully!');
    
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

testSimpleServer().catch(console.error);
