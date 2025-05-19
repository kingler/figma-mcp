# NeoJS Integration Guide

## Overview

This guide details the integration of NeoJS for knowledge representation and reasoning within the AI framework, implementing graph-based knowledge storage and inference capabilities.

## Setup

### 1. Dependencies

```bash
# Install NeoJS and type definitions
npm install neo4j-driver@5.15.0 @types/neo4j-driver@5.15.0
npm install @neo4j/graphql@4.4.0
npm install graphql@16.8.1

# Optional: Schema validation
npm install @neo4j/graphql-schema-validation
```

### 2. Database Configuration

```typescript
// src/config/neo4j.config.ts
import { Driver, driver, auth } from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export class Neo4jService {
  private static _driver: Driver;

  static async init(config: Neo4jConfig): Promise<Driver> {
    if (!this._driver) {
      this._driver = driver(
        config.uri,
        auth.basic(config.username, config.password)
      );
      
      // Verify connection
      try {
        await this._driver.verifyConnectivity();
        console.log('Connected to Neo4j');
      } catch (error) {
        console.error('Failed to connect to Neo4j:', error);
        throw error;
      }
    }
    return this._driver;
  }

  static get driver(): Driver {
    if (!this._driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this._driver;
  }

  static async close(): Promise<void> {
    if (this._driver) {
      await this._driver.close();
      this._driver = null;
    }
  }
}
```

## Knowledge Graph Schema

### 1. Core Schema Definition

```typescript
// src/schema/knowledge-graph.ts
import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Concept {
    id: ID! @id
    name: String!
    description: String
    category: String
    relationships: [Relationship!]! @relationship(type: "RELATES_TO", direction: OUT)
    properties: [Property!]! @relationship(type: "HAS_PROPERTY", direction: OUT)
    createdAt: DateTime! @timestamp(operations: [CREATE])
    updatedAt: DateTime! @timestamp(operations: [UPDATE])
  }

  type Relationship {
    id: ID! @id
    type: String!
    weight: Float
    source: Concept! @relationship(type: "SOURCE", direction: IN)
    target: Concept! @relationship(type: "TARGET", direction: OUT)
    properties: [Property!]! @relationship(type: "HAS_PROPERTY", direction: OUT)
    createdAt: DateTime! @timestamp(operations: [CREATE])
  }

  type Property {
    id: ID! @id
    key: String!
    value: String!
    type: String!
    confidence: Float
    createdAt: DateTime! @timestamp(operations: [CREATE])
  }

  type ReasoningPattern {
    id: ID! @id
    name: String!
    description: String
    pattern: String!
    concepts: [Concept!]! @relationship(type: "USES_CONCEPT", direction: OUT)
    confidence: Float
    createdAt: DateTime! @timestamp(operations: [CREATE])
  }
`;
```

### 2. Knowledge Repository Implementation

```typescript
// src/repositories/knowledge.repository.ts
import { Driver } from 'neo4j-driver';
import { Neo4jService } from '../config/neo4j.config';

export class KnowledgeRepository {
  private readonly driver: Driver;

  constructor() {
    this.driver = Neo4jService.driver;
  }

  async addConcept(concept: {
    name: string;
    description?: string;
    category?: string;
  }): Promise<string> {
    const session = this.driver.session();
    try {
      const result = await session.executeWrite(tx =>
        tx.run(
          `
          CREATE (c:Concept {
            name: $name,
            description: $description,
            category: $category,
            createdAt: datetime()
          })
          RETURN c.id as id
          `,
          concept
        )
      );
      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  async createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    properties: Record<string, any> = {}
  ): Promise<string> {
    const session = this.driver.session();
    try {
      const result = await session.executeWrite(tx =>
        tx.run(
          `
          MATCH (source:Concept {id: $sourceId})
          MATCH (target:Concept {id: $targetId})
          CREATE (source)-[r:${type} $properties]->(target)
          SET r.createdAt = datetime()
          RETURN r.id as id
          `,
          { sourceId, targetId, properties }
        )
      );
      return result.records[0].get('id');
    } finally {
      await session.close();
    }
  }

  async findRelatedConcepts(
    conceptId: string,
    depth: number = 1
  ): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.executeRead(tx =>
        tx.run(
          `
          MATCH (c:Concept {id: $conceptId})-[r*1..${depth}]-(related)
          RETURN related, r
          `,
          { conceptId }
        )
      );
      return result.records.map(record => ({
        concept: record.get('related').properties,
        relationships: record.get('r').map(rel => rel.properties)
      }));
    } finally {
      await session.close();
    }
  }
}
```

### 3. Reasoning Engine Integration

```typescript
// src/services/reasoning.service.ts
import { KnowledgeRepository } from '../repositories/knowledge.repository';

export class ReasoningService {
  private knowledgeRepo: KnowledgeRepository;

  constructor() {
    this.knowledgeRepo = new KnowledgeRepository();
  }

  async analyzeContext(input: string, context: Record<string, any>): Promise<any> {
    // Extract key concepts from input
    const concepts = await this.extractConcepts(input);
    
    // Find related knowledge
    const knowledge = await Promise.all(
      concepts.map(concept =>
        this.knowledgeRepo.findRelatedConcepts(concept.id, 2)
      )
    );

    // Apply reasoning patterns
    const patterns = await this.findApplicablePatterns(knowledge);
    
    // Generate conclusions
    return this.generateConclusions(patterns, context);
  }

  private async extractConcepts(input: string): Promise<any[]> {
    const session = Neo4jService.driver.session();
    try {
      const result = await session.executeRead(tx =>
        tx.run(
          `
          CALL apoc.nlp.concepts.extract($input, {
            confidence: 0.8,
            language: "en"
          })
          YIELD value
          RETURN value
          `,
          { input }
        )
      );
      return result.records.map(record => record.get('value'));
    } finally {
      await session.close();
    }
  }

  private async findApplicablePatterns(
    knowledge: any[]
  ): Promise<any[]> {
    const session = Neo4jService.driver.session();
    try {
      const result = await session.executeRead(tx =>
        tx.run(
          `
          MATCH (p:ReasoningPattern)
          WHERE p.confidence > 0.7
          WITH p
          MATCH (p)-[:USES_CONCEPT]->(c:Concept)
          WHERE c.id IN $conceptIds
          RETURN p, collect(c) as concepts
          ORDER BY p.confidence DESC
          `,
          { conceptIds: knowledge.map(k => k.concept.id) }
        )
      );
      return result.records.map(record => ({
        pattern: record.get('p').properties,
        concepts: record.get('concepts').map(c => c.properties)
      }));
    } finally {
      await session.close();
    }
  }

  private async generateConclusions(
    patterns: any[],
    context: Record<string, any>
  ): Promise<any> {
    // Implement conclusion generation logic
    return {
      conclusions: patterns.map(pattern => ({
        confidence: pattern.pattern.confidence,
        reasoning: pattern.pattern.description,
        concepts: pattern.concepts
      })),
      context
    };
  }
}
```

## Usage Example

```typescript
// src/index.ts
import { Neo4jService } from './config/neo4j.config';
import { ReasoningService } from './services/reasoning.service';

async function main() {
  // Initialize Neo4j connection
  await Neo4jService.init({
    uri: 'neo4j://localhost:7687',
    username: 'neo4j',
    password: 'your-password'
  });

  const reasoningService = new ReasoningService();

  // Analyze input
  const result = await reasoningService.analyzeContext(
    'How can we optimize database performance?',
    { domain: 'database', context: 'performance' }
  );

  console.log('Analysis result:', result);

  // Clean up
  await Neo4jService.close();
}

main().catch(console.error);
```

## Performance Considerations

1. **Indexing**:
```cypher
// Create indexes for frequently queried properties
CREATE INDEX concept_name IF NOT EXISTS FOR (c:Concept) ON (c.name);
CREATE INDEX concept_category IF NOT EXISTS FOR (c:Concept) ON (c.category);
CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r:RELATES_TO]-() ON (r.type);
```

2. **Query Optimization**:
- Use parameterized queries
- Limit relationship depth in traversals
- Use APOC procedures for complex operations
- Implement caching for frequent queries

3. **Connection Management**:
- Use connection pooling
- Implement proper session handling
- Monitor active connections
- Implement retry mechanisms

## Monitoring Integration

```typescript
// src/monitoring/neo4j.metrics.ts
import { PrometheusMetrics } from '../services/monitoring/PrometheusMetrics';

export class Neo4jMetrics {
  private metrics: PrometheusMetrics;

  constructor() {
    this.metrics = new PrometheusMetrics({
      prefix: 'neo4j_'
    });

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Query metrics
    this.metrics.createHistogram({
      name: 'query_duration_ms',
      help: 'Query execution time in milliseconds',
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
    });

    // Connection metrics
    this.metrics.createGauge({
      name: 'active_connections',
      help: 'Number of active Neo4j connections'
    });

    // Cache metrics
    this.metrics.createCounter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits'
    });
  }
}
```

## Security Considerations

1. **Authentication**:
- Use strong passwords
- Implement role-based access control
- Rotate credentials regularly
- Monitor authentication attempts

2. **Data Protection**:
- Encrypt sensitive properties
- Implement access patterns
- Use secure connections (SSL/TLS)
- Regular security audits

3. **Query Safety**:
- Validate all inputs
- Use parameterized queries
- Implement query timeout
- Monitor query patterns

## Backup and Recovery

1. **Backup Strategy**:
```bash
# Automated backup script
neo4j-admin dump --database=neo4j --to=/backups/neo4j-$(date +%Y%m%d).dump

# Verify backup
neo4j-admin verify --database=neo4j --verbose
```

2. **Recovery Procedures**:
```bash
# Restore from backup
neo4j-admin load --from=/backups/neo4j-20240221.dump --database=neo4j --force
```

## Testing

1. **Unit Tests**:
```typescript
// src/__tests__/knowledge.repository.test.ts
import { KnowledgeRepository } from '../repositories/knowledge.repository';

describe('KnowledgeRepository', () => {
  let repository: KnowledgeRepository;

  beforeAll(async () => {
    // Initialize test database
  });

  afterAll(async () => {
    // Clean up test database
  });

  it('should create a concept', async () => {
    const concept = {
      name: 'Test Concept',
      description: 'Test Description'
    };
    const id = await repository.addConcept(concept);
    expect(id).toBeDefined();
  });
});
```

2. **Integration Tests**:
```typescript
// src/__tests__/reasoning.service.test.ts
import { ReasoningService } from '../services/reasoning.service';

describe('ReasoningService', () => {
  let service: ReasoningService;

  beforeAll(async () => {
    // Initialize test environment
  });

  it('should analyze context', async () => {
    const result = await service.analyzeContext(
      'test input',
      { test: true }
    );
    expect(result.conclusions).toBeDefined();
  });
});
``` 