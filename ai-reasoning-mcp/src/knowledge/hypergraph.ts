import { GraphClient } from '../graph-client.js';
import { Triple, OntologyUpdate } from './types.js';

/**
 * HyperEdge connecting multiple ontologies
 */
interface HyperEdge {
  id: string;
  label: string;
  nodes: string[];
  domains: string[];
  confidence: number;
  source: string;
  timestamp: number;
}

/**
 * HyperGraphManager manages relationships between multiple ontologies
 * and enables cross-domain knowledge connections
 */
export class HyperGraphManager {
  private graphClient: GraphClient;
  
  constructor(graphClient: GraphClient) {
    this.graphClient = graphClient;
    console.log('[HyperGraphManager] Initialized with GraphClient');
  }
  
  /**
   * Create a hyperedge connecting concepts across ontologies
   */
  async createHyperEdge(edge: Omit<HyperEdge, 'id' | 'timestamp'>): Promise<string> {
    try {
      const id = `hyperedge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const timestamp = Date.now();
      
      // Store the hyperedge metadata
      await this.graphClient.createTriple(id, 'type', 'HyperEdge', {
        label: edge.label,
        confidence: edge.confidence,
        source: edge.source,
        timestamp
      });
      
      // Connect the edge to each node
      for (const node of edge.nodes) {
        await this.graphClient.createTriple(id, 'connects', node, {
          timestamp
        });
      }
      
      // Tag the edge with domains
      for (const domain of edge.domains) {
        await this.graphClient.createTriple(id, 'domain', domain, {
          timestamp
        });
      }
      
      console.log(`[HyperGraphManager] Created hyperedge ${id} connecting nodes: ${edge.nodes.join(', ')}`);
      return id;
    } catch (error) {
      console.error('[HyperGraphManager] Error creating hyperedge:', error);
      throw error;
    }
  }
  
  /**
   * Get all hyperedges connected to a concept
   */
  async getHyperEdgesByNode(node: string): Promise<HyperEdge[]> {
    try {
      // Find all hyperedges that connect to this node
      const edgeConnections = await this.graphClient.searchTriples({
        predicate: 'connects',
        object: node
      });
      
      const edges: HyperEdge[] = [];
      
      // For each edge, get its full details
      for (const connection of edgeConnections) {
        const edgeId = connection.subject;
        
        // Get edge metadata
        const edgeMetadata = await this.graphClient.searchTriples({
          subject: edgeId,
          predicate: 'type',
          object: 'HyperEdge'
        });
        
        if (edgeMetadata.length > 0) {
          const metadata = edgeMetadata[0];
          
          // Get all connected nodes
          const connectedNodes = await this.graphClient.searchTriples({
            subject: edgeId,
            predicate: 'connects'
          });
          
          // Get domains
          const domainTriples = await this.graphClient.searchTriples({
            subject: edgeId,
            predicate: 'domain'
          });
          
          edges.push({
            id: edgeId,
            label: metadata.label as string || 'Unlabeled',
            nodes: connectedNodes.map(n => n.object as string),
            domains: domainTriples.map(d => d.object as string),
            confidence: metadata.confidence as number || 0.5,
            source: metadata.source as string || 'unknown',
            timestamp: metadata.timestamp as number || Date.now()
          });
        }
      }
      
      return edges;
    } catch (error) {
      console.error('[HyperGraphManager] Error getting hyperedges:', error);
      return [];
    }
  }
  
  /**
   * Find concepts in other domains related to a given concept
   * This enables cross-domain knowledge discovery
   */
  async findRelatedConcepts(concept: string, sourceDomain: string): Promise<Array<{
    concept: string;
    domain: string;
    relationship: string;
    confidence: number;
  }>> {
    try {
      const related: Array<{
        concept: string;
        domain: string;
        relationship: string;
        confidence: number;
      }> = [];
      
      // Get hyperedges connected to this concept
      const edges = await this.getHyperEdgesByNode(concept);
      
      // Extract related concepts from other domains
      for (const edge of edges) {
        // Filter out the source concept and get nodes from other domains
        const relatedNodes = edge.nodes.filter(n => n !== concept);
        
        // Get domain information for each related node
        for (const node of relatedNodes) {
          // Find what domains this node belongs to
          const domainTriples = await this.graphClient.searchTriples({
            subject: node,
            predicate: 'is_a'
          });
          
          for (const triple of domainTriples) {
            const domainMatch = (triple.object as string).match(/^(.+)_concept$/);
            if (domainMatch && domainMatch[1] !== sourceDomain) {
              related.push({
                concept: node,
                domain: domainMatch[1],
                relationship: edge.label,
                confidence: edge.confidence
              });
            }
          }
        }
      }
      
      return related;
    } catch (error) {
      console.error('[HyperGraphManager] Error finding related concepts:', error);
      return [];
    }
  }
  
  /**
   * Build a knowledge context by traversing the hypergraph around seed concepts
   * This is used to expand the problem-solving context dynamically
   */
  async buildExpandedContext(
    seedConcepts: string[],
    seedDomain: string,
    maxDepth: number = 2,
    minConfidence: number = 0.6
  ): Promise<{
    concepts: Record<string, {domain: string, connections: number}>;
    relationships: Array<{source: string, target: string, label: string, confidence: number}>;
  }> {
    const visited = new Set<string>();
    const concepts: Record<string, {domain: string, connections: number}> = {};
    const relationships: Array<{
      source: string;
      target: string;
      label: string;
      confidence: number;
    }> = [];
    
    // Recursive exploration function
    const explore = async (concept: string, domain: string, depth: number) => {
      // Skip if we've seen this concept or reached max depth
      if (visited.has(concept) || depth > maxDepth) return;
      visited.add(concept);
      
      // Add this concept to our collection
      if (!concepts[concept]) {
        concepts[concept] = {domain, connections: 0};
      }
      
      // Get related concepts through hyperedges
      const related = await this.findRelatedConcepts(concept, domain);
      
      // Filter by confidence and add relationships
      const validRelated = related.filter(r => r.confidence >= minConfidence);
      
      for (const rel of validRelated) {
        // Add the concept if it's new
        if (!concepts[rel.concept]) {
          concepts[rel.concept] = {domain: rel.domain, connections: 0};
        }
        
        // Update connection counts
        concepts[concept].connections++;
        concepts[rel.concept].connections++;
        
        // Add the relationship
        relationships.push({
          source: concept,
          target: rel.concept,
          label: rel.relationship,
          confidence: rel.confidence
        });
        
        // Explore deeper if we haven't reached max depth
        if (depth < maxDepth) {
          await explore(rel.concept, rel.domain, depth + 1);
        }
      }
      
      // Also explore direct triple relationships within the same domain
      const directTriples = await this.graphClient.searchTriples({
        subject: concept,
        context: `domain:${domain}`
      });
      
      for (const triple of directTriples) {
        if (
          typeof triple.object === 'string' && 
          triple.predicate !== 'type' &&
          triple.predicate !== 'is_a' &&
          !visited.has(triple.object as string)
        ) {
          const confidence = triple.confidence as number || 0.7;
          
          if (confidence >= minConfidence) {
            // Add this concept to our collection
            if (!concepts[triple.object as string]) {
              concepts[triple.object as string] = {domain, connections: 0};
            }
            
            // Update connection counts
            concepts[concept].connections++;
            concepts[triple.object as string].connections++;
            
            // Add the relationship
            relationships.push({
              source: concept,
              target: triple.object as string,
              label: triple.predicate,
              confidence: confidence
            });
            
            // Explore deeper if we haven't reached max depth
            if (depth < maxDepth) {
              await explore(triple.object as string, domain, depth + 1);
            }
          }
        }
      }
    };
    
    // Start exploration from each seed concept
    for (const concept of seedConcepts) {
      await explore(concept, seedDomain, 0);
    }
    
    return { concepts, relationships };
  }
  
  /**
   * Create connections between SDLC ontology and world knowledge
   * This is used to ground software development concepts in real-world contexts
   */
  async connectSDLCToWorldOntology(
    sdlcConcept: string,
    worldConcepts: string[],
    relationship: string,
    confidence: number = 0.8
  ): Promise<string> {
    return this.createHyperEdge({
      label: relationship,
      nodes: [sdlcConcept, ...worldConcepts],
      domains: ['sdlc', 'world'],
      confidence,
      source: 'sdlc_world_mapping'
    });
  }
  
  /**
   * Dynamically update the world model based on new information
   * This allows agents to expand their context during problem solving
   */
  async updateWorldModel(
    newConcepts: Array<{concept: string, domain: string}>,
    newRelationships: Array<{
      source: string,
      target: string,
      relationship: string,
      confidence: number
    }>
  ): Promise<void> {
    try {
      console.log(`[HyperGraphManager] Updating world model with ${newConcepts.length} concepts and ${newRelationships.length} relationships`);
      
      // Add new concepts
      for (const {concept, domain} of newConcepts) {
        await this.graphClient.createTriple(concept, 'is_a', `${domain}_concept`, {
          context: `domain:${domain}`,
          source: 'dynamic_update',
          timestamp: Date.now()
        });
      }
      
      // Add new relationships
      for (const {source, target, relationship, confidence} of newRelationships) {
        await this.graphClient.createTriple(source, relationship, target, {
          confidence,
          source: 'dynamic_update',
          timestamp: Date.now()
        });
      }
      
      console.log('[HyperGraphManager] World model updated successfully');
    } catch (error) {
      console.error('[HyperGraphManager] Error updating world model:', error);
      throw error;
    }
  }
  
  /**
   * Get a slice of the world ontology relevant to specific SDLC tasks
   * This provides context-relevant information for problem solving
   */
  async getContextRelevantWorldKnowledge(
    sdlcConcepts: string[],
    task: string
  ): Promise<{
    concepts: string[];
    facts: Array<{statement: string, confidence: number}>;
  }> {
    try {
      const relevantConcepts = new Set<string>();
      const facts: Array<{statement: string, confidence: number}> = [];
      
      // For each SDLC concept, find related world knowledge
      for (const concept of sdlcConcepts) {
        const related = await this.findRelatedConcepts(concept, 'sdlc');
        
        // Filter to only world domain concepts
        const worldConcepts = related.filter(r => r.domain === 'world');
        
        // Add to our collection
        for (const wc of worldConcepts) {
          relevantConcepts.add(wc.concept);
          
          // Find facts about this concept
          const conceptTriples = await this.graphClient.searchTriples({
            subject: wc.concept,
            context: 'domain:world'
          });
          
          // Extract factual statements
          for (const triple of conceptTriples) {
            if (
              typeof triple.object === 'string' && 
              triple.predicate !== 'type' && 
              triple.predicate !== 'is_a'
            ) {
              facts.push({
                statement: `${wc.concept} ${triple.predicate} ${triple.object}`,
                confidence: triple.confidence as number || 0.5
              });
            }
          }
        }
      }
      
      // If we have a task description, use it to filter for more relevant facts
      if (task) {
        const taskWords = task.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3);
          
        // Only keep facts that contain task-relevant terms
        if (taskWords.length > 0) {
          facts.sort((a, b) => {
            const aRelevance = taskWords.filter(w => a.statement.toLowerCase().includes(w)).length;
            const bRelevance = taskWords.filter(w => b.statement.toLowerCase().includes(w)).length;
            return bRelevance - aRelevance;
          });
        }
      }
      
      return {
        concepts: Array.from(relevantConcepts),
        facts: facts.slice(0, 20) // Limit to prevent overwhelming context
      };
    } catch (error) {
      console.error('[HyperGraphManager] Error getting context-relevant world knowledge:', error);
      return { concepts: [], facts: [] };
    }
  }
} 