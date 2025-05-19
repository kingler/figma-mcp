import neo4j, { Driver, Session } from 'neo4j-driver';

export interface Thought {
  content: string;
  number: number;
  branchId?: string;
  revisedFrom?: number;
  timestamp: number;
}

export class Neo4jManager {
  private driver: Driver;

  constructor() {
    // Using the NEO4J_AUTH=none configuration from the .env file
    this.driver = neo4j.driver(
      'neo4j://localhost:7687',
      neo4j.auth.basic('neo4j', 'password123'),
      {
        encrypted: false,
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      }
    );
    this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    const session = this.driver.session();
    try {
      // Create only uniqueness constraints and indexes - compatible with Neo4j Community Edition
      await session.run(`
        CREATE CONSTRAINT thought_number_unique IF NOT EXISTS
        FOR (t:Thought) REQUIRE t.number IS UNIQUE
      `);
      
      // Create index on branchId
      await session.run(`
        CREATE INDEX thought_branch IF NOT EXISTS
        FOR (t:Thought) ON (t.branchId)
      `);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }

  async addThought(thought: Omit<Thought, 'timestamp'>): Promise<void> {
    const session = this.driver.session();
    try {
      // Create the thought node
      const result = await session.run(`
        MATCH (prev:Thought {number: $prevNum, branchId: $branchId})
        CREATE (t:Thought {
          content: $content,
          number: $number,
          branchId: $branchId,
          revisedFrom: $revisedFrom,
          timestamp: timestamp()
        })
        CREATE (prev)-[:NEXT]->(t)
        WITH t
        OPTIONAL MATCH (k:Triple)
        WHERE k.subject CONTAINS $content OR k.predicate CONTAINS $content OR k.object CONTAINS $content
        CREATE (t)-[:REFERENCES]->(k)
        RETURN t
      `, {
        content: thought.content,
        number: thought.number,
        branchId: thought.branchId || 'main',
        revisedFrom: thought.revisedFrom,
        prevNum: thought.number - 1
      });

      // If this is the first thought in a sequence
      if (result.records.length === 0 && thought.number === 1) {
        await session.run(`
          CREATE (t:Thought {
            content: $content,
            number: $number,
            branchId: $branchId,
            revisedFrom: $revisedFrom,
            timestamp: timestamp()
          })
          WITH t
          OPTIONAL MATCH (k:Triple)
          WHERE k.subject CONTAINS $content OR k.predicate CONTAINS $content OR k.object CONTAINS $content
          CREATE (t)-[:REFERENCES]->(k)
        `, {
          content: thought.content,
          number: thought.number,
          branchId: thought.branchId || 'main',
          revisedFrom: thought.revisedFrom
        });
      }
    } finally {
      await session.close();
    }
  }

  async getThought(number: number, branchId?: string): Promise<Thought | undefined> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Thought {number: $number, branchId: $branchId})
        RETURN t
      `, {
        number,
        branchId: branchId || 'main'
      });

      if (result.records.length === 0) {
        return undefined;
      }

      const thought = result.records[0].get('t').properties;
      return {
        content: thought.content,
        number: thought.number.toNumber(),
        branchId: thought.branchId,
        revisedFrom: thought.revisedFrom?.toNumber(),
        timestamp: thought.timestamp.toNumber()
      };
    } finally {
      await session.close();
    }
  }

  async validateThoughtSequence(number: number, branchId?: string): Promise<boolean> {
    if (number === 1) return true;

    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Thought {number: $prevNum, branchId: $branchId})
        RETURN t
      `, {
        prevNum: number - 1,
        branchId: branchId || 'main'
      });

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  async getRelatedKnowledge(content: string): Promise<Array<{type: string, content: string}>> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Thought {content: $content})-[:REFERENCES]->(k)
        RETURN k
        UNION
        MATCH (f:Fact)
        WHERE f.statement CONTAINS $content
        RETURN f as k
        UNION
        MATCH (r:Rule)
        WHERE r.condition CONTAINS $content OR r.consequence CONTAINS $content
        RETURN r as k
      `, { content });

      return result.records.map(record => {
        const node = record.get('k');
        const labels = node.labels;
        if (labels.includes('Triple')) {
          return {
            type: 'Triple',
            content: `${node.properties.subject} ${node.properties.predicate} ${node.properties.object}`
          };
        } else if (labels.includes('Fact')) {
          return {
            type: 'Fact',
            content: node.properties.statement
          };
        } else {
          return {
            type: 'Rule',
            content: `IF ${node.properties.condition} THEN ${node.properties.consequence}`
          };
        }
      });
    } finally {
      await session.close();
    }
  }

  async getBranchInfo(branchId: string): Promise<{
    parentBranch: string;
    branchPoint: number;
    thoughtCount: number;
  } | undefined> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Thought {branchId: $branchId})
        WITH min(t.number) as firstNum, count(t) as cnt
        MATCH (t:Thought {number: firstNum, branchId: $branchId})
        WHERE t.revisedFrom IS NOT NULL
        RETURN t.revisedFrom as branchPoint, cnt as thoughtCount
      `, { branchId });

      if (result.records.length === 0) {
        return undefined;
      }

      const record = result.records[0];
      return {
        parentBranch: 'main',
        branchPoint: record.get('branchPoint').toNumber(),
        thoughtCount: record.get('thoughtCount').toNumber()
      };
    } finally {
      await session.close();
    }
  }
}
