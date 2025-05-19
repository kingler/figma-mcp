/**
 * Unit test for figma-mcp server
 * 
 * This script tests the MCP protocol interaction step by step:
 * 1. Metadata request/response
 * 2. Discovery request/response
 * 3. Individual tool testing
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility function to log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Utility function to validate a tool definition
function validateToolDefinition(tool) {
  const issues = [];
  
  // Check required properties
  if (!tool.name) issues.push('Missing tool name');
  if (!tool.description) issues.push('Missing tool description');
  
  // Check parameters
  if (!tool.parameters) {
    issues.push('Missing parameters object');
  } else {
    if (!tool.parameters.type) issues.push('Missing parameters.type');
    if (!tool.parameters.properties) issues.push('Missing parameters.properties');
    
    // If properties is an object but empty, that's okay for tools with no params
    if (typeof tool.parameters.properties !== 'object') {
      issues.push('parameters.properties must be an object');
    }
    
    // required should be an array
    if (tool.parameters.required !== undefined && !Array.isArray(tool.parameters.required)) {
      issues.push('parameters.required must be an array');
    }
  }
  
      // Check examples
  if (!Array.isArray(tool.examples)) {
    issues.push('examples must be an array');
  } else if (tool.examples.length === 0) {
    issues.push('examples array is empty');
  } else {
    // Check each example
    tool.examples.forEach((example, index) => {
      if (!example.name) issues.push(`Example ${index} missing name`);
      if (!example.arguments && !example.hasOwnProperty('arguments')) {
        issues.push(`Example ${index} missing arguments`);
      }
    });
  }
  
  return issues;
}

// Run MCP client tests
async function runMcpTest() {
  log('Starting MCP protocol test', colors.blue);
  
  // Spawn the CLI process with stdio mode
  const cliPath = path.join(__dirname, 'bin', 'cli.js');
  const figmaApiKey = process.env.FIGMA_ACCESS_TOKEN || 'figd_GyoPqpgiQS2S3qRr5BNFY5VcixXi9MbTWwUmR81';
  
  log(`Spawning CLI process: node ${cliPath} --stdio --debug --figma-api-key ${figmaApiKey}`, colors.cyan);
  
  const child = spawn('node', [
    cliPath,
    '--stdio',
    '--debug',
    '--figma-api-key', figmaApiKey
  ], {
    env: {
      ...process.env,
      FIGMA_ACCESS_TOKEN: figmaApiKey,
      NODE_ENV: 'development',
      DEBUG: '1'
    }
  });

  // Buffer to collect output
  let outputBuffer = '';
  let errorBuffer = '';
  let metadataReceived = false;
  let toolsDiscovered = false;
  let discoveredTools = [];
  let testResults = {};

  // Collect stdout
  child.stdout.on('data', (data) => {
    const chunk = data.toString();
    outputBuffer += chunk;

    try {
      // Process complete JSON responses
      const lines = outputBuffer.split('\n');
      
      // Process all complete lines (all but the last one)
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const response = JSON.parse(line);
          
          // Process metadata response
          if (response.type === 'metadata') {
            log('Received metadata response:', colors.green);
            log(JSON.stringify(response, null, 2), colors.green);
            metadataReceived = true;
            
            // Send discovery request after metadata is received
            sendDiscoveryRequest();
          }
          
          // Process discovery response
          else if (response.type === 'discovery') {
            log('Received discovery response:', colors.green);
            log(`Found ${response.tools.length} tools`, colors.green);
            toolsDiscovered = true;
            discoveredTools = response.tools;
            
            // Validate each tool
            log('\nValidating tool definitions:', colors.blue);
            let allValid = true;
            
            discoveredTools.forEach(tool => {
              const issues = validateToolDefinition(tool);
              
              if (issues.length === 0) {
                log(`✅ ${tool.name}: Valid`, colors.green);
              } else {
                log(`❌ ${tool.name}: Invalid`, colors.red);
                issues.forEach(issue => {
                  log(`   - ${issue}`, colors.red);
                });
                allValid = false;
              }
            });
            
            if (allValid) {
              log('\nAll tool definitions are valid', colors.green);
              // Test each tool
              testTools();
            } else {
              log('\nFound issues with tool definitions. Fix them before testing tools.', colors.red);
              child.kill();
            }
          }
          
          // Process tool response
          else if (response.success !== undefined) {
            const currentTest = Object.values(testResults).find(test => test.status === 'pending');
            if (currentTest) {
              currentTest.status = 'completed';
              currentTest.result = response;
              log(`Tool test "${currentTest.name}" completed`, colors.green);
              log(JSON.stringify(response, null, 2), colors.cyan);
              
              // Start the next test
              const nextTest = Object.values(testResults).find(test => test.status === 'waiting');
              if (nextTest) {
                runToolTest(nextTest);
              } else {
                // All tests completed
                log('\nAll tests completed', colors.magenta);
                summarizeResults();
                child.kill();
              }
            }
          }
          
          // Process error response
          else if (response.error) {
            const currentTest = Object.values(testResults).find(test => test.status === 'pending');
            if (currentTest) {
              currentTest.status = 'failed';
              currentTest.error = response.error;
              log(`Tool test "${currentTest.name}" failed: ${response.error}`, colors.red);
              
              // Start the next test
              const nextTest = Object.values(testResults).find(test => test.status === 'waiting');
              if (nextTest) {
                runToolTest(nextTest);
              } else {
                // All tests completed
                log('\nAll tests completed', colors.magenta);
                summarizeResults();
                child.kill();
              }
            } else {
              log(`Error response: ${response.error}`, colors.red);
            }
          }
        } catch (err) {
          log(`Error parsing line: ${line}`, colors.red);
          log(`Parse error: ${err.message}`, colors.red);
        }
      }
      
      // Keep the last (potentially incomplete) line
      outputBuffer = lines[lines.length - 1];
      
    } catch (err) {
      log(`Error processing output: ${err.message}`, colors.red);
    }
  });

  // Collect stderr (for debug output)
  child.stderr.on('data', (data) => {
    errorBuffer += data.toString();
    // Only show debug output if uncommented
    // console.error(`stderr: ${data}`);
  });

  // Handle process exit
  child.on('close', (code) => {
    log(`\nChild process exited with code ${code}`, colors.blue);
    
    if (!toolsDiscovered) {
      log('No tools were discovered before the process exited.', colors.red);
      log('Debug output:', colors.yellow);
      console.error(errorBuffer);
    }
    
    // Just for good measure, kill the process
    process.exit();
  });

  // Send discovery request
  function sendDiscoveryRequest() {
    log('\nSending discovery request', colors.blue);
    const discoveryRequest = {
      type: 'discovery'
    };
    child.stdin.write(JSON.stringify(discoveryRequest) + '\n');
  }

  // Test all tools
  function testTools() {
    log('\nPreparing to test tools', colors.blue);
    
    // Initialize test results
    discoveredTools.forEach(tool => {
      const toolName = tool.name.includes('.') ? tool.name.split('.')[1] : tool.name;
      
      // Get the first example arguments
      let args = {};
      if (tool.examples && tool.examples.length > 0) {
        args = tool.examples[0].arguments || {};
      }
      
      testResults[toolName] = {
        name: toolName,
        fullName: tool.name,
        status: 'waiting',
        args,
        result: null,
        error: null
      };
    });
    
    // Start testing the first tool
    const firstTest = Object.values(testResults)[0];
    if (firstTest) {
      runToolTest(firstTest);
    } else {
      log('No tools to test', colors.yellow);
      child.kill();
    }
  }

  // Run a tool test
  function runToolTest(test) {
    log(`\nTesting tool: ${test.fullName}`, colors.blue);
    test.status = 'pending';
    
    const request = {
      function: test.fullName,
      args: test.args
    };
    
    log(`Sending request:`, colors.blue);
    log(JSON.stringify(request, null, 2), colors.cyan);
    
    child.stdin.write(JSON.stringify(request) + '\n');
  }

  // Summarize test results
  function summarizeResults() {
    log('\n===== TEST RESULTS =====', colors.magenta);
    
    Object.values(testResults).forEach(test => {
      if (test.status === 'completed') {
        log(`✅ ${test.fullName}: SUCCESS`, colors.green);
      } else if (test.status === 'failed') {
        log(`❌ ${test.fullName}: FAILED - ${test.error}`, colors.red);
      } else {
        log(`⚠️  ${test.fullName}: ${test.status.toUpperCase()}`, colors.yellow);
      }
    });
  }
}

// Run the test
runMcpTest(); 