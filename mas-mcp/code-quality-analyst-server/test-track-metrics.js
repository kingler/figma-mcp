#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testTrackMetrics() {
  console.log('Testing track_metrics tool...');
  
  // Create a client that connects to the MCP server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js']
  });
  const client = new Client({
    name: 'test-track-metrics',
    version: '1.0.0'
  });
  
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected to MCP server successfully!');
    
    // Test track_metrics tool
    console.log('\n--- Testing track_metrics tool ---');
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
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close the client connection
    await client.close();
    console.log('Client connection closed');
  }
}

testTrackMetrics().catch(console.error);
