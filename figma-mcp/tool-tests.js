/**
 * Unit tests for Figma MCP tools
 * 
 * This file contains dedicated tests for each tool in the Figma MCP server.
 * It tests both successful and error cases for each tool.
 */

const assert = require('assert');
const { createMinimalTools } = require('./minimal-tools');
const { createMockToolHandlers, MockFigmaAPI } = require('./test-helpers');

// Get all tools with mock handlers
const tools = createMockToolHandlers(createMinimalTools());

// Test results collection
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test runner utility
async function runTest(testName, testFn) {
  console.log(`Running test: ${testName}`);
  try {
    await testFn();
    console.log(`✅ PASS: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAIL: ${testName} - ${error.message}`);
    testResults.errors.push({ name: testName, error: error.message });
    testResults.failed++;
  }
}

// Main test function
async function runTests() {
  console.log('=== FIGMA MCP TOOL UNIT TESTS ===\n');
  
  // Test 'test' tool
  await runTest('Test tool - successful connection', async () => {
    const testTool = tools.get('test');
    assert(testTool, 'Test tool not found');
    
    const result = await testTool.handler({});
    assert(result.success === true, 'Test tool should return success: true');
    assert(typeof result.message === 'string', 'Test tool should return a message string');
    assert(result.message.includes('connection is working'), 'Test tool message should confirm connection');
    assert(typeof result.timestamp === 'string', 'Test tool should return a timestamp string');
  });
  
  // Test 'get-file' tool
  await runTest('Get file tool - successful retrieval', async () => {
    const getFileTool = tools.get('get-file');
    assert(getFileTool, 'Get file tool not found');
    
    const fileKey = 'abc123';
    const result = await getFileTool.handler({ fileKey });
    
    assert(result.success === true, 'Get file tool should return success: true');
    assert(result.file, 'Get file tool should return a file object');
    assert(result.file.key === fileKey, 'Get file tool should return the requested file key');
    assert(typeof result.file.name === 'string', 'Get file tool should return a file name');
  });
  
  await runTest('Get file tool - missing fileKey', async () => {
    const getFileTool = tools.get('get-file');
    const result = await getFileTool.handler({});
    
    assert(result.success === false, 'Get file tool should return success: false when fileKey is missing');
    assert(result.error.includes('fileKey'), 'Error should mention the missing fileKey parameter');
  });
  
  await runTest('Get file tool - API error handling', async () => {
    // Create a special mock with an error case
    const errorMock = new MockFigmaAPI();
    // Override the getFile method to throw an error
    errorMock.getFile = () => {
      throw new Error('API connection error');
    };
    
    const getFileTool = createMinimalTools().get('get-file');
    const result = await getFileTool.handler({ fileKey: 'abc123' }, { figmaAPI: errorMock });
    
    assert(result.success === false, 'Get file tool should return success: false on API error');
    assert(result.error.includes('API connection error'), 'Error should include API error message');
  });
  
  // Test 'get-components' tool
  await runTest('Get components tool - successful retrieval', async () => {
    const getComponentsTool = tools.get('get-components');
    assert(getComponentsTool, 'Get components tool not found');
    
    const fileKey = 'abc123';
    const result = await getComponentsTool.handler({ fileKey });
    
    assert(result.success === true, 'Get components tool should return success: true');
    assert(Array.isArray(result.components), 'Get components tool should return an array of components');
    assert(result.components.length > 0, 'Get components tool should return at least one component');
    assert(result.components[0].id, 'Components should have an id');
    assert(result.components[0].name, 'Components should have a name');
  });
  
  await runTest('Get components tool - missing fileKey', async () => {
    const getComponentsTool = tools.get('get-components');
    const result = await getComponentsTool.handler({});
    
    assert(result.success === false, 'Get components tool should return success: false when fileKey is missing');
    assert(result.error.includes('fileKey'), 'Error should mention the missing fileKey parameter');
  });
  
  await runTest('Get components tool - empty components', async () => {
    // Create a mock with empty components array
    const emptyMock = new MockFigmaAPI({
      components: [] // Empty components
    });
    
    const getComponentsTool = createMinimalTools().get('get-components');
    const result = await getComponentsTool.handler({ fileKey: 'abc123' }, { figmaAPI: emptyMock });
    
    assert(result.success === true, 'Get components tool should return success: true even with empty components');
    assert(Array.isArray(result.components), 'Get components tool should return an array');
    assert(result.components.length === 0, 'Components array should be empty');
  });
  
  // Test 'get-design-tokens' tool
  await runTest('Get design tokens tool - successful retrieval (JSON format)', async () => {
    const getDesignTokensTool = tools.get('get-design-tokens');
    assert(getDesignTokensTool, 'Get design tokens tool not found');
    
    const fileKey = 'abc123';
    const result = await getDesignTokensTool.handler({ fileKey, format: 'json' });
    
    assert(result.success === true, 'Get design tokens tool should return success: true');
    assert(result.format === 'json', 'Format should be json');
    assert(result.tokens, 'Tokens object should be present');
    assert(result.tokens.colors, 'Tokens should include colors');
    assert(result.tokens.typography, 'Tokens should include typography');
    assert(result.tokens.spacing, 'Tokens should include spacing');
  });
  
  await runTest('Get design tokens tool - successful retrieval (CSS format)', async () => {
    const getDesignTokensTool = tools.get('get-design-tokens');
    
    const fileKey = 'abc123';
    const result = await getDesignTokensTool.handler({ fileKey, format: 'css' });
    
    assert(result.success === true, 'Get design tokens tool should return success: true');
    assert(result.format === 'css', 'Format should be css');
    assert(typeof result.tokens === 'string', 'CSS tokens should be a string');
    assert(result.tokens.includes(':root'), 'CSS tokens should include :root');
    assert(result.tokens.includes('--color-'), 'CSS tokens should include color variables');
    assert(result.tokens.includes('--typography-'), 'CSS tokens should include typography variables');
    assert(result.tokens.includes('--spacing-'), 'CSS tokens should include spacing variables');
  });
  
  await runTest('Get design tokens tool - default to JSON format', async () => {
    const getDesignTokensTool = tools.get('get-design-tokens');
    
    const fileKey = 'abc123';
    const result = await getDesignTokensTool.handler({ fileKey }); // No format specified
    
    assert(result.success === true, 'Get design tokens tool should return success: true');
    assert(result.format === 'json', 'Format should default to json');
  });
  
  await runTest('Get design tokens tool - missing fileKey', async () => {
    const getDesignTokensTool = tools.get('get-design-tokens');
    const result = await getDesignTokensTool.handler({ format: 'json' });
    
    assert(result.success === false, 'Get design tokens tool should return success: false when fileKey is missing');
    assert(result.error.includes('fileKey'), 'Error should mention the missing fileKey parameter');
  });
  
  await runTest('Get design tokens tool - unsupported format', async () => {
    const getDesignTokensTool = tools.get('get-design-tokens');
    const result = await getDesignTokensTool.handler({ fileKey: 'abc123', format: 'xml' });
    
    assert(result.success === false, 'Get design tokens tool should return success: false for unsupported format');
    assert(result.error.includes('format'), 'Error should mention unsupported format');
  });
  
  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\nFailed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}: ${error.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully! ✅');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
}); 