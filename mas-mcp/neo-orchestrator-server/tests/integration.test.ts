import { expect } from 'chai';
import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '../src/index.ts');

describe('Neo Orchestrator MCP Server Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;
  
  before(async () => {
    // Set up client and transport
    client = new Client(
      {
        name: 'test-client',
        version: '0.1.0',
      },
      {
        capabilities: {},
      }
    );
    
    transport = new StdioClientTransport({
      command: 'ts-node',
      args: ['--esm', SERVER_PATH],
      env: process.env,
      stderr: 'pipe',
    });
    
    await client.connect(transport);
  });
  
  after(async () => {
    await client.close();
    await transport.close();
  });
  
  describe('BDI Reasoning Layer Integration', () => {
    it('should execute a complete BDI reasoning cycle', async () => {
      // Step 1: Add a belief
      const beliefResult = await client.request({
        method: 'tools/call',
        params: {
          name: 'belief_management',
          arguments: {
            belief: 'code_quality',
            action: 'add',
            value: 'high',
          },
        },
      });
      
      const beliefResponse = JSON.parse(beliefResult.content[0].text);
      expect(beliefResponse).to.have.property('success', true);
      
      // Step 2: Form a desire based on the belief
      const desireResult = await client.request({
        method: 'tools/call',
        params: {
          name: 'desire_formation',
          arguments: {
            goal: 'maintain_code_quality',
            priority: 8,
            context: 'Based on code_quality belief',
          },
        },
      });
      
      const desireResponse = JSON.parse(desireResult.content[0].text);
      expect(desireResponse).to.have.property('success', true);
      
      // Step 3: Select an intention to fulfill the desire
      const intentionResult = await client.request({
        method: 'tools/call',
        params: {
          name: 'intention_selection',
          arguments: {
            desire: 'maintain_code_quality',
            options: ['write_tests', 'refactor_code', 'code_review'],
            constraints: ['time_constraint', 'resource_constraint'],
          },
        },
      });
      
      const intentionResponse = JSON.parse(intentionResult.content[0].text);
      expect(intentionResponse).to.have.property('success', true);
      expect(intentionResponse).to.have.property('selectedIntention');
    });
  });
  
  describe('Workflow Integration', () => {
    it('should access and update workflow state', async () => {
      // Step 1: Read the current SDLC workflow state
      const readResult = await client.request({
        method: 'resources/read',
        params: {
          uri: 'neo://workflows/sdlc',
        },
      });
      
      const initialState = JSON.parse(readResult.contents[0].text);
      expect(initialState).to.have.property('currentPhase');
      expect(initialState).to.have.property('status');
      
      // Step 2: Read a specific phase
      const phaseResult = await client.request({
        method: 'resources/read',
        params: {
          uri: `neo://workflows/sdlc/${initialState.currentPhase}`,
        },
      });
      
      const phaseState = JSON.parse(phaseResult.contents[0].text);
      expect(phaseState).to.have.property('phase', initialState.currentPhase);
      expect(phaseState).to.have.property('artifacts');
    });
  });
});