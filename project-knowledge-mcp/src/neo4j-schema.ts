import neo4j, { Driver, Session } from 'neo4j-driver';

export class Neo4jSchemaManager {
  private driver: Driver;

  constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password)
    );
  }

  async close() {
    await this.driver.close();
  }

  async initializeSchema() {
    const session = this.driver.session();
    try {
      // Project Structure Constraints
      await session.run(`
        CREATE CONSTRAINT directory_path IF NOT EXISTS
        FOR (d:Directory) REQUIRE d.path IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT component_name IF NOT EXISTS
        FOR (c:Component) REQUIRE c.name IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT convention_type IF NOT EXISTS
        FOR (r:ConventionRule) REQUIRE (r.type, r.name) IS NODE KEY
      `);
      await session.run(`
        CREATE CONSTRAINT file_path IF NOT EXISTS
        FOR (f:File) REQUIRE f.path IS UNIQUE
      `);

      // Knowledge Base Constraints
      await session.run(`
        CREATE CONSTRAINT triple_id IF NOT EXISTS
        FOR (t:Triple) REQUIRE t.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT fact_id IF NOT EXISTS
        FOR (f:Fact) REQUIRE f.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT rule_id IF NOT EXISTS
        FOR (r:Rule) REQUIRE r.id IS UNIQUE
      `);

      // Agent Knowledge Constraints
      await session.run(`
        CREATE CONSTRAINT agent_id IF NOT EXISTS
        FOR (a:Agent) REQUIRE a.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT responsibility_id IF NOT EXISTS
        FOR (r:Responsibility) REQUIRE r.id IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT metric_id IF NOT EXISTS
        FOR (m:Metric) REQUIRE (m.agentId, m.name) IS NODE KEY
      `);

      // Indexes for Performance
      await session.run(`
        CREATE INDEX component_type IF NOT EXISTS
        FOR (c:Component) ON (c.type)
      `);
      await session.run(`
        CREATE INDEX directory_name IF NOT EXISTS
        FOR (d:Directory) ON (d.name)
      `);
      await session.run(`
        CREATE INDEX agent_name IF NOT EXISTS
        FOR (a:Agent) ON (a.name)
      `);
    } finally {
      await session.close();
    }
  }

  async addDirectory(path: string, name: string, description?: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (d:Directory {path: $path})
        SET d.name = $name,
            d.description = $description
      `, { path, name, description });
    } finally {
      await session.close();
    }
  }

  async addComponent(name: string, type: string, directory: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (d:Directory {path: $directory})
        MERGE (c:Component {name: $name})
        SET c.type = $type
        CREATE (d)-[:CONTAINS]->(c)
      `, { name, type, directory });
    } finally {
      await session.close();
    }
  }

  async addConventionRule(type: string, name: string, rule: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (r:ConventionRule {type: $type, name: $name})
        SET r.rule = $rule
      `, { type, name, rule });
    } finally {
      await session.close();
    }
  }

  async addAgent(id: string, name: string, type: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (a:Agent {id: $id})
        SET a.name = $name,
            a.type = $type
      `, { id, name, type });
    } finally {
      await session.close();
    }
  }

  async addResponsibility(agentId: string, name: string, tasks: string[]): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (a:Agent {id: $agentId})
        CREATE (r:Responsibility {
          id: $respId,
          name: $name
        })
        CREATE (a)-[:HAS_RESPONSIBILITY]->(r)
        WITH r
        UNWIND $tasks as task
        CREATE (t:Task {name: task})
        CREATE (r)-[:INCLUDES]->(t)
      `, {
        agentId,
        respId: `${agentId}_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        tasks
      });
    } finally {
      await session.close();
    }
  }

  async addMetric(agentId: string, name: string, type: string, value: number): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (a:Agent {id: $agentId})
        MERGE (m:Metric {agentId: $agentId, name: $name})
        SET m.type = $type,
            m.value = $value,
            m.timestamp = timestamp()
        CREATE (a)-[:MONITORS]->(m)
      `, { agentId, name, type, value });
    } finally {
      await session.close();
    }
  }

  async linkComponentToConvention(componentName: string, conventionType: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (c:Component {name: $componentName})
        MATCH (r:ConventionRule {type: $conventionType})
        MERGE (c)-[:FOLLOWS]->(r)
      `, { componentName, conventionType });
    } finally {
      await session.close();
    }
  }

  async getProjectStructure(): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (d:Directory)
        OPTIONAL MATCH (d)-[:CONTAINS]->(c:Component)
        OPTIONAL MATCH (d)-[:CONTAINS]->(f:File)
        RETURN d, collect(distinct c) as components, collect(distinct f) as files
      `);
      return result.records.map(record => ({
        directory: record.get('d').properties,
        components: record.get('components').map((c: any) => c.properties),
        files: record.get('files').map((f: any) => f.properties)
      }));
    } finally {
      await session.close();
    }
  }

  async getAgentKnowledge(agentId: string): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (a:Agent {id: $agentId})
        OPTIONAL MATCH (a)-[:HAS_RESPONSIBILITY]->(r:Responsibility)-[:INCLUDES]->(t:Task)
        OPTIONAL MATCH (a)-[:MONITORS]->(m:Metric)
        RETURN a,
          collect(distinct {responsibility: r, tasks: collect(t)}) as responsibilities,
          collect(distinct m) as metrics
      `, { agentId });
      
      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      return {
        agent: record.get('a').properties,
        responsibilities: record.get('responsibilities')
          .filter((r: any) => r.responsibility)
          .map((r: any) => ({
            ...r.responsibility.properties,
            tasks: r.tasks.map((t: any) => t.properties)
          })),
        metrics: record.get('metrics').map((m: any) => m.properties)
      };
    } finally {
      await session.close();
    }
  }
}
