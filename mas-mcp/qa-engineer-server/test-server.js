#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SocketClientTransport } from '@modelcontextprotocol/sdk/client/socket.js';

async function runTests() {
  console.log('Starting QA Engineer MCP Server test...');
  
  // Create MCP client with socket transport
  // This assumes the server is running on the default port 3000
  const transport = new SocketClientTransport({
    host: 'localhost',
    port: 3000
  });
  
  const client = new Client();
  
  try {
    // Connect to the server
    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('Connected to server');
    
    // List available tools
    console.log('\nListing available tools:');
    const tools = await client.listTools();
    console.log(JSON.stringify(tools, null, 2));
    
    // Test generate_test_plan tool
    console.log('\nTesting generate_test_plan tool:');
    const testPlanResult = await client.callTool('generate_test_plan', {
      scope: 'Login Module',
      type: 'integration',
      requirements: ['REQ-001', 'REQ-002'],
      coverage: 90
    });
    console.log(JSON.stringify(testPlanResult, null, 2));
    
    // Extract testPlanId from the result
    const testPlanId = JSON.parse(testPlanResult.content[0].text).testPlanId;
    
    // Test execute_test tool
    console.log('\nTesting execute_test tool:');
    const executeTestResult = await client.callTool('execute_test', {
      testId: testPlanId,
      environment: 'staging',
      parameters: {
        user: 'testuser',
        timeout: 5000
      },
      retries: 2
    });
    console.log(JSON.stringify(executeTestResult, null, 2));
    
    // Test generate_automation_script tool
    console.log('\nTesting generate_automation_script tool:');
    const automationScriptResult = await client.callTool('generate_automation_script', {
      scenario: 'User Login Flow',
      framework: 'selenium',
      steps: [
        {
          action: 'navigate',
          target: 'https://example.com/login'
        },
        {
          action: 'type',
          target: '#username',
          value: 'testuser'
        },
        {
          action: 'click',
          target: '#login-button'
        }
      ]
    });
    console.log(JSON.stringify(automationScriptResult, null, 2));
    
    // Test collect_metrics tool
    console.log('\nTesting collect_metrics tool:');
    const metricsResult = await client.callTool('collect_metrics', {
      metrics: ['cpu', 'memory', 'response_time'],
      duration: 10,
      interval: 1
    });
    console.log(JSON.stringify(metricsResult, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Clean up
    console.log('\nCleaning up...');
    await client.close();
    console.log('Test completed');
  }
}

runTests().catch(console.error);
