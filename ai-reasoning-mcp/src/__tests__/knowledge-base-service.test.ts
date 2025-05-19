/// <reference types="../types/levelgraph" />
import { KnowledgeBaseService } from '../knowledge/service';
import { GraphStorageManager } from '../knowledge/graph-storage-manager';
import { GraphClient } from '../graph-client';
import { Triple, Fact, Rule } from '../knowledge/types';

// Mock GraphClient: This will be used by the KnowledgeBaseService constructor
const mockGraphClientInstanceForKBS = {
  ready: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  createTriple: jest.fn(),
  searchTriples: jest.fn(),
  addFact: jest.fn(),
  validateFact: jest.fn(),
  addRule: jest.fn(),
  applyRules: jest.fn(),
  lgInstance: { generateBlankNode: jest.fn().mockReturnValue('mock_blank_node') }
};
jest.mock('../graph-client', () => {
  return {
    GraphClient: jest.fn(() => mockGraphClientInstanceForKBS) // Constructor returns our defined mock object
  };
});

// Mock GraphStorageManager: Its methods will be spied upon
jest.mock('../knowledge/graph-storage-manager');

const TEST_DB_PATH_KBS = './test_kbs_levelgraph_db';

describe('KnowledgeBaseService', () => {
  let mockGraphStorageManagerInstance: jest.Mocked<GraphStorageManager>;
  let knowledgeBaseService: KnowledgeBaseService;
  // This will hold the instance of the mocked GraphClient that KBS creates
  let actualGraphClientInstanceUsedByKBS: typeof mockGraphClientInstanceForKBS;

  beforeEach(() => {
    // Reset all mocks before each test to ensure clean state
    jest.clearAllMocks();

    knowledgeBaseService = new KnowledgeBaseService(); 
    
    // Get the mocked instance of GraphStorageManager that KBS created
    mockGraphStorageManagerInstance = (GraphStorageManager as jest.Mock).mock.instances[0] as jest.Mocked<GraphStorageManager>;
    
    // Get the (mocked) GraphClient instance that was passed to GraphStorageManager constructor by KBS
    // This relies on GraphClient being the first argument to GraphStorageManager constructor mock
    if ((GraphStorageManager as jest.Mock).mock.calls.length > 0) {
      actualGraphClientInstanceUsedByKBS = (GraphStorageManager as jest.Mock).mock.calls[0][0];
    } else {
      // Fallback if direct constructor call introspection is tricky, use the globally defined mock that KBS should have used
      actualGraphClientInstanceUsedByKBS = mockGraphClientInstanceForKBS;
    }
  });

  afterEach(async () => {
    await knowledgeBaseService.close(); // This should call mockGraphClientActualInstance.close()
    jest.clearAllMocks(); // Clear all mock call counts and implementations
  });

  it('constructor should initialize GraphStorageManager with the mocked GraphClient instance', () => {
    expect(GraphClient).toHaveBeenCalledTimes(1);
    expect(GraphStorageManager).toHaveBeenCalledTimes(1);
    // Check that GraphStorageManager was called with the specific mock instance KBS created
    expect(GraphStorageManager).toHaveBeenCalledWith(actualGraphClientInstanceUsedByKBS);
  });

  it('close should call graphClient.close on the instance KBS uses', async () => {
    await knowledgeBaseService.close();
    // We assert that the `close` method on the *specific mock instance* KBS created was called.
    expect(actualGraphClientInstanceUsedByKBS.close).toHaveBeenCalledTimes(1);
  });

  describe('Triple Operations', () => {
    it('createTriple should generate an ID and call graphManager.createTriple', async () => {
      const tripleData: Omit<Triple, 'timestamp' | 'id'> = { subject: 's', predicate: 'p', object: 'o', confidence: 1, source: 'test', context: 'test' };
      const generatedId = Buffer.from('s|p|o').toString('base64');
      
      await knowledgeBaseService.createTriple(tripleData);
      
      expect(mockGraphStorageManagerInstance.createTriple).toHaveBeenCalledWith(
        expect.objectContaining({ ...tripleData, id: generatedId }), 
        generatedId
      );
    });

    it('getTriple should call graphManager.getTriple', async () => {
        const id = 'test-id';
        await knowledgeBaseService.getTriple(id);
        expect(mockGraphStorageManagerInstance.getTriple).toHaveBeenCalledWith(id);
    });

    it('queryTriples should call graphManager.queryTriples', async () => {
        const filter: Partial<Triple> = { subject: 's' };
        await knowledgeBaseService.queryTriples(filter);
        expect(mockGraphStorageManagerInstance.queryTriples).toHaveBeenCalledWith(filter);
    });
  });

  describe('Fact Operations', () => {
    it('addFact should generate an ID and call graphManager.addFact', async () => {
        const factData: Omit<Fact, 'timestamp'> = { 
            statement: 'fact s', 
            confidence: 0.9, 
            source: 'test', 
            evidence: [], 
            references: [] 
        };
        const expectedId = Buffer.from(`fact s|test|0.9`).toString('base64');
        await knowledgeBaseService.addFact(factData);
        expect(mockGraphStorageManagerInstance.addFact).toHaveBeenCalledWith(factData, expectedId);
    });

    it('validateFact should call graphManager.validateFact', async () => {
        const statement = 'fact s';
        await knowledgeBaseService.validateFact(statement);
        expect(mockGraphStorageManagerInstance.validateFact).toHaveBeenCalledWith(statement);
    });
  });

  describe('Rule Operations', () => {
    const ruleData: Rule = {
        name: 'TestRule', condition: 'cond', consequence: 'cons',
        priority: 1, domain: 'test', metadata: { description: '', examples: [], tags: [] }
    };
    it('addRule should generate an ID (if not provided) and call graphManager.addRule', async () => {
        const expectedId = Buffer.from(`TestRule|test`).toString('base64');
        await knowledgeBaseService.addRule(ruleData); 
        expect(mockGraphStorageManagerInstance.addRule).toHaveBeenCalledWith(
            expect.objectContaining({ ...ruleData, id: expectedId }), 
            expectedId
        );
    });

    it('addRule should use provided ID and call graphManager.addRule', async () => {
        const ruleWithId: Rule = { ...ruleData, id: 'custom-rule-id' };
        await knowledgeBaseService.addRule(ruleWithId);
        expect(mockGraphStorageManagerInstance.addRule).toHaveBeenCalledWith(
            ruleWithId, 
            'custom-rule-id'
        );
    });

    it('queryRules should call graphManager.queryRules', async () => {
        const domain = 'test';
        await knowledgeBaseService.queryRules(domain);
        expect(mockGraphStorageManagerInstance.queryRules).toHaveBeenCalledWith(domain);
    });

    it('applyRules should call graphManager.applyRules', async () => {
        const context = 'test context';
        await knowledgeBaseService.applyRules(context);
        expect(mockGraphStorageManagerInstance.applyRules).toHaveBeenCalledWith(context);
    });
  });

}); 