#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function debugTest() {
  console.log('Starting debug test...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'debug-test-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test analyze_code tool with minimal arguments
    console.log('\n--- Testing analyze_code tool with minimal arguments ---');
    try {
      const analysisResult = await client.callTool('analyze_code', {
        files: ['src/index.ts'],
        metrics: ['complexity']
      });
      console.log('Analysis result received successfully!');
      console.log('Result type:', typeof analysisResult);
      console.log('Result structure:', Object.keys(analysisResult));
    } catch (error) {
      console.error('Error calling analyze_code tool:', error);
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

debugTest().catch(console.error);
