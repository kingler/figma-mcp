import { setupMCPClients } from './mcp-client.mjs';

async function runExample() {
  try {
    console.log('Setting up MCP clients...');
    const clients = await setupMCPClients();
    
    // Check if we have the taskmaster-ai client available
    if (clients['taskmaster-ai']) {
      console.log('\nUsing taskmaster-ai client to list available tools...');
      
      try {
        // First, list available tools
        const toolsResult = await clients['taskmaster-ai'].client.request({
          method: 'tools/list',
          params: {}
        });
        
        console.log('\nAvailable tools:');
        console.log(JSON.stringify(toolsResult, null, 2));
        
        // If get_tasks is available, call it
        if (toolsResult.tools && toolsResult.tools.some(tool => tool.name === 'get_tasks')) {
          console.log('\nCalling get_tasks...');
          
          const result = await clients['taskmaster-ai'].client.request({
            method: 'tools/call',
            params: {
              name: 'get_tasks',
              arguments: { 
                projectRoot: process.cwd(),
                withSubtasks: true
              }
            }
          });
          
          console.log('\nTask listing result:');
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error) {
        console.error('Error calling taskmaster-ai:', error);
      }
    } else {
      console.log('taskmaster-ai client not available.');
      console.log('Available clients:', Object.keys(clients).join(', '));
    }
    
    console.log('\nExample completed. Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
runExample(); 