const { MCPClient } = require('@modelcontextprotocol/sdk');
const fs = require('fs');
const path = require('path');

// Read the MCP configuration from the user's mcp.json file
const mcpConfigPath = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'mcp.json');
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));

// Initialize the MCP client
const client = new MCPClient({
  servers: Object.keys(mcpConfig.mcpServers).reduce((acc, serverName) => {
    acc[serverName] = {
      endpoint: 'stdio', // Using stdio transport by default
      env: mcpConfig.mcpServers[serverName].env || {}
    };
    return acc;
  }, {})
});

console.log('MCP Client configured with the following servers:');
console.log(Object.keys(mcpConfig.mcpServers));

// Example function to test the client
async function testClient() {
  try {
    // Example: If taskmaster-ai server is available, try to get tasks
    if (client.servers['taskmaster-ai']) {
      console.log('Testing connection to taskmaster-ai server...');
      
      // This is just an example - actual function call would depend on the server's API
      // const result = await client.servers['taskmaster-ai'].invoke('get_tasks', {
      //   projectRoot: process.cwd()
      // });
      // console.log('Tasks:', result);
    }
    
    console.log('Client setup successful. Use the client in your application by importing it.');
  } catch (error) {
    console.error('Error testing client:', error);
  }
}

// Export the client for use in other modules
module.exports = client;

// If this script is run directly, test the client
if (require.main === module) {
  testClient().catch(console.error);
} 