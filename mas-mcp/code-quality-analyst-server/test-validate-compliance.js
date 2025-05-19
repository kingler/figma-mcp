#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testValidateCompliance() {
  console.log('Testing validate_compliance tool...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-validate-compliance',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test validate_compliance tool
    console.log('\n--- Testing validate_compliance tool ---');
    const validationResult = await client.callTool('validate_compliance', {
      files: ['src/index.ts', 'build/index.js'],
      standards: ['OWASP', 'PCI-DSS'],
      context: {
        environment: 'production'
      }
    });
    console.log('Validation result:', JSON.stringify(validationResult, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testValidateCompliance().catch(console.error);
