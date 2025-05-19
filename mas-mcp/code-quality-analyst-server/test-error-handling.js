#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testErrorHandling() {
  console.log('Testing error handling...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-error-handling',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test 1: Missing required parameter
    console.log('\n--- Test 1: Missing required parameter ---');
    try {
      await client.callTool('analyze_code', {
        // Missing required 'files' parameter
        metrics: ['complexity']
      });
      console.log('ERROR: Should have thrown an error for missing required parameter');
    } catch (error) {
      console.log('Successfully caught error for missing required parameter:', error.message);
    }
    
    // Test 2: Invalid tool name
    console.log('\n--- Test 2: Invalid tool name ---');
    try {
      await client.callTool('nonexistent_tool', {});
      console.log('ERROR: Should have thrown an error for invalid tool name');
    } catch (error) {
      console.log('Successfully caught error for invalid tool name:', error.message);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testErrorHandling().catch(console.error);
