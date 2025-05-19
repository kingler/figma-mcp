#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built server
const serverPath = join(__dirname, 'build', 'index.js');

// Available tools to test
const tools = [
  {
    name: 'generate_test_plan',
    description: 'Generate a comprehensive test plan with test cases',
    arguments: {
      scope: 'User Authentication Module',
      type: 'unit',
      language: 'python',
      requirements: [
        'REQ-001: Users must be able to log in',
        'REQ-002: Passwords must be encrypted'
      ],
      coverage: 90
    }
  },
  {
    name: 'generate_tests',
    description: 'Generate and write test files for a project',
    arguments: {
      scope: 'User Authentication Module',
      type: 'unit',
      language: 'python',
      requirements: [
        'REQ-001: Users must be able to log in',
        'REQ-002: Passwords must be encrypted'
      ],
      coverage: 90,
      outputDir: './generated_tests'
    }
  },
  {
    name: 'generate_automation_script',
    description: 'Generate test automation script',
    arguments: {
      scenario: 'User Login Flow',
      language: 'python',
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
          action: 'type',
          target: '#password',
          value: 'password123'
        },
        {
          action: 'click',
          target: '#login-button'
        }
      ],
      outputFile: './automation/login_test.py'
    }
  }
];

// Get the tool to test from command line arguments or use default
const toolIndex = process.argv[2] ? parseInt(process.argv[2]) : 0;
const selectedTool = tools[toolIndex] || tools[0];

console.log(`Testing tool: ${selectedTool.name}`);
console.log(`Description: ${selectedTool.description}`);
console.log(`Arguments: ${JSON.stringify(selectedTool.arguments, null, 2)}`);

// Create MCP request
const mcpRequest = {
  jsonrpc: '2.0',
  id: '1',
  method: 'mcp/callTool',
  params: {
    name: selectedTool.name,
    arguments: selectedTool.arguments
  }
};

// Start the server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Handle server output
let buffer = '';
let contentLength = -1;

serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Process complete messages
  while (buffer.length > 0) {
    // If we don't have the content length yet, try to parse the header
    if (contentLength === -1) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (match) {
        contentLength = parseInt(match[1], 10);
        buffer = buffer.substring(match[0].length);
      } else {
        // Wait for more data
        break;
      }
    }
    
    // If we have the content length, check if we have enough data
    if (contentLength !== -1 && buffer.length >= contentLength) {
      const message = buffer.substring(0, contentLength);
      buffer = buffer.substring(contentLength);
      contentLength = -1;
      
      try {
        const response = JSON.parse(message);
        console.log('\nReceived response from QA Engineer MCP Server:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.id === '1') {
          // Exit after receiving the response
          serverProcess.kill();
          process.exit(0);
        }
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    } else {
      // Wait for more data
      break;
    }
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
