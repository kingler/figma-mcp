import Anthropic from '@anthropic-ai/sdk';
import { Triple } from './knowledge/types.js';

export class LLMClient {
  private anthropic: Anthropic;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    // Get environment variables with defaults
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'claude-3-7-sonnet-20250219';
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.2');
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4000', 10);
    
    // Initialize the Anthropic client
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    console.log(`[LLMClient] Initialized with model: ${this.model}`);
  }

  /**
   * Extract knowledge triples from text
   */
  async extractTriples(text: string, context: string = ''): Promise<Triple[]> {
    const prompt = `
    Extract knowledge triples from the following text. 
    A triple consists of (subject, predicate, object).
    
    Text: "${text}"
    ${context ? `Context: "${context}"` : ''}
    
    Format your response as a JSON array of triples, each with:
    - subject: the entity that the statement is about
    - predicate: the relationship or property
    - object: the value or target entity
    - confidence: a number between 0 and 1 indicating certainty
    
    Example: [{"subject": "water", "predicate": "boils at", "object": "100 degrees Celsius", "confidence": 0.98}]
    `;
    
    try {
      console.log(`[LLMClient] Extracting triples from text (${text.length} chars)`);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      // Get content by accessing text content from the response
      const responseContent = response.content[0];
      const content = 'text' in responseContent ? responseContent.text : '';
      
      // Extract JSON array from response
      const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        try {
          const triples = JSON.parse(jsonMatch[0]) as Omit<Triple, 'timestamp'>[];
          return triples.map(triple => ({
            ...triple,
            timestamp: Date.now(),
            source: 'llm_extraction'
          }));
        } catch (parseError) {
          console.error('[LLMClient] Failed to parse JSON from LLM response:', parseError);
          return [];
        }
      }
      
      console.warn('[LLMClient] No valid JSON found in LLM response');
      return [];
    } catch (error) {
      console.error('[LLMClient] Error extracting triples:', error);
      return [];
    }
  }

  /**
   * Update domain ontology by suggesting new concepts and relationships
   */
  async updateOntology(domain: string, existingConcepts: string[]): Promise<{
    newConcepts: string[],
    relationships: Array<{from: string, relation: string, to: string, confidence: number}>
  }> {
    const prompt = `
    Help update the ontology for the "${domain}" domain.
    
    Existing concepts: ${existingConcepts.join(', ')}
    
    1. Suggest new concepts that would enhance this domain ontology
    2. Suggest relationships between concepts (both existing and new)
    
    Format your response as a JSON object with:
    - newConcepts: array of strings
    - relationships: array of objects with "from", "relation", "to", and "confidence" properties
    
    Example: 
    {
      "newConcepts": ["concept1", "concept2"],
      "relationships": [
        {"from": "concept1", "relation": "is a type of", "to": "existingConcept", "confidence": 0.9}
      ]
    }
    `;
    
    try {
      console.log(`[LLMClient] Updating ontology for domain: ${domain}`);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      // Get content by accessing text content from the response
      const responseContent = response.content[0];
      const content = 'text' in responseContent ? responseContent.text : '';
      
      // Extract JSON object from response
      const jsonMatch = content.match(/\{\s*"newConcepts".*\}/s);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('[LLMClient] Failed to parse JSON from LLM response:', parseError);
          return { newConcepts: [], relationships: [] };
        }
      }
      
      console.warn('[LLMClient] No valid JSON found in LLM response');
      return { newConcepts: [], relationships: [] };
    } catch (error) {
      console.error('[LLMClient] Error updating ontology:', error);
      return { newConcepts: [], relationships: [] };
    }
  }

  /**
   * Validate if new knowledge is consistent with existing knowledge
   */
  async validateConsistency(newFact: string, existingFacts: string[]): Promise<{
    isConsistent: boolean,
    confidence: number,
    explanation: string
  }> {
    const prompt = `
    Determine if the new fact is consistent with the existing knowledge base.
    
    New fact: "${newFact}"
    
    Existing facts:
    ${existingFacts.map(fact => `- ${fact}`).join('\n')}
    
    Format your response as a JSON object with:
    - isConsistent: boolean
    - confidence: number between 0 and 1
    - explanation: string explaining your reasoning
    
    Example:
    {
      "isConsistent": true,
      "confidence": 0.85,
      "explanation": "The new fact aligns with existing knowledge because..."
    }
    `;
    
    try {
      console.log(`[LLMClient] Validating consistency of: "${newFact}"`);
      
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      // Get content by accessing text content from the response
      const responseContent = response.content[0];
      const content = 'text' in responseContent ? responseContent.text : '';
      
      // Extract JSON object from response
      const jsonMatch = content.match(/\{\s*"isConsistent".*\}/s);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('[LLMClient] Failed to parse JSON from LLM response:', parseError);
          return { isConsistent: false, confidence: 0, explanation: "Error processing response" };
        }
      }
      
      console.warn('[LLMClient] No valid JSON found in LLM response');
      return { isConsistent: false, confidence: 0, explanation: "Error processing response" };
    } catch (error) {
      console.error('[LLMClient] Error validating consistency:', error);
      return { isConsistent: false, confidence: 0, explanation: "Error connecting to LLM" };
    }
  }
} 