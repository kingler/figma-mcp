#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testNeoOrchestratorServer() {
  // Create a client for the neo-orchestrator server
  const client = new Client({
    name: 'neo-orchestrator-test-client',
    version: '1.0.0'
  });
  
  // Set up error handler
  client.onerror = (error) => {
    console.error(`Client error:`, error);
  };
  
  // Create stdio transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'neo-orchestrator-server/build/index.js')],
    env: {
      ...process.env,
      LOG_LEVEL: 'info',
      NODE_ENV: 'development'
    }
  });
  
  try {
    // Connect the client to the transport
    await client.connect(transport);
    console.log('Connected to Neo Orchestrator MCP server');
    
    // List available tools
    console.log('\nRequesting list of tools...');
    const toolsResult = await client.request({
      method: 'tools/list',
      params: {}
    });
    
    console.log('\nAvailable tools:');
    console.log(JSON.stringify(toolsResult, null, 2));
    
    // Test belief_management tool
    console.log('\nTesting belief_management tool...');
    const beliefResult = await client.request({
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
    
    // Test desire_formation tool
    console.log('\nTesting desire_formation tool...');
    const desireResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'desire_formation',
        arguments: {
          goal: 'complete_task',
          priority: 8,
          context: 'User requested high-priority task completion'
        }
      }
    });
    
    console.log('\nDesire formation result:');
    console.log(JSON.stringify(desireResult, null, 2));
    
    // Test intention_selection tool
    console.log('\nTesting intention_selection tool...');
    const intentionResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'intention_selection',
        arguments: {
          desire: 'complete_task',
          options: ['use_method_a', 'use_method_b', 'delegate_task'],
          constraints: ['time_efficient', 'resource_minimal']
        }
      }
    });
    
    console.log('\nIntention selection result:');
    console.log(JSON.stringify(intentionResult, null, 2));
    
    // List available resources
    console.log('\nRequesting list of resources...');
    const resourcesResult = await client.request({
      method: 'resources/list',
      params: {}
    });
    
    console.log('\nAvailable resources:');
    console.log(JSON.stringify(resourcesResult, null, 2));
    
    // Close the connection
    await transport.close();
    console.log('\nDisconnected from server');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testNeoOrchestratorServer(); 