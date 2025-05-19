#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testReviewChanges() {
  console.log('Testing review_changes tool...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-review-changes',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test review_changes tool
    console.log('\n--- Testing review_changes tool ---');
    const reviewResult = await client.callTool('review_changes', {
      diff: `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdefg 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,7 +10,7 @@ import {
 } from '@modelcontextprotocol/sdk/types.js';

-function validateInput(input) {
+function validateInput(input: any) {
   return typeof input === 'object' && input !== null;
 }`,
      context: {
        repository: 'code-quality-analyst-server',
        branch: 'main',
        commit: 'abc123'
      }
    });
    console.log('Review result:', JSON.stringify(reviewResult, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testReviewChanges().catch(console.error);
