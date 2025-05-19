#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function runTests() {
  console.log('Starting MCP client tests...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-mcp-client',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test 1: List available tools
    console.log('\n--- Test 1: List Tools ---');
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
    
    // Test 2: Test analyze_code tool
    console.log('\n--- Test 2: Analyze Code ---');
    const analysisResult = await client.callTool('analyze_code', {
      files: ['src/index.ts', 'test-mcp-client.js'],
      metrics: ['complexity', 'maintainability', 'security']
    });
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    
    // Test 3: Test review_changes tool
    console.log('\n--- Test 3: Review Changes ---');
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
    
    // Test 4: Test track_metrics tool
    console.log('\n--- Test 4: Track Metrics ---');
    const trackingResult = await client.callTool('track_metrics', {
      project: 'code-quality-analyst-server',
      metrics: [
        { name: 'code-coverage', threshold: 80 },
        { name: 'bug-count', trend: 'decreasing' }
      ],
      timeframe: {
        start: '2025-01-01T00:00:00Z',
        end: '2025-03-16T00:00:00Z'
      }
    });
    console.log('Tracking result:', JSON.stringify(trackingResult, null, 2));
    
    // Test 5: Test validate_compliance tool
    console.log('\n--- Test 5: Validate Compliance ---');
    const validationResult = await client.callTool('validate_compliance', {
      files: ['src/index.ts', 'build/index.js'],
      standards: ['OWASP', 'PCI-DSS'],
      context: {
        environment: 'production'
      }
    });
    console.log('Validation result:', JSON.stringify(validationResult, null, 2));
    
    // Test 6: Test error handling with invalid arguments
    console.log('\n--- Test 6: Error Handling ---');
    try {
      await client.callTool('analyze_code', {
        // Missing required 'files' parameter
        metrics: ['complexity']
      });
      console.log('ERROR: Should have thrown an error for missing required parameter');
    } catch (error) {
      console.log('Successfully caught error for missing required parameter:', error.message);
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

runTests().catch(console.error);
