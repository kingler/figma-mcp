/**
 * Core Reasoning Framework Module
 * 
 * This module provides the core functionality for the AI Reasoning Framework,
 * including base reasoning operations, pattern recognition, and knowledge integration.
 */

import { Triple } from '../knowledge/types.js';
import { KnowledgeBaseService } from '../knowledge/service.js';

/**
 * Core reasoning types for the framework
 */
export enum ReasoningType {
  DEDUCTIVE = 'deductive',
  INDUCTIVE = 'inductive',
  ABDUCTIVE = 'abductive',
  ANALOGICAL = 'analogical',
  CAUSAL = 'causal'
}

/**
 * Inference result type
 */
export interface InferenceResult {
  conclusion: string;
  confidence: number;
  method: ReasoningType;
  premises: string[];
  explanation: string;
  alternatives?: string[];
}

/**
 * Pattern types for pattern recognition
 */
export enum PatternType {
  SOLUTION = 'solution',
  PROBLEM = 'problem',
  CONTEXT = 'context',
  ERROR = 'error',
  SUCCESS = 'success'
}

/**
 * Pattern recognition result
 */
export interface PatternResult {
  patternType: PatternType;
  patternName: string;
  confidence: number;
  elements: string[];
  description: string;
}

/**
 * Core reasoning framework class
 */
export class ReasoningCore {
  private knowledgeService: KnowledgeBaseService;

  constructor(knowledgeService?: KnowledgeBaseService) {
    this.knowledgeService = knowledgeService || new KnowledgeBaseService();
  }

  /**
   * Performs deductive reasoning from premises to conclusion
   * 
   * @param premises Array of premise statements
   * @param domain Domain context for reasoning
   * @returns Inference result with conclusion and explanation
   */
  async performDeductiveReasoning(premises: string[], domain: string): Promise<InferenceResult> {
    try {
      // Analyze premises to identify logical structure
      const formattedPremises = premises.map(p => p.trim());
      
      // Look for syllogistic reasoning patterns
      // "All A are B" and "C is A" to conclude "C is B"
      let bestConclusion: { conclusion: string; confidence: number } | null = null;
      
      for (let i = 0; i < formattedPremises.length; i++) {
        const p1 = formattedPremises[i].toLowerCase();
        
        if (p1.startsWith("all ") || p1.startsWith("every ")) {
          // Extract A and B from "All A are B"
          const allPattern = /^(?:all|every)\s+(\w+)(?:\s+\w+){0,3}\s+(?:are|is|be)\s+(\w+)/i;
          const allMatch = p1.match(allPattern);
          
          if (allMatch && allMatch.length >= 3) {
            const categoryA = allMatch[1]; // e.g., "humans" from "All humans are mortal"
            const propertyB = allMatch[2]; // e.g., "mortal" from "All humans are mortal"
            
            // Look for "C is A" pattern in other premises
            for (let j = 0; j < formattedPremises.length; j++) {
              if (i === j) continue; // Skip same premise
              
              const p2 = formattedPremises[j].toLowerCase();
              const isPattern = new RegExp(`(\\w+)\\s+(?:is|are)\\s+(?:a|an)?\\s*${categoryA}`, 'i');
              const isMatch = p2.match(isPattern);
              
              if (isMatch && isMatch.length >= 2) {
                const instanceC = isMatch[1]; // e.g., "Socrates" from "Socrates is human"
                // Form conclusion: "C is B"
                const conclusion = `${instanceC} is ${propertyB}`;
                const confidence = 0.95;
                
                if (!bestConclusion || confidence > bestConclusion.confidence) {
                  bestConclusion = { conclusion, confidence };
                }
              }
            }
          }
        }
      }
      
      // If no syllogistic pattern, look for other deductive patterns
      if (!bestConclusion) {
        // Modus ponens: "If A then B" and "A" to conclude "B"
        for (let i = 0; i < formattedPremises.length; i++) {
          const p1 = formattedPremises[i].toLowerCase();
          const ifThenPattern = /^if\s+(.+)\s+then\s+(.+)$/i;
          const ifThenMatch = p1.match(ifThenPattern);
          
          if (ifThenMatch && ifThenMatch.length >= 3) {
            const antecedent = ifThenMatch[1].trim(); // The "if" part
            const consequent = ifThenMatch[2].trim(); // The "then" part
            
            // Look for the antecedent in other premises
            for (let j = 0; j < formattedPremises.length; j++) {
              if (i === j) continue;
              
              const p2 = formattedPremises[j].toLowerCase().trim();
              if (p2 === antecedent || p2.includes(antecedent)) {
                const conclusion = consequent;
                const confidence = 0.9;
                
                if (!bestConclusion || confidence > bestConclusion.confidence) {
                  bestConclusion = { conclusion, confidence };
                }
              }
            }
          }
        }
      }
      
      // If still no conclusion, provide a generic one
      if (!bestConclusion) {
        bestConclusion = {
          conclusion: `Based on the premises in domain '${domain}', no specific conclusion can be definitively drawn.`,
          confidence: 0.5
        };
      }
      
      // Generate an explanation
      const explanation = this.generateExplanation(
        ReasoningType.DEDUCTIVE,
        formattedPremises,
        bestConclusion.conclusion,
        bestConclusion.confidence
      );
      
      return {
        conclusion: bestConclusion.conclusion,
        confidence: bestConclusion.confidence,
        method: ReasoningType.DEDUCTIVE,
        premises: formattedPremises,
        explanation
      };
    } 
    catch (error) {
      console.error('[ReasoningCore] Error in deductive reasoning:', error);
      return {
        conclusion: 'Unable to perform deductive reasoning due to an error.',
        confidence: 0.1,
        method: ReasoningType.DEDUCTIVE,
        premises,
        explanation: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Performs inductive reasoning from examples to general pattern
   * 
   * @param examples Array of example statements
   * @param minConfidence Minimum confidence threshold
   * @returns Inference result with generalization and explanation
   */
  async performInductiveReasoning(examples: string[], minConfidence: number): Promise<InferenceResult> {
    try {
      // Process and analyze the examples
      const processedExamples = examples.map(example => example.trim());
      
      // Extract words and calculate frequency
      const words: { [key: string]: number } = {};
      processedExamples.forEach(example => {
        const exampleWords = example.toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .split(/\s+/) // Split on whitespace
          .filter(word => word.length > 2); // Filter out short words
        
        exampleWords.forEach(word => {
          words[word] = (words[word] || 0) + 1;
        });
      });
      
      // Find common words that appear in most examples
      const significantWords = Object.entries(words)
        .filter(([_, count]) => count > Math.floor(processedExamples.length * 0.5)) // Words in at least half the examples
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .map(([word]) => word);
      
      // Look for common patterns in sentences
      const sentencePatterns: { [key: string]: number } = {};
      processedExamples.forEach(example => {
        // Create a sentence pattern by keeping significant words and replacing others with placeholders
        const wordArray = example.toLowerCase().split(/\s+/);
        const pattern = wordArray.map(word => 
          significantWords.includes(word.replace(/[^\w\s]/g, '')) ? word : "___"
        ).join(" ");
        
        sentencePatterns[pattern] = (sentencePatterns[pattern] || 0) + 1;
      });
      
      // Find most common sentence pattern
      const commonSentencePatterns = Object.entries(sentencePatterns)
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .map(([pattern, count]) => ({ pattern, count }));
      
      // Generate candidate generalizations
      const generalizations: { statement: string; confidence: number }[] = [];
      
      // Subject-based generalization
      const subjects = processedExamples
        .map(ex => ex.split(' ')[0]) // First word as subject
        .filter(Boolean);
      
      if (subjects.length > 0 && new Set(subjects).size < subjects.length * 0.5) {
        // If repeating subjects, make a generalization about them
        const commonSubject = Object.entries(
          subjects.reduce((acc, subject) => {
            acc[subject] = (acc[subject] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1])[0][0];
        
        generalizations.push({
          statement: `${commonSubject} generally exhibits the properties described in the examples.`,
          confidence: Math.min(0.7, minConfidence)
        });
      }
      
      // Pattern-based generalization
      if (commonSentencePatterns.length > 0) {
        const topPattern = commonSentencePatterns[0];
        if (topPattern.count > processedExamples.length * 0.5) {
          const generalPattern = topPattern.pattern
            .replace(/___+/g, "something")
            .replace(/___ ___ ___+/g, "various properties");
          
          generalizations.push({
            statement: `There is a pattern where ${generalPattern}.`,
            confidence: Math.min(topPattern.count / processedExamples.length, minConfidence)
          });
        }
      }
      
      // Common property generalization
      if (significantWords.length > 0) {
        const properties = significantWords.slice(0, 3).join(", ");
        generalizations.push({
          statement: `Most examples share common properties: ${properties}.`,
          confidence: Math.min(0.8, minConfidence)
        });
      }
      
      // Default generalization if no patterns found
      if (generalizations.length === 0) {
        generalizations.push({
          statement: `Based on the ${examples.length} examples, there appears to be a pattern, but with limited confidence.`,
          confidence: Math.min(0.5, minConfidence)
        });
      }
      
      // Get the best generalization
      const bestGeneralization = generalizations.sort((a, b) => b.confidence - a.confidence)[0];
      
      // Generate alternatives (up to 2)
      const alternatives = generalizations.length > 1 ? 
        generalizations.slice(1, 3).map(g => g.statement) : [];
      
      // Generate explanation
      const explanation = this.generateExplanation(
        ReasoningType.INDUCTIVE,
        processedExamples,
        bestGeneralization.statement,
        bestGeneralization.confidence
      );
      
      return {
        conclusion: bestGeneralization.statement,
        confidence: bestGeneralization.confidence,
        method: ReasoningType.INDUCTIVE,
        premises: processedExamples,
        explanation,
        alternatives
      };
    }
    catch (error) {
      console.error('[ReasoningCore] Error in inductive reasoning:', error);
      return {
        conclusion: 'Unable to generate inductive generalization due to an error.',
        confidence: 0.1,
        method: ReasoningType.INDUCTIVE,
        premises: examples,
        explanation: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Performs abductive reasoning to generate explanations for observations
   * 
   * @param observations Array of observed facts
   * @param context Context for the reasoning
   * @returns Inference result with best explanation
   */
  async performAbductiveReasoning(observations: string[], context: string): Promise<InferenceResult> {
    try {
      // Process observations
      const processedObservations = observations.map(obs => obs.trim().toLowerCase());
      
      // Define domain-specific explanation generators
      const domainAnalyzers: {
        [key: string]: {
          keywords: string[],
          analyzer: (obs: string[]) => {conclusion: string, confidence: number, explanation: string}
        }
      } = {
        "weather": {
          keywords: ["rain", "cloud", "sky", "wet", "damp", "snow", "temperature", "wind", "storm", "sunny"],
          analyzer: (obs) => {
            if (obs.some(o => o.includes("wet") || o.includes("damp"))) {
              if (obs.some(o => o.includes("cloud"))) {
                return {
                  conclusion: "It likely rained recently.",
                  confidence: 0.85,
                  explanation: "The combination of wetness and clouds strongly indicates recent precipitation."
                };
              }
              return {
                conclusion: "The area may have experienced precipitation or high humidity.",
                confidence: 0.7,
                explanation: "Wetness suggests water presence, most likely from rain or high humidity."
              };
            }
            if (obs.some(o => o.includes("cloud"))) {
              return {
                conclusion: "An atmospheric front is passing through the area.",
                confidence: 0.65,
                explanation: "Cloud formations indicate changes in atmospheric conditions, typically from a weather front."
              };
            }
            return {
              conclusion: "Weather conditions are changing due to atmospheric pressure differences.",
              confidence: 0.5,
              explanation: "General weather observations can be explained by normal atmospheric pressure variations."
            };
          }
        },
        
        "medical": {
          keywords: ["fever", "cough", "headache", "pain", "symptom", "sick", "disease", "infection", "patient"],
          analyzer: (obs) => {
            if (obs.some(o => o.includes("fever") && o.includes("cough"))) {
              return {
                conclusion: "The patient may have a respiratory infection such as a cold or flu.",
                confidence: 0.8,
                explanation: "The combination of fever and cough is a classic presentation of respiratory infections."
              };
            }
            if (obs.some(o => o.includes("headache"))) {
              return {
                conclusion: "The person may be experiencing stress, dehydration, or tension.",
                confidence: 0.6,
                explanation: "Headaches have multiple common causes including stress, dehydration, and muscle tension."
              };
            }
            return {
              conclusion: "The symptoms suggest an immune response to a pathogen or environmental factor.",
              confidence: 0.5,
              explanation: "General symptoms often indicate the body's response to external factors that trigger immune reactions."
            };
          }
        },
        
        "crime": {
          keywords: ["door", "window", "lock", "broken", "missing", "stolen", "victim", "scene", "evidence", "suspect"],
          analyzer: (obs) => {
            if (obs.some(o => o.includes("broken") && (o.includes("window") || o.includes("door")))) {
              return {
                conclusion: "A forced entry may have occurred, suggesting a burglary.",
                confidence: 0.85,
                explanation: "Broken entry points are strong indicators of forced entry, a common burglary method."
              };
            }
            if (obs.some(o => o.includes("missing") || o.includes("stolen"))) {
              return {
                conclusion: "Theft appears to be the motive.",
                confidence: 0.75,
                explanation: "Missing or stolen items directly point to theft as a primary motive."
              };
            }
            return {
              conclusion: "The evidence suggests criminal activity with premeditation.",
              confidence: 0.6,
              explanation: "The pattern of evidence indicates planned rather than opportunistic criminal activity."
            };
          }
        }
      };
      
      // Determine which domain the context and observations most closely match
      let bestDomainMatch = "";
      let bestMatchScore = 0;
      let bestResult: {conclusion: string, confidence: number, explanation: string} | null = null;
      
      // First, check if context explicitly mentions a domain
      const contextLower = context.toLowerCase();
      
      for (const domain in domainAnalyzers) {
        let score = 0;
        
        // Check context for domain match
        if (contextLower.includes(domain)) {
          score += 5;
        }
        
        // Check for keyword matches in observations
        domainAnalyzers[domain].keywords.forEach(keyword => {
          processedObservations.forEach(obs => {
            if (obs.includes(keyword)) {
              score += 1;
            }
          });
        });
        
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestDomainMatch = domain;
          
          // Analyze with the best matching domain
          if (bestMatchScore > 0) {
            bestResult = domainAnalyzers[domain].analyzer(processedObservations);
          }
        }
      }
      
      // If no good domain match, provide a general explanation
      if (bestMatchScore < 3 || !bestResult) {
        bestResult = {
          conclusion: `Based on observations in ${context}, the most likely explanation is a common correlation between these phenomena.`,
          confidence: 0.5,
          explanation: "When no domain-specific patterns are strongly evident, general correlation is the simplest explanation."
        };
      }
      
      return {
        conclusion: bestResult.conclusion,
        confidence: bestResult.confidence,
        method: ReasoningType.ABDUCTIVE,
        premises: observations,
        explanation: bestResult.explanation
      };
    }
    catch (error) {
      console.error('[ReasoningCore] Error in abductive reasoning:', error);
      return {
        conclusion: 'Unable to generate explanations due to an error.',
        confidence: 0.1,
        method: ReasoningType.ABDUCTIVE,
        premises: observations,
        explanation: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Identifies patterns in the input data
   * 
   * @param data Array of data points to analyze
   * @param patternType Type of pattern to look for
   * @param context Context information
   * @returns Array of pattern results
   */
  async identifyPatterns(
    data: string[], 
    patternType: PatternType,
    context: string
  ): Promise<PatternResult[]> {
    try {
      // Process input data
      const processedData = data.map(item => item.trim());
      
      // Pattern library based on pattern type
      const patternLibrary: {
        [key in PatternType]: Array<{
          name: string;
          detector: (data: string[]) => number; // Returns confidence
          description: string;
        }>
      } = {
        [PatternType.SOLUTION]: [
          {
            name: "Incremental Improvement",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("improve") || 
                d.toLowerCase().includes("enhance") || 
                d.toLowerCase().includes("optimize")
              ).length / data.length,
            description: "Solutions that build upon and improve existing approaches"
          },
          {
            name: "Paradigm Shift",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("different approach") || 
                d.toLowerCase().includes("alternative") || 
                d.toLowerCase().includes("instead of")
              ).length / data.length,
            description: "Solutions that take a completely different approach to the problem"
          }
        ],
        [PatternType.PROBLEM]: [
          {
            name: "Resource Constraint",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("limit") || 
                d.toLowerCase().includes("constraint") || 
                d.toLowerCase().includes("insufficient") ||
                d.toLowerCase().includes("not enough")
              ).length / data.length,
            description: "Problems arising from limited resources (time, memory, etc.)"
          },
          {
            name: "Compatibility Issue",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("compatible") || 
                d.toLowerCase().includes("version") || 
                d.toLowerCase().includes("integration") ||
                d.toLowerCase().includes("work with")
              ).length / data.length,
            description: "Problems arising from incompatibility between components"
          }
        ],
        [PatternType.CONTEXT]: [
          {
            name: "Development Environment",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("develop") || 
                d.toLowerCase().includes("environment") || 
                d.toLowerCase().includes("local") ||
                d.toLowerCase().includes("build")
              ).length / data.length,
            description: "Context related to development environments and tooling"
          },
          {
            name: "Production Deployment",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("production") || 
                d.toLowerCase().includes("deploy") || 
                d.toLowerCase().includes("release") ||
                d.toLowerCase().includes("live")
              ).length / data.length,
            description: "Context related to production deployment and operation"
          }
        ],
        [PatternType.ERROR]: [
          {
            name: "Runtime Exception",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("exception") || 
                d.toLowerCase().includes("error") || 
                d.toLowerCase().includes("crash") ||
                d.toLowerCase().includes("failed")
              ).length / data.length,
            description: "Errors occurring during program execution"
          },
          {
            name: "Type Error",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("type") || 
                d.toLowerCase().includes("expected") || 
                d.toLowerCase().includes("received") ||
                d.toLowerCase().includes("incompatible")
              ).length / data.length,
            description: "Errors related to type mismatches"
          }
        ],
        [PatternType.SUCCESS]: [
          {
            name: "Performance Improvement",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("faster") || 
                d.toLowerCase().includes("performance") || 
                d.toLowerCase().includes("optimize") ||
                d.toLowerCase().includes("efficient")
              ).length / data.length,
            description: "Success in improving system performance"
          },
          {
            name: "Feature Completion",
            detector: (data) => 
              data.filter(d => 
                d.toLowerCase().includes("complete") || 
                d.toLowerCase().includes("implement") || 
                d.toLowerCase().includes("feature") ||
                d.toLowerCase().includes("functionality")
              ).length / data.length,
            description: "Success in implementing new features"
          }
        ]
      };
      
      // Apply pattern detectors and filter by minimum confidence
      const results: PatternResult[] = [];
      const minConfidence = 0.3; // Minimum confidence threshold
      
      patternLibrary[patternType].forEach(pattern => {
        const confidence = pattern.detector(processedData);
        
        if (confidence >= minConfidence) {
          results.push({
            patternType,
            patternName: pattern.name,
            confidence,
            elements: processedData,
            description: pattern.description
          });
        }
      });
      
      // Sort by confidence
      return results.sort((a, b) => b.confidence - a.confidence);
    }
    catch (error) {
      console.error('[ReasoningCore] Error in pattern identification:', error);
      return [];
    }
  }

  /**
   * Generate a natural language explanation for a reasoning process
   * 
   * @param reasoningType Type of reasoning used
   * @param premises Input premises or observations
   * @param conclusion Derived conclusion
   * @param confidence Confidence in the conclusion
   * @returns Natural language explanation
   */
  private generateExplanation(
    reasoningType: ReasoningType,
    premises: string[],
    conclusion: string,
    confidence: number
  ): string {
    // Format the premises as a comma-separated list with the last item using "and"
    const formattedPremises = premises.length === 1 
      ? premises[0]
      : premises.length === 2 
      ? `${premises[0]} and ${premises[1]}`
      : premises.slice(0, -1).join(", ") + ", and " + premises[premises.length - 1];
    
    // Different explanation templates based on reasoning type
    switch (reasoningType) {
      case ReasoningType.DEDUCTIVE:
        if (confidence > 0.8) {
          return `Given the premises (${formattedPremises}), we can deduce with high confidence that ${conclusion}. This follows logically by applying principles of deductive reasoning.`;
        } else if (confidence > 0.5) {
          return `From the premises (${formattedPremises}), we can reasonably conclude that ${conclusion}, though with moderate confidence. The deductive chain has some uncertainty.`;
        } else {
          return `The premises (${formattedPremises}) do not strongly support a specific conclusion through deductive reasoning, but ${conclusion} is a tentative possibility.`;
        }
        
      case ReasoningType.INDUCTIVE:
        if (confidence > 0.8) {
          return `Based on multiple examples (${formattedPremises}), we can generalize with high confidence that ${conclusion}. This pattern is strongly supported by the observed instances.`;
        } else if (confidence > 0.5) {
          return `From the examples (${formattedPremises}), we can induce the pattern that ${conclusion}, though with moderate confidence. More examples would strengthen this generalization.`;
        } else {
          return `The examples (${formattedPremises}) suggest a weak pattern that ${conclusion}, but this generalization has limited confidence and may not apply universally.`;
        }
        
      case ReasoningType.ABDUCTIVE:
        if (confidence > 0.8) {
          return `Given the observations (${formattedPremises}), the most likely explanation is that ${conclusion}. This provides the best account of the observed phenomena.`;
        } else if (confidence > 0.5) {
          return `From the observations (${formattedPremises}), a plausible explanation is that ${conclusion}. This is one of several potential explanations.`;
        } else {
          return `The observations (${formattedPremises}) have multiple possible explanations, one being that ${conclusion}, though we have limited confidence in this specific interpretation.`;
        }
        
      default:
        return `Based on the input (${formattedPremises}), we concluded that ${conclusion} with ${(confidence * 100).toFixed(1)}% confidence.`;
    }
  }
  
  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.knowledgeService) {
      await this.knowledgeService.close();
    }
  }
}

export default ReasoningCore;