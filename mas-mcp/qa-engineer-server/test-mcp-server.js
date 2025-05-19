#!/usr/bin/env node
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { resolve } from 'path';

// Path to the server executable
const serverPath = resolve('./build/index.js');

// Start the server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Create readline interface for reading server output
const rl = createInterface({
  input: serverProcess.stdout,
  crlfDelay: Infinity
});

// Function to send a message to the server
function sendMessage(message) {
  const jsonMessage = JSON.stringify(message);
  const contentLength = Buffer.byteLength(jsonMessage, 'utf8');
  
  // Write the header
  serverProcess.stdin.write(`Content-Length: ${contentLength}\r\n\r\n`);
  
  // Write the message
  serverProcess.stdin.write(jsonMessage);
  
  console.log(`Sent: ${JSON.stringify(message, null, 2)}`);
}

// Test sequence
async function runTests() {
  console.log('Starting QA Engineer MCP Server test...');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 1: List tools
  console.log('\nTest 1: Listing tools');
  sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'mcp/listTools',
    params: {}
  });
  
  // Test 2: Generate test plan
  console.log('\nTest 2: Generate test plan');
  sendMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'mcp/callTool',
    params: {
      name: 'generate_test_plan',
      arguments: {
        scope: 'Login Module',
        type: 'integration',
        requirements: ['REQ-001', 'REQ-002'],
        coverage: 90
      }
    }
  });
  
  // We'll store the test plan ID from the response
  let testPlanId = null;
  
  // Test 3: Execute test (will be sent after we get the test plan ID)
  function executeTest() {
    console.log('\nTest 3: Execute test');
    sendMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'mcp/callTool',
      params: {
        name: 'execute_test',
        arguments: {
          testId: testPlanId,
          environment: 'staging',
          parameters: {
            user: 'testuser',
            timeout: 5000
          },
          retries: 2
        }
      }
    });
  }
  
  // Test 4: Generate automation script
  function generateAutomationScript() {
    console.log('\nTest 4: Generate automation script');
    sendMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'mcp/callTool',
      params: {
        name: 'generate_automation_script',
        arguments: {
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
        }
      }
    });
  }
  
  // Test 5: Collect metrics
  function collectMetrics() {
    console.log('\nTest 5: Collect metrics');
    sendMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'mcp/callTool',
      params: {
        name: 'collect_metrics',
        arguments: {
          metrics: ['cpu', 'memory', 'response_time'],
          duration: 10,
          interval: 1
        }
      }
    });
  }
  
  // Process server responses
  rl.on('line', (line) => {
    // Skip empty lines and headers
    if (!line || line.startsWith('Content-')) return;
    
    try {
      const response = JSON.parse(line);
      console.log(`Received: ${JSON.stringify(response, null, 2)}`);
      
      // Extract test plan ID from response to test 2
      if (response.id === 2 && response.result && response.result.content) {
        const content = response.result.content[0].text;
        testPlanId = JSON.parse(content).testPlanId;
        console.log(`Extracted test plan ID: ${testPlanId}`);
        
        // Now that we have the test plan ID, execute the next test
        executeTest();
      }
      
      // After test 3 completes, run test 4
      if (response.id === 3) {
        generateAutomationScript();
      }
      
      // After test 4 completes, run test 5
      if (response.id === 4) {
        collectMetrics();
      }
      
      // After test 5 completes, finish the test
      if (response.id === 5) {
        console.log('\nAll tests completed successfully!');
        
        // Clean up
        setTimeout(() => {
          console.log('Cleaning up...');
          serverProcess.kill();
          process.exit(0);
        }, 1000);
      }
    } catch (error) {
      console.error('Error parsing server response:', error);
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Test interrupted, cleaning up...');
  serverProcess.kill();
  process.exit(0);
});

// Run the tests
runTests().catch(console.error);
