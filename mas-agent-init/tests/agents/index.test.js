/**
 * Tests for the agent integration module
 */

const agentIntegration = require('../../src/agents');

// Mock cursor API for testing
const mockCursorApi = {
  readFile: jest.fn(),
  listDirectory: jest.fn(),
  searchCode: jest.fn(),
  modifyFile: jest.fn(),
  // Include mock implementations of all cursor API methods
  FileReader: jest.fn(),
  parsers: {
    parseJSON: jest.fn(),
    parseCSV: jest.fn(),
    parseYAML: jest.fn(),
    autoDetectAndParse: jest.fn()
  }
};

describe('Agent Integration Module', () => {
  let integration;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize the integration module with mock API and config
    integration = agentIntegration.initialize({
      agentSettings: {
        defaultTimeout: 5000
      },
      integrationSettings: {
        preserveContext: true,
        maxMemoryEntries: 10
      }
    }, mockCursorApi);
  });
  
  describe('registerAgent', () => {
    test('should register a new agent successfully', () => {
      const result = integration.registerAgent('agent1', { name: 'Test Agent' });
      
      expect(result).toBe(true);
      expect(integration.getAgentById('agent1')).toMatchObject({
        id: 'agent1',
        name: 'Test Agent',
        connectedToCursor: false
      });
    });
    
    test('should overwrite an existing agent with warning', () => {
      // Register agent first time
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Spy on console.warn
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Register again with the same ID
      const result = integration.registerAgent('agent1', { name: 'Updated Agent' });
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Agent agent1 is already registered. Overwriting.');
      expect(integration.getAgentById('agent1')).toMatchObject({
        id: 'agent1',
        name: 'Updated Agent',
        connectedToCursor: false
      });
      
      // Restore console.warn
      consoleSpy.mockRestore();
    });
  });
  
  describe('getAgentById', () => {
    test('should return agent information if exists', () => {
      // Register an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Get the agent by ID
      const agent = integration.getAgentById('agent1');
      
      expect(agent).toMatchObject({
        id: 'agent1',
        name: 'Test Agent'
      });
    });
    
    test('should return null if agent does not exist', () => {
      const agent = integration.getAgentById('nonexistent');
      expect(agent).toBeNull();
    });
  });
  
  describe('listAgents', () => {
    test('should return an array of all registered agents', () => {
      // Register multiple agents
      integration.registerAgent('agent1', { name: 'Agent 1' });
      integration.registerAgent('agent2', { name: 'Agent 2' });
      
      // List all agents
      const agents = integration.listAgents();
      
      expect(agents).toHaveLength(2);
      expect(agents[0]).toMatchObject({ id: 'agent1', name: 'Agent 1' });
      expect(agents[1]).toMatchObject({ id: 'agent2', name: 'Agent 2' });
    });
    
    test('should return empty array if no agents are registered', () => {
      const agents = integration.listAgents();
      expect(agents).toHaveLength(0);
    });
  });
  
  describe('connectAgentToCursor', () => {
    test('should connect an agent to cursor operations', () => {
      // Register an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Connect the agent
      const result = integration.connectAgentToCursor('agent1');
      
      expect(result).toBe(true);
      expect(integration.getAgentById('agent1').connectedToCursor).toBe(true);
    });
    
    test('should return false if agent does not exist', () => {
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Try to connect non-existent agent
      const result = integration.connectAgentToCursor('nonexistent');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Agent nonexistent not found.');
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
  
  describe('updateAgentContext and getAgentContext', () => {
    test('should store and retrieve agent context', () => {
      // Register an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Update context
      const context = { currentFile: 'test.js', lineNumber: 10 };
      const result = integration.updateAgentContext('agent1', context);
      
      expect(result).toBe(true);
      
      // Get the context
      const retrievedContext = integration.getAgentContext('agent1');
      expect(retrievedContext).toEqual(context);
    });
    
    test('should return false if agent does not exist when updating context', () => {
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Try to update context for non-existent agent
      const result = integration.updateAgentContext('nonexistent', {});
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Agent nonexistent not found.');
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
    
    test('should return null if agent context does not exist', () => {
      // Register an agent but don't update context
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Try to get non-existent context
      const context = integration.getAgentContext('agent1');
      
      expect(context).toBeNull();
    });
  });
  
  describe('executeOperation', () => {
    test('should execute a cursor operation successfully', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return a value
      mockCursorApi.readFile.mockResolvedValue('file content');
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result).toEqual({
        success: true,
        result: 'file content',
        suggestedNextPrompt: null
      });
      expect(mockCursorApi.readFile).toHaveBeenCalledWith('test.js');
    });
    
    test('should throw error if agent does not exist', async () => {
      await expect(integration.executeOperation('nonexistent', 'readFile', 'test.js'))
        .rejects.toThrow('Agent nonexistent not found.');
    });
    
    test('should throw error if agent is not connected to cursor', async () => {
      // Register an agent but don't connect
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      await expect(integration.executeOperation('agent1', 'readFile', 'test.js'))
        .rejects.toThrow('Agent agent1 is not connected to cursor.');
    });
    
    test('should throw error if operation does not exist', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      await expect(integration.executeOperation('agent1', 'nonexistentOperation', {}))
        .rejects.toThrow('Operation nonexistentOperation not found.');
    });
    
    test('should apply self-prompt filter to string results', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return a value with self-prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. <!-- self-prompt: next prompt: Do something else --> Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result).toEqual({
        success: true,
        result: 'This is a normal text.  Hidden text.',
        suggestedNextPrompt: 'Do something else'
      });
    });
    
    test('should handle operation errors gracefully', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to throw an error
      mockCursorApi.readFile.mockRejectedValue(new Error('File not found'));
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result).toEqual({
        success: false,
        error: 'File not found'
      });
    });
    
    test('should record operations in agent history', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method
      mockCursorApi.readFile.mockResolvedValue('file content');
      
      // Execute the operation
      await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      // Get agent history
      const history = integration.getAgentHistory('agent1');
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        operation: 'readFile',
        params: 'test.js',
        success: true
      });
    });
    
    test('should limit history size according to maxMemoryEntries', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method
      mockCursorApi.readFile.mockResolvedValue('file content');
      
      // Execute operation multiple times (maxMemoryEntries + 5)
      for (let i = 0; i < 15; i++) {
        await integration.executeOperation('agent1', 'readFile', `test${i}.js`);
      }
      
      // Get agent history
      const history = integration.getAgentHistory('agent1');
      
      // Should be limited to maxMemoryEntries (10)
      expect(history).toHaveLength(10);
      
      // Should contain the most recent entries
      expect(history[9].params).toBe('test14.js');
    });
  });
  
  describe('getAgentHistory', () => {
    test('should return an empty array if no history exists', () => {
      // Register an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      
      // Get agent history
      const history = integration.getAgentHistory('agent1');
      
      expect(history).toEqual([]);
    });
  });
  
  describe('applySelfPromptFilter function', () => {
    test('should filter out self-prompts with HTML-style markers', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return HTML-style self-prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. <!-- self-prompt: secret info --> Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text.  Hidden text.');
    });
    
    test('should filter out self-prompts with code comment style markers', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return code comment style self-prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. /* self-prompt: secret info */ Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text.  Hidden text.');
    });
    
    test('should filter out self-prompts with custom tag style markers', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return custom tag style self-prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. <self-prompt>secret info</self-prompt> Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text.  Hidden text.');
    });
    
    test('should filter out self-prompts with code block style markers', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return code block style self-prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. ```self-prompt\nsecret info\n``` Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text.  Hidden text.');
    });
    
    test('should extract suggested next prompt from self-prompts', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return self-prompt with next prompt suggestion
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. <!-- self-prompt: next prompt: Analyze this function --> Hidden text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.suggestedNextPrompt).toBe('Analyze this function');
    });
    
    test('should handle multiple self-prompts in one text', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return multiple self-prompts
      mockCursorApi.readFile.mockResolvedValue(
        'Start <!-- self-prompt: first secret --> Middle /* self-prompt: second secret */ End'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('Start  Middle  End');
    });
    
    test('should return original text if no self-prompts are found', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return text without self-prompts
      mockCursorApi.readFile.mockResolvedValue('This is a normal text without any self-prompts.');
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text without any self-prompts.');
      expect(result.suggestedNextPrompt).toBeNull();
    });
    
    test('should handle YAML-style next prompt suggestions', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return YAML-style next prompt
      mockCursorApi.readFile.mockResolvedValue(
        '---\nnextPrompt: "Create a new component"\n---\nThis is a normal text.'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text.');
      expect(result.suggestedNextPrompt).toBe('Create a new component');
    });
    
    test('should handle structured next prompt suggestions in text', async () => {
      // Register and connect an agent
      integration.registerAgent('agent1', { name: 'Test Agent' });
      integration.connectAgentToCursor('agent1');
      
      // Mock the cursor API method to return structured next prompt
      mockCursorApi.readFile.mockResolvedValue(
        'This is a normal text. Suggested next prompt: "Create a new component"'
      );
      
      // Execute the operation
      const result = await integration.executeOperation('agent1', 'readFile', 'test.js');
      
      expect(result.result).toBe('This is a normal text. Suggested next prompt: "Create a new component"');
      expect(result.suggestedNextPrompt).toBe('Create a new component');
    });
  });
}); 