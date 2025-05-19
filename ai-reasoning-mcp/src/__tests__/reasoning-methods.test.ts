import { AIReasoningServer } from '../index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the MCP SDK server
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        setRequestHandler: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('AIReasoningServer Reasoning Methods', () => {
  let server: AIReasoningServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    server = new AIReasoningServer();
  });
  
  describe('deductiveReasoning', () => {
    test('should correctly apply syllogistic reasoning', async () => {
      // Use the TypeScript 'any' type here to access private methods for testing
      const result = await (server as any).performDeductiveReasoning(
        ['All humans are mortal', 'Socrates is human'],
        'philosophy'
      );
      
      expect(result).toBeDefined();
      expect(result.conclusion).toBe('socrates is mortal');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.method).toBe('deductive_reasoning');
    });
    
    test('should handle unrelated premises gracefully', async () => {
      const result = await (server as any).performDeductiveReasoning(
        ['Trees have leaves', 'Water boils at 100C'],
        'science'
      );
      
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeLessThan(0.9); // Lower confidence with unrelated premises
      expect(result.method).toBe('deductive_reasoning');
    });
    
    test('should handle errors gracefully', async () => {
      // Force an error by passing invalid data
      const result = await (server as any).performDeductiveReasoning(
        undefined as any, // Will cause error in processing
        'philosophy'
      );
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('inductiveReasoning', () => {
    test('should identify patterns in similar examples', async () => {
      const result = await (server as any).performInductiveReasoning(
        ['Swan 1 is white', 'Swan 2 is white', 'Swan 3 is white'],
        0.8
      );
      
      expect(result).toBeDefined();
      expect(result.generalization).toBeDefined();
      expect(result.generalization.toLowerCase()).toContain('swan');
      expect(result.generalization.toLowerCase()).toContain('white');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.method).toBe('inductive_reasoning');
    });
    
    test('should extract common properties from examples', async () => {
      const result = await (server as any).performInductiveReasoning(
        ['The sky is blue', 'The ocean is blue', 'My eyes are blue'],
        0.9
      );
      
      expect(result).toBeDefined();
      expect(result.generalization).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.significant_words).toContain('blue');
    });
    
    test('should handle errors gracefully', async () => {
      const result = await (server as any).performInductiveReasoning(
        undefined as any, // Will cause error in processing
        0.8
      );
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('abductiveReasoning', () => {
    test('should generate explanations for weather observations', async () => {
      const result = await (server as any).performAbductiveReasoning(
        ['The grass is wet', 'The sky is cloudy'],
        'weather analysis'
      );
      
      expect(result).toBeDefined();
      expect(result.best_explanation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('abductive_reasoning');
    });
    
    test('should generate medical explanations for symptoms', async () => {
      const result = await (server as any).performAbductiveReasoning(
        ['The patient has a fever', 'The patient is coughing'],
        'medical diagnosis'
      );
      
      expect(result).toBeDefined();
      expect(result.best_explanation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('abductive_reasoning');
    });
    
    test('should handle errors gracefully', async () => {
      const result = await (server as any).performAbductiveReasoning(
        undefined as any, // Will cause error in processing
        'analysis'
      );
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.error).toBeDefined();
    });
  });
}); 