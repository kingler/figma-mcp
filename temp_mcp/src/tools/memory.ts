import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from 'url';

export const memoryToolName = "memory";
export const memoryToolDescription = "Manage knowledge graph and memory storage";

interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

export const MemoryToolSchema = z.object({
  action: z.enum([
    "create_entities",
    "create_relations",
    "add_observations",
    "delete_entities",
    "delete_observations",
    "delete_relations",
    "read_graph",
    "search_nodes",
    "open_nodes"
  ]).describe("Memory action to perform"),
  entities: z.array(z.object({
    name: z.string(),
    entityType: z.string(),
    observations: z.array(z.string())
  })).optional(),
  relations: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relationType: z.string()
  })).optional(),
  observations: z.array(z.object({
    entityName: z.string(),
    contents: z.array(z.string())
  })).optional(),
  entityNames: z.array(z.string()).optional(),
  query: z.string().optional(),
  names: z.array(z.string()).optional()
});

// Get memory file path using environment variable with fallback
const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'memory.json');

// If MEMORY_FILE_PATH is just a filename, put it in the same directory as the script
const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH
  ? path.isAbsolute(process.env.MEMORY_FILE_PATH)
    ? process.env.MEMORY_FILE_PATH
    : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_FILE_PATH)
  : defaultMemoryPath;

async function loadGraph(): Promise<KnowledgeGraph> {
  try {
    const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
    const lines = data.split("\n").filter(line => line.trim() !== "");
    return lines.reduce((graph: KnowledgeGraph, line) => {
      const item = JSON.parse(line);
      if (item.type === "entity") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...entity } = item;
        graph.entities.push(entity as Entity);
      }
      if (item.type === "relation") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...relation } = item;
        graph.relations.push(relation as Relation);
      }
      return graph;
    }, { entities: [], relations: [] });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
      return { entities: [], relations: [] };
    }
    throw error;
  }
}

async function saveGraph(graph: KnowledgeGraph): Promise<void> {
  const lines = [
    ...graph.entities.map(e => JSON.stringify({ type: "entity", ...e })),
    ...graph.relations.map(r => JSON.stringify({ type: "relation", ...r })),
  ];
  await fs.writeFile(MEMORY_FILE_PATH, lines.join("\n"));
}

export async function runMemoryTool(args: z.infer<typeof MemoryToolSchema>) {
  try {
    const graph = await loadGraph();

    switch (args.action) {
      case "create_entities": {
        if (!args.entities) {
          throw new Error("Entities are required for create_entities action");
        }
        const newEntities = args.entities.filter(e => 
          !graph.entities.some(existingEntity => existingEntity.name === e.name)
        );
        graph.entities.push(...newEntities);
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: `Created ${newEntities.length} new entities`
          }],
          isError: false
        };
      }

      case "create_relations": {
        if (!args.relations) {
          throw new Error("Relations are required for create_relations action");
        }
        const newRelations = args.relations.filter(r => 
          !graph.relations.some(existingRelation => 
            existingRelation.from === r.from && 
            existingRelation.to === r.to && 
            existingRelation.relationType === r.relationType
          )
        );
        graph.relations.push(...newRelations);
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: `Created ${newRelations.length} new relations`
          }],
          isError: false
        };
      }

      case "add_observations": {
        if (!args.observations) {
          throw new Error("Observations are required for add_observations action");
        }
        const results = args.observations.map(o => {
          const entity = graph.entities.find(e => e.name === o.entityName);
          if (!entity) {
            throw new Error(`Entity with name ${o.entityName} not found`);
          }
          const newObservations = o.contents.filter(content => 
            !entity.observations.includes(content)
          );
          entity.observations.push(...newObservations);
          return { entityName: o.entityName, addedObservations: newObservations };
        });
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: results.map(r => 
              `Added ${r.addedObservations.length} observations to ${r.entityName}`
            ).join('\n')
          }],
          isError: false
        };
      }

      case "delete_entities": {
        if (!args.entityNames) {
          throw new Error("Entity names are required for delete_entities action");
        }
        const originalEntityCount = graph.entities.length;
        const originalRelationCount = graph.relations.length;
        graph.entities = graph.entities.filter(e => !args.entityNames?.includes(e.name));
        graph.relations = graph.relations.filter(r => 
          !args.entityNames?.includes(r.from) && !args.entityNames?.includes(r.to)
        );
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: `Deleted ${originalEntityCount - graph.entities.length} entities and ${originalRelationCount - graph.relations.length} related relations`
          }],
          isError: false
        };
      }

      case "delete_observations": {
        if (!args.observations) {
          throw new Error("Observations are required for delete_observations action");
        }
        args.observations.forEach(d => {
          const entity = graph.entities.find(e => e.name === d.entityName);
          if (entity) {
            entity.observations = entity.observations.filter(o => !d.contents.includes(o));
          }
        });
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: "Observations deleted successfully"
          }],
          isError: false
        };
      }

      case "delete_relations": {
        if (!args.relations) {
          throw new Error("Relations are required for delete_relations action");
        }
        const originalCount = graph.relations.length;
        graph.relations = graph.relations.filter(r => 
          !args.relations?.some(delRelation => 
            r.from === delRelation.from && 
            r.to === delRelation.to && 
            r.relationType === delRelation.relationType
          )
        );
        await saveGraph(graph);
        return {
          content: [{
            type: "text",
            text: `Deleted ${originalCount - graph.relations.length} relations`
          }],
          isError: false
        };
      }

      case "read_graph": {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(graph, null, 2)
          }],
          isError: false
        };
      }

      case "search_nodes": {
        if (!args.query) {
          throw new Error("Query is required for search_nodes action");
        }
        const query = args.query.toLowerCase();
        const filteredEntities = graph.entities.filter(e => 
          e.name.toLowerCase().includes(query) ||
          e.entityType.toLowerCase().includes(query) ||
          e.observations.some(o => o.toLowerCase().includes(query))
        );
        const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
        const filteredRelations = graph.relations.filter(r => 
          filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ entities: filteredEntities, relations: filteredRelations }, null, 2)
          }],
          isError: false
        };
      }

      case "open_nodes": {
        if (!args.names) {
          throw new Error("Names are required for open_nodes action");
        }
        const filteredEntities = graph.entities.filter(e => args.names?.includes(e.name));
        const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
        const filteredRelations = graph.relations.filter(r => 
          filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ entities: filteredEntities, relations: filteredRelations }, null, 2)
          }],
          isError: false
        };
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
} 