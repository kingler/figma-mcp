#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built server
const serverPath = join(__dirname, 'build', 'index.js');

// Create MCP request for generating tests for nodejs-analyzer.ts
const mcpRequest = {
  jsonrpc: '2.0',
  id: '1',
  method: 'mcp/callTool',
  params: {
    name: 'generate_tests',
    arguments: {
      scope: 'NodejsAnalyzer',
      type: 'unit',
      language: 'typescript',
      sourceFiles: ['src/services/code-analysis/nodejs-analyzer.ts', 'src/services/code-analysis/types.ts'],
      requirements: [
        'REQ-001: NodejsAnalyzer should correctly analyze JavaScript and TypeScript files',
        'REQ-002: NodejsAnalyzer should extract functions, classes, imports, and dependencies',
        'REQ-003: NodejsAnalyzer should handle different node types in the AST'
      ],
      coverage: 80,
      outputDir: './generated_tests/nodejs-analyzer'
    }
  }
};

console.log(`Generating tests for NodejsAnalyzer`);
console.log(`Arguments: ${JSON.stringify(mcpRequest.params.arguments, null, 2)}`);

// Start the server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Handle server output
let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('Received data:', output);
  
  // Check if we have a complete JSON response
  try {
    const lines = serverOutput.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const response = JSON.parse(line);
        if (response.id === '1') {
          console.log('\nReceived response from QA Engineer MCP Server:');
          console.log(JSON.stringify(response, null, 2));
          
          // Exit after receiving the response
          serverProcess.kill();
          process.exit(0);
        }
      }
    }
  } catch (error) {
    // Not a complete JSON response yet, continue collecting
  }
});

// Send the request to the server
setTimeout(() => {
  console.log('\nSending request to QA Engineer MCP Server...');
  
  // Format the request according to JSON-RPC over stdio
  const jsonRequest = JSON.stringify(mcpRequest);
  const contentLength = Buffer.byteLength(jsonRequest, 'utf8');
  
  // Write the header and the request
  serverProcess.stdin.write(`Content-Length: ${contentLength}\r\n\r\n${jsonRequest}`);
}, 1000);

// Handle server exit
serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});
