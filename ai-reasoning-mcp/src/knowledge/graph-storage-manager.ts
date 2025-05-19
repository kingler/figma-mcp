import { GraphClient } from '../graph-client.js'; // Updated import
import { Triple, Fact, Rule, ValidationResult } from './types.js';
import { Triple as LGTriple } from 'levelgraph'; // For type hints with GraphClient

// This class will now manage higher-level knowledge operations (Facts, Rules)
// by using the basic triple operations of the GraphClient (which uses LevelGraph).
export class GraphStorageManager {
  private client: GraphClient;

  constructor(client: GraphClient) {
    this.client = client;
    console.log('[GraphStorageManager] Initialized with GraphClient.');
  }

  // No direct close needed here if GraphClient handles its own lifecycle,
  // but KnowledgeBaseService will close its GraphClient instance.

  async createTriple(triple: Omit<Triple, 'timestamp' | 'id'> & { id?: string }, idToUse?: string): Promise<void> {
    const { subject, predicate, object, ...props } = triple;
    // Use provided id, props.id, idToUse, or generate a blank node ID from the client's lgInstance
    const finalId = props.id || idToUse || (this.client as any).lgInstance?.generateBlankNode() || `triple_${Date.now()}`;
    await this.client.createTriple(subject, predicate, object, { ...props, id: finalId, timestamp: Date.now() });
  }

  async getTriple(id: string): Promise<Triple | undefined> {
    const results = await this.client.searchTriples({ id } as Partial<LGTriple>); // Search by specific id prop
    if (results.length > 0) {
      // Cast/map LevelGraph triple to our application's Triple type
      const lgTriple = results[0];
      return {
        id: lgTriple.id as string,
        subject: lgTriple.subject,
        predicate: lgTriple.predicate,
        object: lgTriple.object as string, // Assuming object is string for simplicity here
        confidence: lgTriple.confidence as number,
        source: lgTriple.source as string,
        context: lgTriple.context as string,
        timestamp: lgTriple.timestamp as number,
      } as Triple;
    }
    return undefined;
  }

  async queryTriples(filter: Partial<Triple>): Promise<Triple[]> {
    const lgFilter: Partial<LGTriple> = { ...filter } as Partial<LGTriple>; // Pass through compatible filters
    const results = await this.client.searchTriples(lgFilter);
    return results.map(lgTriple => ({
        id: lgTriple.id as string,
        subject: lgTriple.subject,
        predicate: lgTriple.predicate,
        object: lgTriple.object as string,
        confidence: lgTriple.confidence as number,
        source: lgTriple.source as string,
        context: lgTriple.context as string,
        timestamp: lgTriple.timestamp as number,
    })) as Triple[];
  }

  async addFact(fact: Omit<Fact, 'timestamp'>, id: string): Promise<void> {
    // The `id` parameter here is for the Fact entity, GraphClient.addFact generates its own subject ID for triples.
    // If this `id` needs to be stored as a specific property of the Fact, GraphClient.addFact would need modification.
    await this.client.addFact(fact.statement, fact.confidence, fact.evidence, fact.source, fact.references);
  }

  async validateFact(statement: string): Promise<ValidationResult> {
    const factExists = await this.client.validateFact(statement); // This checks if a fact with this statement exists
    if (factExists) {
        // Find the fact entity/subject ID by its statement
        const factEntities = await this.client.searchTriples({
            predicate: 'statement',
            object: statement,
            type: 'Fact' // Assuming GraphClient.addFact adds a type: 'Fact' triple or similar identifier
        } as Partial<LGTriple>); 

        if (factEntities.length > 0) {
            const factSubjectId = factEntities[0].subject; // Get the subject ID of the fact entity
            
            // Now get the confidence for this fact subject ID
            const confidenceTriples = await this.client.searchTriples({
                subject: factSubjectId,
                predicate: 'confidence'
            } as Partial<LGTriple>);

            let confidence = 0;
            if (confidenceTriples.length > 0 && confidenceTriples[0].object !== undefined) {
                const confValue = confidenceTriples[0].object;
                confidence = typeof confValue === 'number' ? confValue : parseFloat(confValue as string);
                if (isNaN(confidence)) confidence = 0; // Handle parsing errors
            }
            return { isValid: true, confidence: confidence, reasons: [statement], suggestions: [] };
        } else {
            // Fact statement exists (from validateFact) but couldn't retrieve its structured entity
            console.warn(`[GraphStorageManager] Fact statement "${statement}" exists but failed to retrieve full entity for confidence.`);
            return { isValid: true, confidence: 0.5, reasons: [statement, 'Could not retrieve confidence'], suggestions: [] }; // Default to a lower confidence
        }
    }
    return { isValid: false, confidence: 0, reasons: ['Fact not found'], suggestions: [] };
  }

  async addRule(rule: Rule, id?: string): Promise<void> { // id is optional, GraphClient.addRule generates one
    // If a specific ID for the rule entity is required to be passed from here,
    // GraphClient.addRule would need to accept it.
    await this.client.addRule(rule.name, rule.condition, rule.consequence, rule.priority, rule.domain, rule.metadata);
  }

  async queryRules(domain: string): Promise<Rule[]> {
    console.warn('[GraphStorageManager] queryRules is simplified for LevelGraph.');
    const rulePattern: Partial<LGTriple> = { type: 'Rule', domain };
    const rawRulesData = await this.client.searchTriples(rulePattern);
    
    const rulesById: Record<string, Partial<Rule & { ruleSubjectId: string }>> = {};

    for (const triple of rawRulesData) {
        const ruleSubject = triple.subject; 
        if (!rulesById[ruleSubject]) {
            // Initialize with defaults for metadata fields
            rulesById[ruleSubject] = { domain, ruleSubjectId: ruleSubject, metadata: { description: '', examples: [], tags: [] } }; 
        }
        const r = rulesById[ruleSubject];
        r.id = ruleSubject; 
        if (triple.predicate === 'name') r.name = triple.object as string;
        else if (triple.predicate === 'condition') r.condition = triple.object as string;
        else if (triple.predicate === 'consequence') r.consequence = triple.object as string;
        else if (triple.predicate === 'priority') r.priority = typeof triple.object === 'number' ? triple.object : parseInt(triple.object as string);
        else if (triple.predicate === 'description') { 
            r.metadata!.description = triple.object as string;
        }
        else if (triple.predicate === 'hasExample') {
            if (!r.metadata) r.metadata = { description: '' };
            if (!r.metadata.examples) r.metadata.examples = [];
            r.metadata.examples.push(triple.object as string);
        }
        else if (triple.predicate === 'hasTag') {
            if (!r.metadata) r.metadata = { description: '' };
            if (!r.metadata.tags) r.metadata.tags = [];
            r.metadata.tags.push(triple.object as string);
        }
    }

    const rules: Rule[] = [];
    for(const ruleIdKey in rulesById) {
        const pr = rulesById[ruleIdKey];
        if(pr.name && pr.condition && pr.consequence && pr.priority !== undefined && pr.domain && pr.metadata) {
            // Fix metadata access errors - initialize arrays if they don't exist
            pr.metadata = pr.metadata || { description: '' };
            pr.metadata.examples = pr.metadata.examples || [];
            pr.metadata.tags = pr.metadata.tags || [];
            rules.push({
                id: pr.id, 
                name: pr.name,
                condition: pr.condition,
                consequence: pr.consequence,
                priority: pr.priority,
                domain: pr.domain,
                metadata: {
                    description: pr.metadata.description || '',
                    examples: pr.metadata.examples || [],
                    tags: pr.metadata.tags || []
                }
            });
        }
    }
    return rules.sort((a,b) => (b.priority || 0) - (a.priority || 0));
  }

  async applyRules(context: string): Promise<ValidationResult> {
    console.warn('[GraphStorageManager] applyRules is simplified and uses GraphClient simulation.');
    const allRules = await this.queryRules(''); 
    const allFacts = await this.queryTriples({ object: context } as Partial<Triple>); 
    const lgFacts = allFacts.map(f => ({...f} as LGTriple));
    const lgRules = allRules.flatMap(r => [
        {subject: r.id || r.name, predicate: 'condition', object: r.condition }, 
        {subject: r.id || r.name, predicate: 'consequence', object: r.consequence }
    ]);

    const inferred = await this.client.applyRules(lgFacts, lgRules); 
    
    if (inferred.length > 0) {
        return {
            isValid: true, 
            confidence: 0.75, 
            reasons: inferred.map(inf => `Applied rule leading to: ${ (inf as any).inferred_statement || inf.object}`),
            suggestions: []
        };
    }
    return { isValid: false, confidence: 0, reasons: ['No rules applied or no inferences made'], suggestions: [] };
  }
} 