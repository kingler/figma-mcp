#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMcpBasic() {
  console.log('Testing MCP basic server...');
  
  // Create a client that connects to the MCP basic server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['mcp-basic-server.js']
  });
  const client = new Client({
    name: 'test-mcp-basic-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP basic server...');
    await client.connect(transport);
    console.log('Connected to MCP basic server successfully!');
    
    // Test 1: List available tools
    console.log('\n--- Test 1: List Tools ---');
    try {
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
    } catch (error) {
      console.error('Error listing tools:', error);
    }
    
    // Test 2: Test echo tool
    console.log('\n--- Test 2: Echo Tool ---');
    try {
      const echoResult = await client.callTool('echo', {
        message: 'Hello, world!'
      });
      console.log('Echo result:', JSON.stringify(echoResult, null, 2));
    } catch (error) {
      console.error('Error calling echo tool:', error);
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testMcpBasic().catch(console.error);
