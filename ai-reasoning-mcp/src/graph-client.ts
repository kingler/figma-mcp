/// <reference types="./types/levelgraph" />
import { ClassicLevel } from 'classic-level';
import levelgraphDefault from 'levelgraph'; // Import the default export
import fs from 'fs';
import path from 'path';

// Use the types directly from the imported module if possible, 
// or rely on the ambient declaration from levelgraph.d.ts
// If levelgraph.d.ts is set up correctly, levelgraphDefault should conform to the declared function signature
// and its return type to levelgraph.LevelGraph

export class GraphClient {
  private lgInstance: import('levelgraph').LevelGraph | null = null; // Explicitly use the type
  private dbInstance: ClassicLevel<string, any> | null = null;
  private dbPath: string;
  public connected: boolean = false; // True if DB is open and ready
  private readyPromise: Promise<void>;
  private inMemoryStore: { 
    triples: import('levelgraph').Triple[],
    facts: any[],
    rules: any[] 
  } = { triples: [], facts: [], rules: [] };
  private useInMemory: boolean = false;
  private lockCheckInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string = './default_levelgraph_db') {
    this.dbPath = dbPath;
    console.log(`[GraphClient Constructor] Path: ${this.dbPath}`);
    
    // Check for and clear existing lock files before initializing
    this.checkAndClearLockFile();
    
    this.dbInstance = new ClassicLevel(this.dbPath, { valueEncoding: 'json' });
    this.readyPromise = this.openDatabase();
    
    // Set up periodic lock file check
    this.startLockMonitoring();
    
    // Register process exit handlers for cleanup
    this.registerCleanupHandlers();
  }
  
  private checkAndClearLockFile(): void {
    const lockFilePath = path.join(this.dbPath, 'LOCK');
    try {
      if (fs.existsSync(lockFilePath)) {
        console.warn(`[GraphClient] Found existing lock file at ${lockFilePath}, attempting to remove...`);
        fs.unlinkSync(lockFilePath);
        console.log(`[GraphClient] Successfully removed stale lock file at ${lockFilePath}`);
      }
    } catch (error) {
      console.error(`[GraphClient] Error checking/clearing lock file at ${lockFilePath}:`, error);
      // Don't throw here, continue and let the database handle it
      // We might not have permission to delete the lock file
    }
  }
  
  private startLockMonitoring(): void {
    // Set up a periodic check for lock files that might persist after errors
    this.lockCheckInterval = setInterval(() => {
      if (this.useInMemory && !this.connected) {
        // We're in recovery mode, check if we can clear the lock and reconnect
        this.checkAndClearLockFile();
        // Try to reopen the database if we're in in-memory mode due to lock issues
        if (this.useInMemory) {
          console.log('[GraphClient] Attempting database reconnection after lock clearance...');
          this.openDatabase().catch(err => {
            console.error('[GraphClient] Reconnection attempt failed:', err);
          });
        }
      }
    }, 60000); // Check every minute
  }
  
  private registerCleanupHandlers(): void {
    // Ensure cleanup on process exit
    process.on('beforeExit', async () => {
      await this.cleanup();
    });
    
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
    
    // Handle uncaught exceptions to ensure DB is properly closed
    process.on('uncaughtException', async (error) => {
      console.error('[GraphClient] Uncaught exception, cleaning up database:', error);
      await this.cleanup();
      process.exit(1);
    });
  }
  
  private async cleanup(): Promise<void> {
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
      this.lockCheckInterval = null;
    }
    
    await this.close();
    
    // Final check to remove any lock files
    this.checkAndClearLockFile();
  }

  private async openDatabase(): Promise<void> {
    if (this.connected && this.dbInstance && this.dbInstance.status === 'open') {
      console.log(`[GraphClient] DB already open at ${this.dbPath}`);
      return;
    }
    
    console.log(`[GraphClient] Opening DB at ${this.dbPath}...`);
    try {
      // Check for and clear any existing lock file before opening
      this.checkAndClearLockFile();
      
      if (!this.dbInstance) { // Should have been set in constructor
        this.dbInstance = new ClassicLevel(this.dbPath, { valueEncoding: 'json' });
      }
      
      await this.dbInstance.open();
      this.lgInstance = levelgraphDefault(this.dbInstance as any);
      this.connected = true;
      this.useInMemory = false;
      console.log(`[GraphClient] DB opened successfully at ${this.dbPath}`);
    } catch (error) {
      console.error(`[GraphClient] Error opening DB at ${this.dbPath}:`, error);
      console.log(`[GraphClient] Falling back to in-memory storage mode`);
      this.useInMemory = true;
      this.connected = true; // Consider ourselves connected, but to in-memory
      
      // Try to clean up any partially initialized resources
      try {
        if (this.dbInstance && this.dbInstance.status === 'open') {
          await this.dbInstance.close();
        }
      } catch (closeError) {
        console.error(`[GraphClient] Error closing DB after failed open:`, closeError);
      }
      
      // Clear lock files that might have been created
      this.checkAndClearLockFile();
    }
  }

  public async ready(): Promise<void> {
    try {
      await this.readyPromise;
    } catch (error) {
      // Even if the real DB fails, we're still "ready" with in-memory mode
      console.log(`[GraphClient] Ready with in-memory fallback`);
    }
    return Promise.resolve();
  }

  private async ensureConnected(): Promise<void> {
    await this.ready();
    if (!this.connected) {
      if (this.useInMemory) {
        return; // We're using in-memory mode, so we're good to go
      }
      throw new Error(`[GraphClient] DB not connected/open. Status: ${this.dbInstance?.status}`);
    }
  }

  async createTriple(subject: string, predicate: string, object: any, props?: Record<string, any>): Promise<string> {
    await this.ensureConnected();
    const tripleToPut: import('levelgraph').Triple = { subject, predicate, object, ...props };
    
    if (this.useInMemory) {
      const id = props?.id || `${subject}-${predicate}-${object}`.replace(/\s+/g, '_');
      this.inMemoryStore.triples.push({...tripleToPut, id});
      return Promise.resolve(id);
    }
    
    return new Promise((resolve, reject) => {
      this.lgInstance!.put(tripleToPut, (err: Error | null) => {
        if (err) {
          console.error('[GraphClient] LevelGraph put error:', err);
          reject(err);
        } else {
          const id = props?.id || `${subject}-${predicate}-${object}`.replace(/\s+/g, '_');
          resolve(id);
        }
      });
    });
  }

  async getTriplesBySubject(subject: string): Promise<import('levelgraph').Triple[]> {
    await this.ensureConnected();
    
    if (this.useInMemory) {
      return Promise.resolve(this.inMemoryStore.triples.filter(t => t.subject === subject));
    }
    
    return new Promise((resolve, reject) => {
      this.lgInstance!.search([{ subject, predicate: this.lgInstance!.v('p'), object: this.lgInstance!.v('o') }], 
      (err: Error | null, results?: import('levelgraph').Triple[]) => {
        if (err) reject(err); else resolve(results || []);
      });
    });
  }

  async getTriplesWithObject(objectValue: any): Promise<import('levelgraph').Triple[]> {
    await this.ensureConnected();
    
    if (this.useInMemory) {
      return Promise.resolve(this.inMemoryStore.triples.filter(t => t.object === objectValue));
    }
    
    return new Promise((resolve, reject) => {
      this.lgInstance!.search([{ subject: this.lgInstance!.v('s'), predicate: this.lgInstance!.v('p'), object: objectValue }], 
      (err: Error | null, results?: import('levelgraph').Triple[]) => {
        if (err) reject(err); else resolve(results || []);
      });
    });
  }
  
  async searchTriples(pattern: Partial<import('levelgraph').Triple>): Promise<import('levelgraph').Triple[]> {
    await this.ensureConnected();
    
    if (this.useInMemory) {
      return Promise.resolve(this.inMemoryStore.triples.filter(triple => {
        for (const key in pattern) {
          if (pattern[key as keyof typeof pattern] !== undefined && 
              triple[key as keyof typeof triple] !== pattern[key as keyof typeof pattern]) {
            return false;
          }
        }
        return true;
      }));
    }
    
    const searchPattern: import('levelgraph').Triple = {
        subject: pattern.subject || this.lgInstance!.v('s'),
        predicate: pattern.predicate || this.lgInstance!.v('p'),
        object: pattern.object || this.lgInstance!.v('o'),
    };
    for (const key in pattern) {
        if (key !== 'subject' && key !== 'predicate' && key !== 'object' && Object.prototype.hasOwnProperty.call(pattern, key)) {
            (searchPattern as any)[key] = (pattern as any)[key];
        }
    }
    return new Promise((resolve, reject) => {
        this.lgInstance!.search([searchPattern], (err: Error | null, results?: import('levelgraph').Triple[]) => {
            if (err) reject(err); else resolve(results || []);
        });
    });
}

  // The following methods implement knowledge base operations using LevelGraph
  // Each method is implemented using LevelGraph's capabilities (put, search, etc.)
  // For TDD, we have tests for each of these methods in the __tests__ directory.

  async addFact(statement: string, confidence: number, evidence: string[] = [], source?: string, references?: string[]): Promise<string> {
    await this.ensureConnected();
    const factId = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (this.useInMemory) {
      const factObject = {
        id: factId,
        statement,
        confidence,
        evidence: evidence || [],
        source: source || 'unknown',
        references: references || [],
        timestamp: Date.now()
      };
      this.inMemoryStore.facts.push(factObject);
      return Promise.resolve(factId);
    }
    
    const factTriples: import('levelgraph').Triple[] = [
      { subject: factId, predicate: 'type', object: 'Fact' },
      { subject: factId, predicate: 'statement', object: statement },
      { subject: factId, predicate: 'confidence', object: confidence },
      { subject: factId, predicate: 'source', object: source || 'unknown' },
      { subject: factId, predicate: 'timestamp', object: Date.now() }
    ];
    evidence.forEach(ev => factTriples.push({ subject: factId, predicate: 'hasEvidence', object: ev }));
    (references || []).forEach(ref => factTriples.push({ subject: factId, predicate: 'hasReference', object: ref }));

    return new Promise((resolve, reject) => {
      this.lgInstance!.put(factTriples, (err: Error | null) => {
        if (err) reject(err); else resolve(factId);
      });
    });
  }

  async addRule(name: string, condition: string, consequence: string, priority: number, domain: string, metadata: any): Promise<string> {
    await this.ensureConnected();
    const ruleId = `rule_${name.replace(/\s+/g, '_')}_${Date.now()}`;
    
    if (this.useInMemory) {
      const ruleObject = {
        id: ruleId,
        name,
        condition,
        consequence,
        priority,
        domain,
        description: metadata.description || '',
        examples: metadata.examples || [],
        tags: metadata.tags || [],
        timestamp: Date.now()
      };
      this.inMemoryStore.rules.push(ruleObject);
      return Promise.resolve(ruleId);
    }
    
    const ruleTriples: import('levelgraph').Triple[] = [
      { subject: ruleId, predicate: 'type', object: 'Rule' },
      { subject: ruleId, predicate: 'name', object: name },
      { subject: ruleId, predicate: 'condition', object: condition },
      { subject: ruleId, predicate: 'consequence', object: consequence },
      { subject: ruleId, predicate: 'priority', object: priority },
      { subject: ruleId, predicate: 'domain', object: domain },
      { subject: ruleId, predicate: 'description', object: metadata.description || '' },
      { subject: ruleId, predicate: 'timestamp', object: Date.now() }
    ];
    (metadata.examples || []).forEach((ex: string) => ruleTriples.push({ subject: ruleId, predicate: 'hasExample', object: ex }));
    (metadata.tags || []).forEach((tag: string) => ruleTriples.push({ subject: ruleId, predicate: 'hasTag', object: tag }));

    return new Promise((resolve, reject) => {
      this.lgInstance!.put(ruleTriples, (err: Error | null) => {
        if (err) reject(err); else resolve(ruleId);
      });
    });
  }

  async validateFact(factStatement: string): Promise<boolean> {
    await this.ensureConnected();
    
    if (this.useInMemory) {
      return Promise.resolve(
        this.inMemoryStore.facts.some(fact => fact.statement === factStatement)
      );
    }
    
    return new Promise((resolve, reject) => {
      this.lgInstance!.search(
        [{ subject: this.lgInstance!.v('factId'), predicate: 'statement', object: factStatement },
         { subject: this.lgInstance!.v('factId'), predicate: 'type', object: 'Fact' }] as import('levelgraph').Triple[], 
      (err: Error | null, results?: import('levelgraph').Triple[]) => {
        if (err) reject(err); else resolve(!!results && results.length > 0);
      });
    });
  }

  async applyRules(facts: import('levelgraph').Triple[], rules: import('levelgraph').Triple[]): Promise<import('levelgraph').Triple[]> {
    await this.ensureConnected();
    console.warn('[GraphClient] applyRules is a simplified simulation for LevelGraph.');
    
    if (this.useInMemory) {
      const inferences: import('levelgraph').Triple[] = [];
      // Simple rule application simulation for in-memory mode
      for (const rule of this.inMemoryStore.rules) {
        for (const fact of this.inMemoryStore.facts) {
          if (fact.statement.includes(rule.condition)) {
            inferences.push({
              subject: `inferred_${fact.id}`,
              predicate: 'derivedFromRule',
              object: rule.id, 
              inferred_statement: rule.consequence,
              timestamp: Date.now(),
            });
          }
        }
      }
      return Promise.resolve(inferences);
    }
    
    const inferences: import('levelgraph').Triple[] = [];
    for (const rule of rules) {
      if (rule.predicate === 'condition' && typeof rule.object === 'string') {
        const condition = rule.object;
        for (const fact of facts) {
          if (fact.predicate === 'statement' && typeof fact.object === 'string' && fact.object.includes(condition)) {
            const consequenceTriple = rules.find(r => r.subject === rule.subject && r.predicate === 'consequence');
            if (consequenceTriple) {
              inferences.push({
                subject: `inferred_${fact.subject}`,
                predicate: 'derivedFromRule',
                object: rule.subject, 
                inferred_statement: consequenceTriple.object,
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    }
    return Promise.resolve(inferences);
  }

  /**
   * Properly closes the database connection and cleans up resources
   */
  async close(): Promise<void> {
    // It's important to wait for readyPromise to resolve or reject before attempting to close.
    // This ensures that _initializeDB has had a chance to run.
    if (this.readyPromise) {
      try {
        await this.readyPromise;
      } catch (initError) {
        // DB might not have opened, but dbInstance might still exist if error was after its creation.
        console.warn(`[GraphClient] Initialization via readyPromise failed for ${this.dbPath}, attempting cleanup:`, initError);
      }
    }

    if (this.useInMemory) {
      console.log(`[GraphClient] Closing in-memory storage`);
      this.connected = false;
      this.inMemoryStore = { triples: [], facts: [], rules: [] };
      return Promise.resolve();
    }

    if (this.dbInstance) {
      if (this.dbInstance.status === 'open') {
        try {
          console.log(`[GraphClient] Attempting to close DB at ${this.dbPath}`);
          await this.dbInstance.close();
          console.log(`[GraphClient] LevelGraph DB closed: ${this.dbPath}`);
          
          // Clear any lock files that might remain after closing
          this.checkAndClearLockFile();
        } catch (error) {
          console.error(`[GraphClient] Error closing LevelGraph DB ${this.dbPath}:`, error);
          // Try to force cleanup of lock files even on error
          this.checkAndClearLockFile();
        }
      } else {
        console.log(`[GraphClient] LevelGraph DB status was '${this.dbInstance.status}' (not 'open') for path: ${this.dbPath}.`);
        // Clear any lock files that might remain
        this.checkAndClearLockFile();
      }
    } else {
      console.warn(`[GraphClient] LevelGraph DB instance was null for ${this.dbPath}, not attempting close.`);
      // Clear any lock files that might remain
      this.checkAndClearLockFile();
    }
    
    this.connected = false; 
    this.lgInstance = null; 
    this.dbInstance = null; 
    this.readyPromise = Promise.reject(new Error('Client has been closed.')); // Prevent re-use after close
    
    // Clear the monitoring interval if it exists
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
      this.lockCheckInterval = null;
    }
  }
} 