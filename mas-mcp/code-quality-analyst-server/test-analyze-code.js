#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testAnalyzeCode() {
  console.log('Testing analyze_code tool...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-analyze-code',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test analyze_code tool
    console.log('\n--- Testing analyze_code tool ---');
    const analysisResult = await client.callTool('analyze_code', {
      files: ['src/index.ts'],
      metrics: ['complexity', 'maintainability']
    });
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testAnalyzeCode().catch(console.error);
