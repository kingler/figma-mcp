import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample text with various patterns to test compression
const testText = `
function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
        total += item.price;
    }
    return total;
}

This is a long sentence with multiple syllables that should be compressed while maintaining readability for language models but reducing token usage significantly.
`;

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
                runTests();
            } else if (result.result?.content?.[0]?.text) {
                process.stdout.write('\nTool result: ' + result.result.content[0].text + '\n');
            }
        } catch (err) {
            process.stderr.write('Failed to parse response: ' + err + '\n');
        }
    }
});

function runTests() {
    process.stdout.write('\nTesting code compression with keyword preservation:\n');
    sendRequest('tools/call', {
        name: 'compress_context',
        arguments: {
            text: testText,
            options: {
                preserveKeywords: true,
                compressionLevel: 0.5
            }
        }
    });

    setTimeout(() => {
        process.stdout.write('\nTesting aggressive compression with vowel removal:\n');
        sendRequest('tools/call', {
            name: 'compress_context',
            arguments: {
                text: testText,
                options: {
                    removeVowels: true,
                    compressionLevel: 0.8
                }
            }
        });

        setTimeout(() => {
            process.stdout.write('\nTesting decompression:\n');
            sendRequest('tools/call', {
                name: 'decompress_context',
                arguments: {
                    text: 'Ths s cmprssd txt wth n vwls',
                    options: {
                        compressionLevel: 0.8
                    }
                }
            });

            setTimeout(() => {
                process.stdout.write('\nTesting compression analysis:\n');
                sendRequest('tools/call', {
                    name: 'analyze_compression',
                    arguments: {
                        original: testText,
                        compressed: 'Ths s cmprssd txt'
                    }
                });

                setTimeout(() => {
                    process.stdout.write('\nShutting down...\n');
                    server.kill();
                    process.exit(0);
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

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