/**
 * Integration tests for Figma MCP
 * 
 * This file contains tests that verify the interaction between
 * Figma MCP tools and the MCP protocol.
 */

const assert = require('assert');
const { createMinimalTools } = require('./minimal-tools');
const { MockFigmaAPI } = require('./test-helpers');

// Mock console.log for testing
const originalConsoleLog = console.log;
let logOutput = [];

function mockConsoleLog(...args) {
  logOutput.push(args.join(' '));
}

function setupMockConsole() {
  logOutput = [];
  console.log = mockConsoleLog;
}

function resetConsole() {
  console.log = originalConsoleLog;
}

// Test results collection
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test runner utility
async function runTest(testName, testFn) {
  originalConsoleLog(`Running test: ${testName}`);
  try {
    await testFn();
    originalConsoleLog(`✅ PASS: ${testName}`);
    testResults.passed++;
  } catch (error) {
    originalConsoleLog(`❌ FAIL: ${testName} - ${error.message}`);
    testResults.errors.push({ name: testName, error: error.message });
    testResults.failed++;
  }
}

// Mock MCP client request
function mockMCPRequest(type, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: type,
    params: params
  });
}

// Parse MCP response
function parseMCPResponse(responseStr) {
  try {
    return JSON.parse(responseStr);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
}

// Process an MCP request and return the response
async function processMCPRequest(requestStr, tools, figmaAPI) {
  setupMockConsole();
  
  try {
    const request = JSON.parse(requestStr);
    const { method, params, id } = request;
    
    let result;
    
    // Handle metadata request
    if (method === 'metadata') {
      result = {
        name: 'Figma MCP',
        version: '1.0.0',
        description: 'MCP tools for Figma integration'
      };
    }
    // Handle discovery request
    else if (method === 'discovery') {
      const toolsList = [];
      for (const [name, tool] of tools.entries()) {
        toolsList.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        });
      }
      result = toolsList;
    }
    // Handle tool calls
    else {
      const tool = tools.get(method);
      if (!tool) {
        throw new Error(`Unknown tool: ${method}`);
      }
      
      const context = { figmaAPI };
      result = await tool.handler(params, context);
    }
    
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    
    resetConsole();
    return JSON.stringify(response);
  } catch (error) {
    resetConsole();
    
    return JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
}

// Main test function
async function runIntegrationTests() {
  originalConsoleLog('=== FIGMA MCP INTEGRATION TESTS ===\n');
  
  const tools = createMinimalTools();
  const figmaAPI = new MockFigmaAPI();
  
  // Test metadata request
  await runTest('Metadata request should return server info', async () => {
    const metadataRequest = mockMCPRequest('metadata');
    const response = await processMCPRequest(metadataRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result, 'Response should include result');
    assert(parsedResponse.result.name === 'Figma MCP', 'Server name should be "Figma MCP"');
    assert(typeof parsedResponse.result.version === 'string', 'Version should be a string');
  });
  
  // Test discovery request
  await runTest('Discovery request should return tool definitions', async () => {
    const discoveryRequest = mockMCPRequest('discovery');
    const response = await processMCPRequest(discoveryRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(Array.isArray(parsedResponse.result), 'Result should be an array of tools');
    assert(parsedResponse.result.length === 4, 'Should return 4 tools');
    
    // Check if all tools are included
    const toolNames = parsedResponse.result.map(tool => tool.name);
    assert(toolNames.includes('test'), 'Should include test tool');
    assert(toolNames.includes('get-file'), 'Should include get-file tool');
    assert(toolNames.includes('get-components'), 'Should include get-components tool');
    assert(toolNames.includes('get-design-tokens'), 'Should include get-design-tokens tool');
    
    // Check if tool definitions have the required fields
    parsedResponse.result.forEach(tool => {
      assert(tool.name, 'Tool should have a name');
      assert(tool.description, 'Tool should have a description');
      assert(tool.parameters, 'Tool should have parameters definition');
    });
  });
  
  // Test tool call - test
  await runTest('Test tool call should return success', async () => {
    const testRequest = mockMCPRequest('test', {});
    const response = await processMCPRequest(testRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === true, 'Result should indicate success');
    assert(parsedResponse.result.message, 'Response should include a message');
    assert(parsedResponse.result.timestamp, 'Response should include a timestamp');
  });
  
  // Test tool call - get-file
  await runTest('Get-file tool call should return file data', async () => {
    const getFileRequest = mockMCPRequest('get-file', { fileKey: 'abc123' });
    const response = await processMCPRequest(getFileRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === true, 'Result should indicate success');
    assert(parsedResponse.result.file, 'Response should include file data');
    assert(parsedResponse.result.file.key === 'abc123', 'File key should match request');
  });
  
  // Test tool call - get-components
  await runTest('Get-components tool call should return components list', async () => {
    const getComponentsRequest = mockMCPRequest('get-components', { fileKey: 'abc123' });
    const response = await processMCPRequest(getComponentsRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === true, 'Result should indicate success');
    assert(Array.isArray(parsedResponse.result.components), 'Response should include components array');
    assert(parsedResponse.result.components.length > 0, 'Components array should not be empty');
  });
  
  // Test tool call - get-design-tokens (JSON format)
  await runTest('Get-design-tokens tool call with JSON format should return tokens object', async () => {
    const getTokensRequest = mockMCPRequest('get-design-tokens', { 
      fileKey: 'abc123',
      format: 'json'
    });
    const response = await processMCPRequest(getTokensRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === true, 'Result should indicate success');
    assert(parsedResponse.result.format === 'json', 'Format should be json');
    assert(parsedResponse.result.tokens, 'Response should include tokens object');
    assert(parsedResponse.result.tokens.colors, 'Tokens should include colors');
  });
  
  // Test tool call - get-design-tokens (CSS format)
  await runTest('Get-design-tokens tool call with CSS format should return CSS string', async () => {
    const getTokensRequest = mockMCPRequest('get-design-tokens', { 
      fileKey: 'abc123',
      format: 'css'
    });
    const response = await processMCPRequest(getTokensRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === true, 'Result should indicate success');
    assert(parsedResponse.result.format === 'css', 'Format should be css');
    assert(typeof parsedResponse.result.tokens === 'string', 'Tokens should be a string');
    assert(parsedResponse.result.tokens.includes(':root'), 'CSS should include :root');
  });
  
  // Test error handling - missing parameter
  await runTest('Tool call with missing required parameter should return error', async () => {
    const badRequest = mockMCPRequest('get-file', {}); // Missing fileKey
    const response = await processMCPRequest(badRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.result.success === false, 'Result should indicate failure');
    assert(parsedResponse.result.error, 'Response should include error message');
    assert(parsedResponse.result.error.includes('fileKey'), 'Error should mention missing parameter');
  });
  
  // Test error handling - unknown tool
  await runTest('Call to unknown tool should return error', async () => {
    const unknownToolRequest = mockMCPRequest('non-existent-tool', {});
    const response = await processMCPRequest(unknownToolRequest, tools, figmaAPI);
    const parsedResponse = parseMCPResponse(response);
    
    assert(parsedResponse.error, 'Response should include error object');
    assert(parsedResponse.error.code === -32603, 'Error should have appropriate code');
    assert(parsedResponse.error.message.includes('Unknown tool'), 'Error should mention unknown tool');
  });
  
  // Summary
  originalConsoleLog('\n=== TEST SUMMARY ===');
  originalConsoleLog(`Total tests: ${testResults.passed + testResults.failed}`);
  originalConsoleLog(`Passed: ${testResults.passed}`);
  originalConsoleLog(`Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    originalConsoleLog('\nFailed Tests:');
    testResults.errors.forEach((error, index) => {
      originalConsoleLog(`${index + 1}. ${error.name}: ${error.error}`);
    });
    process.exit(1);
  } else {
    originalConsoleLog('\nAll integration tests passed successfully! ✅');
  }
}

// Run all tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests
}; 