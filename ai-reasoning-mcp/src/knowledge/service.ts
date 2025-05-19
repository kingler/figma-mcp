import { Triple, Fact, Rule, ValidationResult } from './types.js';
import { GraphStorageManager } from './graph-storage-manager.js';
import { GraphClient } from '../graph-client.js';

export class KnowledgeBaseService {
  private graphManager: GraphStorageManager;
  private client: GraphClient;

  constructor() {
    this.client = new GraphClient();
    this.graphManager = new GraphStorageManager(this.client);
    console.log('[KnowledgeBaseService] Initialized with GraphStorageManager and new GraphClient.');
  }

  async close() {
    if (this.client) {
        await this.client.close();
        console.log('[KnowledgeBaseService] GraphClient closed by KnowledgeBaseService.');
    }
  }

  // Triple Management
  public async createTriple(triple: Omit<Triple, 'timestamp' | 'id'> & {id?: string} ): Promise<string> {
    const id = triple.id || this.generateId([triple.subject, triple.predicate, triple.object]);
    await this.graphManager.createTriple({ ...triple, id }, id);
    return id;
  }

  public async getTriple(id: string): Promise<Triple | undefined> {
    return await this.graphManager.getTriple(id);
  }

  public async queryTriples(filter: Partial<Triple>): Promise<Triple[]> {
    return await this.graphManager.queryTriples(filter);
  }

  // Fact Management
  public async addFact(fact: Omit<Fact, 'timestamp'>): Promise<string> {
    const id = this.generateId([fact.statement, fact.source, (fact.confidence || Math.random()).toString()]);
    await this.graphManager.addFact(fact, id);
    return id;
  }

  public async validateFact(statement: string): Promise<ValidationResult> {
    return await this.graphManager.validateFact(statement);
  }

  // Rule Management
  public async addRule(rule: Rule): Promise<string> {
    const id = rule.id || this.generateId([rule.name, rule.domain].filter(Boolean) as string[]);
    await this.graphManager.addRule({ ...rule, id }, id);
    return id;
  }

  public async queryRules(domain: string): Promise<Rule[]> {
    return await this.graphManager.queryRules(domain);
  }

  public async applyRules(context: string): Promise<ValidationResult> {
    return await this.graphManager.applyRules(context);
  }

  // Helper Methods
  private generateId(components: string[]): string {
    const validComponents = components.map(c => String(c === undefined || c === null ? '' : c));
    return Buffer.from(validComponents.join('|')).toString('base64');
  }
}
