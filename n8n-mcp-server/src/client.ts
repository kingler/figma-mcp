#!/usr/bin/env node
/**
 * MCP Client for n8n
 * 
 * This script acts as an MCP client to interact with the n8n MCP server.
 * It creates a simple test workflow in n8n.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { printHeader, printSuccess, printError, printInfo } from './utils/colors.js';
import { getN8nServerPath, getN8nConfig } from './utils/config.js';

// Define a simplified type for tool results to avoid complex type issues
interface ToolResult {
  isError?: boolean;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

/**
 * Create a simple test workflow in n8n
 */
async function createWorkflow(client: Client): Promise<void> {
  printHeader('Creating Test Workflow');
  
  // List available tools
  printInfo('Listing available tools...');
  const tools = await client.listTools();
  
  const toolNames = tools.tools.map(tool => tool.name);
  printSuccess(`Found ${tools.tools.length} tools: ${toolNames.join(', ')}`);
  
  // Initialize connection to n8n
  printInfo('Initializing connection to n8n...');
  const n8nConfig = getN8nConfig();
  
  const initResult = await client.callTool({
    name: 'init-n8n',
    arguments: {
      url: n8nConfig.host,
      apiKey: n8nConfig.apiKey
    }
  }) as ToolResult;
  
  if (initResult.isError) {
    const errorText = getTextContent(initResult) || 'Unknown error';
    printError(`Failed to initialize connection to n8n: ${errorText}`);
    return;
  }
  
  // Extract client ID from the result
  let clientId: string | null = null;
  const resultText = getTextContent(initResult) || '';
  if (resultText.includes('client ID')) {
    clientId = resultText.split('client ID: ')[1].trim();
    printSuccess(`Successfully connected to n8n with client ID: ${clientId}`);
  } else {
    printError('Failed to extract client ID from result');
    return;
  }
  
  // Create a simple workflow
  printInfo('Creating test workflow...');
  
  // Define a simple workflow with a manual trigger node
  const workflowName = 'MCP Test Workflow';
  
  // Create nodes array with a manual trigger node
  const nodes = [
    {
      id: '1',
      name: 'Start',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [250, 300]
    },
    {
      id: '2',
      name: 'Set',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [470, 300],
      parameters: {
        values: {
          string: [
            {
              name: 'message',
              value: 'Hello from MCP!'
            }
          ]
        }
      }
    }
  ];
  
  // Create connections between nodes
  const connections = {
    Start: {
      main: [
        [
          {
            node: 'Set',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  };
  
  const createResult = await client.callTool({
    name: 'create-workflow',
    arguments: {
      clientId,
      name: workflowName,
      nodes,
      connections
    }
  }) as ToolResult;
  
  if (createResult.isError) {
    const errorText = getTextContent(createResult) || 'Unknown error';
    printError(`Failed to create workflow: ${errorText}`);
    return;
  }
  
  printSuccess(`Successfully created workflow: ${workflowName}`);
  
  // List workflows to verify
  printInfo('Listing workflows to verify creation...');
  
  const listResult = await client.callTool({
    name: 'list-workflows',
    arguments: {
      clientId
    }
  }) as ToolResult;
  
  if (listResult.isError) {
    const errorText = getTextContent(listResult) || 'Unknown error';
    printError(`Failed to list workflows: ${errorText}`);
    return;
  }
  
  printSuccess('Workflows retrieved successfully');
  
  // Parse the workflows JSON
  try {
    const workflowsText = getTextContent(listResult) || '[]';
    const workflows = JSON.parse(workflowsText);
    
    // Find our workflow
    let found = false;
    for (const workflow of workflows) {
      if (workflow.name === workflowName) {
        found = true;
        const workflowId = workflow.id;
        printSuccess(`Found our workflow with ID: ${workflowId}`);
        
        // Activate the workflow
        printInfo('Activating workflow...');
        
        const activateResult = await client.callTool({
          name: 'activate-workflow',
          arguments: {
            clientId,
            id: workflowId
          }
        }) as ToolResult;
        
        if (activateResult.isError) {
          const errorText = getTextContent(activateResult) || 'Unknown error';
          printError(`Failed to activate workflow: ${errorText}`);
        } else {
          printSuccess('Workflow activated successfully');
        }
        
        break;
      }
    }
    
    if (!found) {
      printError(`Could not find the created workflow: ${workflowName}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      printError('Failed to parse workflows JSON');
      printInfo(`Raw response: ${getTextContent(listResult) || 'No response'}`);
    } else {
      printError(`Error processing workflows: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  printHeader('n8n MCP Client');
  
  // Get the path to the n8n MCP server
  const serverPath = getN8nServerPath();
  printInfo(`Using n8n MCP server at: ${serverPath}`);
  
  // Create transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });
  
  // Create client
  const client = new Client(
    {
      name: 'n8n-client',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  // Connect to the n8n MCP server
  printInfo('Connecting to n8n MCP server...');
  
  try {
    await client.connect(transport);
    printSuccess('Connected to n8n MCP server');
    
    // Create a workflow
    await createWorkflow(client);
  } catch (error) {
    printError(`Error connecting to n8n MCP server: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
  } finally {
    // Close the client
    await client.close();
  }
  
  printHeader('Workflow Creation Complete');
}

/**
 * Helper function to extract text content from a tool result
 */
function getTextContent(result: ToolResult): string | undefined {
  if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
    return undefined;
  }
  
  const content = result.content[0];
  if (content && typeof content === 'object' && 'text' in content) {
    return content.text;
  }
  
  return undefined;
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
