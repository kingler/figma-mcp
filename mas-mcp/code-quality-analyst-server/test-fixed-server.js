#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testFixedServer() {
  console.log('Testing fixed server...');
  
  // Create a client that connects to the fixed server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['fixed-server.js']
  });
  const client = new Client({
    name: 'test-fixed-server-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to fixed server...');
    await client.connect(transport);
    console.log('Connected to fixed server successfully!');
    
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
    
    // Test 3: Test analyze_code tool
    console.log('\n--- Test 3: Analyze Code Tool ---');
    try {
      const analysisResult = await client.callTool('analyze_code', {
        files: ['src/index.ts'],
        metrics: ['complexity', 'maintainability']
      });
      console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    } catch (error) {
      console.error('Error calling analyze_code tool:', error);
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

testFixedServer().catch(console.error);
