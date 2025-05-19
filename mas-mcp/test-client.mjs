#!/usr/bin/env node
import { setupMCPClients } from './mcp-client.mjs';

async function runTest() {
  try {
    console.log('Setting up MCP clients...');
    const clients = await setupMCPClients();
    
    if (clients['neo-orchestrator']) {
      console.log('\n===== Testing Neo Orchestrator MCP Server =====');
      
      try {
        // List available tools
        const toolsResult = await clients['neo-orchestrator'].client.request({
          method: 'tools/list',
          params: {}
        });
        
        console.log('\nAvailable tools in neo-orchestrator:');
        console.log(JSON.stringify(toolsResult, null, 2));
        
        // Test belief_management tool
        console.log('\nTesting belief_management tool...');
        const beliefResult = await clients['neo-orchestrator'].client.request({
          method: 'tools/call',
          params: {
            name: 'belief_management',
            arguments: {
              belief: 'system_status',
              action: 'add',
              value: 'operational'
            }
          }
        });
        
        console.log('\nBelief management result:');
        console.log(JSON.stringify(beliefResult, null, 2));
      } catch (error) {
        console.error('Error calling neo-orchestrator:', error);
      }
    } else {
      console.log('neo-orchestrator client not available.');
    }
    
    if (clients['analysis-mcp']) {
      console.log('\n===== Testing Analysis MCP Server =====');
      
      try {
        // List available tools
        const toolsResult = await clients['analysis-mcp'].client.request({
          method: 'tools/list',
          params: {}
        });
        
        console.log('\nAvailable tools in analysis-mcp:');
        console.log(JSON.stringify(toolsResult, null, 2));
      } catch (error) {
        console.error('Error calling analysis-mcp:', error);
      }
    } else {
      console.log('analysis-mcp client not available.');
    }
    
    console.log('\nAvailable clients:', Object.keys(clients).join(', '));
    console.log('\nTest completed. Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest(); 