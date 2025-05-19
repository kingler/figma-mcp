#!/usr/bin/env node

/**
 * Figma MCP Tools Test Runner
 * 
 * This script runs both unit tests and integration tests for the Figma MCP tools.
 * Usage: node run-tests.js [--unit|--integration]
 */

// Parse command line arguments
const args = process.argv.slice(2);
const runUnitTests = args.includes('--unit') || (!args.includes('--unit') && !args.includes('--integration'));
const runIntegrationTests = args.includes('--integration') || (!args.includes('--unit') && !args.includes('--integration'));

console.log('=== Figma MCP Tools Test Runner ===\n');

// Async function to run all tests
async function runAllTests() {
  try {
    // Run unit tests if requested
    if (runUnitTests) {
      console.log('Running unit tests...\n');
      await new Promise((resolve) => {
        require('./tool-tests');
        // Wait a bit for tests to complete
        setTimeout(resolve, 100);
      });
    }
    
    // Run integration tests if requested
    if (runIntegrationTests) {
      if (runUnitTests) {
        console.log('\n---------------------------------\n');
      }
      console.log('Running integration tests...\n');
      const { runIntegrationTests } = require('./integration-tests');
      await runIntegrationTests();
    }
    
    console.log('\n=== All Tests Completed ===');
    process.exit(0);
  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

// Run the tests
runAllTests(); 