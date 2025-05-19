/// <reference types="../types/levelgraph" />
import { GraphStorageManager } from '../knowledge/graph-storage-manager';
import { GraphClient } from '../graph-client';
import { Triple, Fact, Rule, ValidationResult } from '../knowledge/types';

// Mock the GraphClient
jest.mock('../graph-client');

const MOCK_DB_PATH = './test_gsm_levelgraph_db'; // Path for any fs operations if needed by GSM directly (unlikely)

describe('GraphStorageManager', () => {
  let mockGraphClientInstance: jest.Mocked<GraphClient>;
  let graphStorageManager: GraphStorageManager;

  beforeEach(() => {
    // Create a new mock instance for each test to ensure isolation
    // And reset all mock function call counts etc.
    mockGraphClientInstance = new GraphClient(MOCK_DB_PATH) as jest.Mocked<GraphClient>; 
    // If GraphClient constructor does async work via ready(), ensure tests can handle it or mock ready()
    // For these unit tests, we primarily care about mocking its methods.
    mockGraphClientInstance.ready = jest.fn().mockResolvedValue(undefined); 
    mockGraphClientInstance.createTriple = jest.fn().mockResolvedValue('mock-triple-id');
    mockGraphClientInstance.searchTriples = jest.fn().mockResolvedValue([]);
    mockGraphClientInstance.addFact = jest.fn().mockResolvedValue('mock-fact-id');
    mockGraphClientInstance.validateFact = jest.fn().mockResolvedValue(true);
    mockGraphClientInstance.addRule = jest.fn().mockResolvedValue('mock-rule-id');
    // mockGraphClientInstance.queryRules needs to return an array of LGTriples representing rules for reconstruction
    mockGraphClientInstance.applyRules = jest.fn().mockResolvedValue([]);
    // Mocking the internal lgInstance.generateBlankNode for createTriple test in GraphStorageManager
    // This is a bit deep, ideally GraphClient would expose generateBlankNode or handle ID generation fully.
    (mockGraphClientInstance as any).lgInstance = { generateBlankNode: jest.fn().mockReturnValue('blank_node_1') };

    graphStorageManager = new GraphStorageManager(mockGraphClientInstance);
  });

  describe('Triple Management', () => {
    it('createTriple should call graphClient.createTriple with transformed properties', async () => {
      const tripleData: Omit<Triple, 'timestamp' | 'id'> = {
        subject: 's1', predicate: 'p1', object: 'o1', 
        confidence: 0.9, source: 'test', context: 'test-ctx'
      };
      const expectedId = 'triple_id_1';
      
      // Explicitly provide an ID to test that path
      await graphStorageManager.createTriple({ ...tripleData, id: expectedId });

      expect(mockGraphClientInstance.createTriple).toHaveBeenCalledWith(
        tripleData.subject, 
        tripleData.predicate, 
        tripleData.object, 
        expect.objectContaining({ 
          id: expectedId, 
          confidence: tripleData.confidence, 
          source: tripleData.source,
          context: tripleData.context,
          timestamp: expect.any(Number)
        })
      );
    });

    it('getTriple should call graphClient.searchTriples with id and map result', async () => {
      const mockLGTriple: import('levelgraph').Triple = { id: 't1', subject: 's', predicate: 'p', object: 'o', confidence: 1, source: 'src', context: 'ctx', timestamp: 123 };
      mockGraphClientInstance.searchTriples.mockResolvedValue([mockLGTriple]);
      
      const result = await graphStorageManager.getTriple('t1');
      
      expect(mockGraphClientInstance.searchTriples).toHaveBeenCalledWith({ id: 't1' } as Partial<import('levelgraph').Triple>); // Ensure mock matches expected call
      expect(result).toEqual(expect.objectContaining({
        id: 't1', subject: 's', predicate: 'p', object: 'o',
      }));
    });

    it('queryTriples should call graphClient.searchTriples and map results', async () => {
        const filter: Partial<Triple> = { subject: 's2', predicate: 'p2' };
        const mockLGTriples: import('levelgraph').Triple[] = [
            { id: 't2', subject: 's2', predicate: 'p2', object: 'o2', confidence: 0.8, source: 'src2', context: 'ctx2', timestamp: 456 },
            { id: 't3', subject: 's2', predicate: 'p2', object: 'o3', confidence: 0.7, source: 'src3', context: 'ctx3', timestamp: 789 }
        ];
        mockGraphClientInstance.searchTriples.mockResolvedValue(mockLGTriples);

        const results = await graphStorageManager.queryTriples(filter);

        expect(mockGraphClientInstance.searchTriples).toHaveBeenCalledWith(filter as Partial<import('levelgraph').Triple>); 
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ id: 't2', object: 'o2'});
        expect(results[1]).toMatchObject({ id: 't3', object: 'o3'});
    });
  });

  describe('Fact Management', () => {
    it('addFact should call graphClient.addFact with correct parameters', async () => {
      const factData: Omit<Fact, 'timestamp'> = {
        statement: 'fact statement', confidence: 0.85, 
        evidence: ['e1'], source: 'test-source', references: ['r1']
      };
      // The `id` parameter to graphStorageManager.addFact is currently unused if GraphClient.addFact generates its own ID
      await graphStorageManager.addFact(factData, 'fact-entity-id'); 

      expect(mockGraphClientInstance.addFact).toHaveBeenCalledWith(
        factData.statement, 
        factData.confidence, 
        factData.evidence,
        factData.source,
        factData.references
      );
    });

    it('validateFact should call graphClient.validateFact and then search for confidence', async () => {
        const statement = 'test statement';
        const factSubjectId = 'fact123'; // The ID GraphClient.addFact would have used for the subject node

        mockGraphClientInstance.validateFact.mockResolvedValue(true); // Step 1: Fact exists
        
        // Step 2: GSM searches for fact entity by statement to get its subject ID
        mockGraphClientInstance.searchTriples
            .mockImplementationOnce(async (pattern: Partial<import('levelgraph').Triple>) => {
                if (pattern.predicate === 'statement' && pattern.object === statement && pattern.type === 'Fact') {
                    return [{ subject: factSubjectId, predicate: 'statement', object: statement, type: 'Fact' } as import('levelgraph').Triple];
                }
                return [];
            })
            // Step 3: GSM searches for confidence triple using the factSubjectId
            .mockImplementationOnce(async (pattern: Partial<import('levelgraph').Triple>) => {
                if (pattern.subject === factSubjectId && pattern.predicate === 'confidence') {
                    return [{ subject: factSubjectId, predicate: 'confidence', object: 0.9 } as import('levelgraph').Triple];
                }
                return [];
            });

        const result = await graphStorageManager.validateFact(statement);

        expect(mockGraphClientInstance.validateFact).toHaveBeenCalledWith(statement);
        expect(mockGraphClientInstance.searchTriples).toHaveBeenCalledWith({ 
            predicate: 'statement', object: statement, type: 'Fact' 
        } as Partial<import('levelgraph').Triple>);
        expect(mockGraphClientInstance.searchTriples).toHaveBeenCalledWith({ 
            subject: factSubjectId, predicate: 'confidence' 
        } as Partial<import('levelgraph').Triple>);
        expect(result.isValid).toBe(true);
        expect(result.confidence).toBe(0.9);
    });

    it('validateFact should return not valid if fact does not exist', async () => {
        const statement = 'nonexistent statement';
        mockGraphClientInstance.validateFact.mockResolvedValue(false);
        
        const result = await graphStorageManager.validateFact(statement);
        expect(mockGraphClientInstance.validateFact).toHaveBeenCalledWith(statement);
        expect(result.isValid).toBe(false);
        expect(result.confidence).toBe(0);
    });
  });

  describe('Rule Management', () => {
    const ruleData: Rule = {
        id: 'ruleEntityId1',
        name: 'Test Rule', condition: 'IF x THEN y', consequence: 'z IS true',
        priority: 5, domain: 'testing', 
        metadata: { description: 'A test rule', examples: ['ex1'], tags: ['tag1']}
    };

    it('addRule should call graphClient.addRule with rule properties', async () => {
      // The `id` parameter to graphStorageManager.addRule is optional and currently unused if GraphClient.addRule creates its own ID
      await graphStorageManager.addRule(ruleData);

      expect(mockGraphClientInstance.addRule).toHaveBeenCalledWith(
        ruleData.name, ruleData.condition, ruleData.consequence, 
        ruleData.priority, ruleData.domain, ruleData.metadata
      );
    });

    it('queryRules should call graphClient.searchTriples and reconstruct rules', async () => {
        const domain = 'testing';
        const ruleId = 'rule123';
        // Simulate raw triples that GraphClient might return for rules
        const mockLGRules: import('levelgraph').Triple[] = [
            { subject: ruleId, predicate: 'type', object: 'Rule' },
            { subject: ruleId, predicate: 'domain', object: domain },
            { subject: ruleId, predicate: 'name', object: 'My Test Rule' },
            { subject: ruleId, predicate: 'condition', object: 'A > B' },
            { subject: ruleId, predicate: 'consequence', object: 'C = D' },
            { subject: ruleId, predicate: 'priority', object: 7 },
            { subject: ruleId, predicate: 'description', object: 'This is a rule for testing' },
            { subject: ruleId, predicate: 'hasExample', object: 'Example 1' },
            { subject: ruleId, predicate: 'hasTag', object: 'test' },
        ];
        mockGraphClientInstance.searchTriples.mockResolvedValue(mockLGRules);

        const rules = await graphStorageManager.queryRules(domain);
        expect(mockGraphClientInstance.searchTriples).toHaveBeenCalledWith({ type: 'Rule', domain } as Partial<import('levelgraph').Triple>);
        expect(rules).toHaveLength(1);
        expect(rules[0]).toMatchObject({
            id: ruleId,
            name: 'My Test Rule',
            condition: 'A > B',
            consequence: 'C = D',
            priority: 7,
            domain: domain,
            metadata: {
                description: 'This is a rule for testing',
                examples: ['Example 1'],
                tags: ['test']
            }
        });
    });

    it('applyRules should use queryRules and client.applyRules (simplified)', async () => {
        const context = "Some context that matches a rule";
        // Mock queryRules to return a test rule
        const testRule: Rule = { id: 'r1', name: 'TestApply', condition: 'context matches', consequence: 'inference made', priority:1, domain: 'test', metadata:{description:'',examples:[],tags:[]}};
        jest.spyOn(graphStorageManager, 'queryRules').mockResolvedValue([testRule]);
        
        // Mock GraphClient's applyRules which is still simplified
        const mockInferredLGTriple: import('levelgraph').Triple = { subject: 'inferred_fact', predicate: 'isA', object: 'Inference', inferred_statement: 'inference made' };
        mockGraphClientInstance.applyRules.mockResolvedValue([mockInferredLGTriple]);

        const validationResult = await graphStorageManager.applyRules(context);

        expect(graphStorageManager.queryRules).toHaveBeenCalledWith(''); // queryRules is called with empty domain
        // Check if client.applyRules was called (details of args might be complex due to LGTriple conversion)
        expect(mockGraphClientInstance.applyRules).toHaveBeenCalled(); 
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.reasons).toContain('Applied rule leading to: inference made');
    });
  });
}); 