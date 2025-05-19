/**
 * Represents a knowledge triple in the system
 */
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  timestamp: Date;
  metadata: {
    source: string;
    context: string;
    validation: ValidationResult;
  };
}

/**
 * Result of validating a knowledge component
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;
  checks: ValidationCheck[];
  timestamp: Date;
}

/**
 * Individual validation check result
 */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  score: number;
  message?: string;
}

/**
 * Pattern for querying triples
 */
export interface TriplePattern {
  subject?: string;
  predicate?: string;
  object?: string;
  context?: string[];
  minConfidence?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Knowledge base query result
 */
export interface QueryResult<T> {
  data: T[];
  metadata: {
    total: number;
    filtered: number;
    confidence: number;
    executionTime: number;
  };
}

/**
 * Knowledge operation result
 */
export interface KnowledgeResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Knowledge base statistics
 */
export interface KnowledgeStats {
  totalTriples: number;
  averageConfidence: number;
  validationRate: number;
  lastUpdate: Date;
  storageUsage: {
    total: number;
    indexed: number;
    cached: number;
  };
}

/**
 * Configuration for knowledge operations
 */
export interface KnowledgeConfig {
  minConfidence: number;
  validationThreshold: number;
  cacheTimeout: number;
  maxResults: number;
  indexingEnabled: boolean;
}