import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const server = spawn('node', [join(__dirname, 'build', 'index.js')]);

// Helper to send MCP request
function sendRequest(method, params = {}) {
    const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
    };
    process.stdout.write('\nSending request: ' + JSON.stringify(request, null, 2) + '\n');
    server.stdin.write(JSON.stringify(request) + '\n');
}

// Process server output
server.stdout.on('data', (data) => {
    const responses = data.toString().split('\n').filter(Boolean);
    for (const response of responses) {
        try {
            const result = JSON.parse(response);
            process.stdout.write('\nReceived response: ' + JSON.stringify(result, null, 2) + '\n');
            
            if (result.error) {
                process.stderr.write('Error: ' + JSON.stringify(result.error) + '\n');
            } else if (result.result?.tools) {
                process.stdout.write('\nAvailable tools: ' + result.result.tools.map(t => t.name).join(', ') + '\n');
            }
        } catch (err) {
            process.stderr.write('Failed to parse response: ' + err + '\n');
        }
    }
});

// Handle errors
server.stderr.on('data', (data) => {
    process.stderr.write('Server error: ' + data.toString());
});

server.on('close', (code) => {
    process.stdout.write(`Server exited with code: ${code}\n`);
});

// First, send initialize request
setTimeout(() => {
    process.stdout.write('\nInitializing MCP connection...\n');
    sendRequest('initialize', {
        protocolVersion: '0.6.0',
        clientInfo: {
            name: 'test-client',
            version: '1.0.0'
        },
        capabilities: {
            tools: {}
        }
    });
}, 1000);

// Then list tools
setTimeout(() => {
    process.stdout.write('\nListing available tools...\n');
    sendRequest('tools/list');
}, 2000);

// Shutdown after 5 seconds
setTimeout(() => {
    process.stdout.write('\nShutting down...\n');
    server.kill();
    process.exit(0);
}, 5000); 