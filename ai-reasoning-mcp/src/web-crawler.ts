import { LLMClient } from './llm-client.js';
import { Triple, OntologyUpdate } from './knowledge/types.js';
import { MCPBridge } from './mcp-bridge.js';

interface CrawlResult {
  content: string;
  url: string;
  citations: { [key: string]: string };
}

export class WebCrawler {
  private llmClient: LLMClient;
  
  constructor(llmClient: LLMClient) {
    this.llmClient = llmClient;
    console.log('[WebCrawler] Initialized with LLM client');
  }
  
  /**
   * Crawl web pages related to a domain topic and extract concepts for ontology enrichment
   */
  async enrichOntology(domain: string, existingConcepts: string[]): Promise<OntologyUpdate> {
    try {
      console.log(`[WebCrawler] Enriching ontology for domain: ${domain}`);
      
      // Step 1: Generate search queries for the domain based on existing concepts
      const searchQueries = await this.generateSearchQueries(domain, existingConcepts);
      
      // Step 2: Crawl relevant web pages using crawl4AI MCP
      const crawlResults = await this.crawlWebPages(searchQueries);
      
      // Step 3: Extract concepts and relationships from crawled content
      const updates = await this.extractOntologyUpdates(crawlResults, domain, existingConcepts);
      
      return updates;
    } catch (error) {
      console.error('[WebCrawler] Error enriching ontology:', error);
      return { domain, newConcepts: [], relationships: [] };
    }
  }
  
  /**
   * Generate search queries based on domain and existing concepts
   */
  private async generateSearchQueries(domain: string, existingConcepts: string[]): Promise<string[]> {
    // Use a few top concepts to generate search queries
    const topConcepts = existingConcepts.slice(0, 5);
    
    const baseQueries = [
      `${domain} ontology`,
      `${domain} key concepts`,
      `${domain} knowledge graph`,
    ];
    
    // Add concept-specific queries
    const conceptQueries = topConcepts.map(concept => `${concept} ${domain} relationship`);
    
    return [...baseQueries, ...conceptQueries];
  }
  
  /**
   * Crawl web pages using crawl4AI MCP
   */
  private async crawlWebPages(searchQueries: string[]): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    
    try {
      // For each search query, get top search results
      for (const query of searchQueries) {
        console.log(`[WebCrawler] Crawling web for query: "${query}"`);
        
        // Use global crawl4AI MCP to crawl URLs
        // This function needs to invoke the MPC client dynamically
        const urls = await this.getTopSearchResults(query, 3);
        
        if (urls.length > 0) {
          try {
            // Call the crawl4ai tool through global invocation
            // @ts-ignore - The global MCP is accessed through process invocation
            const result = await this.invokeCrawl4AIMCP(urls);
            
            if (result && result.content) {
              results.push({
                content: result.content,
                url: urls[0], // Use the first URL as primary source
                citations: result.citations || {}
              });
              console.log(`[WebCrawler] Successfully crawled ${urls.length} URLs for query "${query}"`);
            }
          } catch (crawlError) {
            console.error(`[WebCrawler] Error crawling URLs for query "${query}":`, crawlError);
          }
        }
      }
    } catch (error) {
      console.error('[WebCrawler] Error during web crawling:', error);
    }
    
    return results;
  }
  
  /**
   * Invoke the crawl4AI MCP to fetch and parse web content
   */
  private async invokeCrawl4AIMCP(urls: string[]): Promise<any> {
    try {
      console.log(`[WebCrawler] Invoking crawl4AI MCP for URLs: ${urls.join(', ')}`);
      
      // Use the MCPBridge to call the crawl4AI MCP
      return await MCPBridge.crawlUrls(urls);
    } catch (error) {
      console.error('[WebCrawler] Error invoking crawl4AI MCP:', error);
      throw error;
    }
  }
  
  /**
   * Get top search results for a query
   */
  private async getTopSearchResults(query: string, limit: number): Promise<string[]> {
    try {
      console.log(`[WebCrawler] Getting top ${limit} search results for query: "${query}"`);
      
      // Use the MCPBridge to perform a web search
      const searchResults = await MCPBridge.webSearch(query);
      
      // Return the URLs, limited to the requested amount
      return searchResults.urls.slice(0, limit);
    } catch (error) {
      console.error('[WebCrawler] Error getting search results:', error);
      return [];
    }
  }
  
  /**
   * Extract ontology updates from crawled content
   */
  private async extractOntologyUpdates(
    crawlResults: CrawlResult[],
    domain: string,
    existingConcepts: string[]
  ): Promise<OntologyUpdate> {
    const allNewConcepts: Set<string> = new Set();
    const relationships: Array<{from: string, relation: string, to: string, confidence: number}> = [];
    
    // Process each crawl result
    for (const result of crawlResults) {
      try {
        console.log(`[WebCrawler] Extracting ontology updates from crawled content (${result.content.length} chars)`);
        
        // 1. Extract triples from crawled content using LLM
        const triples = await this.llmClient.extractTriples(result.content, `domain:${domain}`);
        
        // 2. Process extracted triples to find new concepts and relationships
        for (const triple of triples) {
          // Consider subjects and objects as potential concepts
          if (typeof triple.subject === 'string' && !existingConcepts.includes(triple.subject)) {
            allNewConcepts.add(triple.subject);
          }
          
          if (typeof triple.object === 'string' && !existingConcepts.includes(triple.object)) {
            allNewConcepts.add(triple.object);
          }
          
          // Add relationship if predicate describes a relationship
          if (
            typeof triple.subject === 'string' && 
            typeof triple.object === 'string' && 
            typeof triple.predicate === 'string'
          ) {
            relationships.push({
              from: triple.subject,
              relation: triple.predicate,
              to: triple.object,
              confidence: triple.confidence || 0.7
            });
          }
        }
        
        // 3. Use the LLM to generate additional domain-specific relationships
        if (allNewConcepts.size > 0) {
          const newConcepts = Array.from(allNewConcepts);
          const ontologyUpdate = await this.llmClient.updateOntology(
            domain, 
            [...existingConcepts, ...newConcepts.slice(0, 20)] // Limit to prevent too large a context
          );
          
          // Add the LLM-generated relationships
          relationships.push(...ontologyUpdate.relationships);
        }
      } catch (error) {
        console.error('[WebCrawler] Error extracting updates from crawled content:', error);
      }
    }
    
    // Remove duplicates and format result
    return {
      domain,
      newConcepts: Array.from(allNewConcepts),
      relationships: this.deduplicateRelationships(relationships)
    };
  }
  
  /**
   * Remove duplicate relationships
   */
  private deduplicateRelationships(
    relationships: Array<{from: string, relation: string, to: string, confidence: number}>
  ): Array<{from: string, relation: string, to: string, confidence: number}> {
    const uniqueMap = new Map<string, {from: string, relation: string, to: string, confidence: number}>();
    
    for (const rel of relationships) {
      const key = `${rel.from}::${rel.relation}::${rel.to}`;
      
      // If relation doesn't exist or new one has higher confidence, keep it
      if (!uniqueMap.has(key) || uniqueMap.get(key)!.confidence < rel.confidence) {
        uniqueMap.set(key, rel);
      }
    }
    
    return Array.from(uniqueMap.values());
  }
} 