export interface Triple {
  subject: string;
  predicate: string;
  object: any;
  confidence?: number;
  source?: string;
  context?: string;
  timestamp?: number;
  id?: string;
}

export interface Fact {
  id?: string;
  statement: string;
  evidence: string[];
  confidence: number;
  source: string;
  references?: string[];
  timestamp?: number;
}

export interface Rule {
  id?: string;
  name: string;
  condition: string;
  consequence: string;
  priority: number;
  domain: string;
  metadata: {
    description: string;
    examples?: string[];
    tags?: string[];
  };
}

export interface OntologyUpdate {
  domain: string;
  newConcepts: string[];
  relationships: Array<{
    from: string;
    relation: string;
    to: string;
    confidence: number;
  }>;
}

export interface KnowledgeConsistency {
  isConsistent: boolean;
  confidence: number;
  explanation: string;
  conflictingFacts?: string[];
}

export interface LLMTripleExtraction {
  triples: Triple[];
  count: number;
  text?: string;
  context?: string;
}

export interface KnowledgeBase {
  triples: Map<string, Triple>;
  facts: Map<string, Fact>;
  rules: Map<string, Rule>;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasons: string[];
  suggestions: string[];
}
