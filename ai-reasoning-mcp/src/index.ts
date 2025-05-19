#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeBaseService } from './knowledge/service.js';
import { GraphClient } from './graph-client.js';
import { LLMClient } from './llm-client.js';
import { WebCrawler } from './web-crawler.js';
import { HyperGraphManager } from './knowledge/hypergraph.js';
import { ReasoningCore } from './core/index.js';
import { DecisionSupport } from './decision/index.js';
import { EthicalFramework } from './ethical/index.js';
import { AdvancedReasoning } from './reasoning/index.js';
import fs from 'fs';

// Debug logging function
function debugLog(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}`;
  
  try {
    fs.appendFileSync('debug.log', formattedMessage);
  } catch (error) {
    console.error('Failed to write to debug log:', error);
  }
}

export class AIReasoningServer {
  private server: Server;
  private knowledgeService: KnowledgeBaseService;
  private graphClient: GraphClient;
  private reasoningCore: ReasoningCore;
  private decisionSupport: DecisionSupport;
  private ethicalFramework: EthicalFramework;
  private advancedReasoning: AdvancedReasoning;
  private llmClient: LLMClient | null = null;
  private webCrawler: WebCrawler | null = null;
  private hyperGraphManager: HyperGraphManager | null = null;
  private useLLM: boolean;
  private ontologyUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-reasoning-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Check if LLM integration is enabled
    this.useLLM = process.env.USE_LLM_FOR_KNOWLEDGE === 'true';
    
    if (this.useLLM) {
      try {
        this.llmClient = new LLMClient();
        console.log('[AIReasoningServer] LLM integration enabled');
        
        // Set up ontology update interval if configured
        const updateInterval = parseInt(process.env.ONTOLOGY_UPDATE_INTERVAL || '0', 10);
        if (updateInterval > 0) {
          this.ontologyUpdateInterval = setInterval(() => {
            this.updateDomainOntologies().catch(err => {
              console.error('[AIReasoningServer] Error in scheduled ontology update:', err);
            });
          }, updateInterval);
          console.log(`[AIReasoningServer] Scheduled ontology updates every ${updateInterval}ms`);
        }

        // Initialize WebCrawler if LLM is available
        this.webCrawler = new WebCrawler(this.llmClient);
        console.log('[AIReasoningServer] Web crawler integration enabled');
      } catch (error) {
        console.error('[AIReasoningServer] Failed to initialize LLM client:', error);
        this.useLLM = false;
      }
    }

    this.knowledgeService = new KnowledgeBaseService();
    this.graphClient = new GraphClient();
    
    // Initialize ReasoningCore
    this.reasoningCore = new ReasoningCore(this.knowledgeService);
    console.log('[AIReasoningServer] Reasoning Core initialized');
    
    // Initialize DecisionSupport
    this.decisionSupport = new DecisionSupport(this.knowledgeService);
    console.log('[AIReasoningServer] Decision Support initialized');
    
    // Initialize EthicalFramework
    this.ethicalFramework = new EthicalFramework(this.knowledgeService);
    console.log('[AIReasoningServer] Ethical Framework initialized');
    
    // Initialize AdvancedReasoning
    this.advancedReasoning = new AdvancedReasoning(this.knowledgeService, this.graphClient);
    console.log('[AIReasoningServer] Advanced Reasoning techniques initialized');
    
    // Initialize HyperGraphManager
    this.hyperGraphManager = new HyperGraphManager(this.graphClient);
    console.log('[AIReasoningServer] HyperGraph integration enabled');
    
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      debugLog('ListTools request received');
      const tools = [
        // Knowledge Base Tools
        {
          name: 'create_triple',
          description: 'Create a new knowledge triple',
          inputSchema: {
            type: 'object',
            properties: {
              subject: { type: 'string', description: 'Subject of the triple' },
              predicate: { type: 'string', description: 'Predicate of the triple' },
              object: { type: 'string', description: 'Object of the triple' },
              confidence: { type: 'number', description: 'Confidence score (0-1)' },
              source: { type: 'string', description: 'Source of the knowledge' },
              context: { type: 'string', description: 'Context of the triple' }
            },
            required: ['subject', 'predicate', 'object', 'confidence', 'source', 'context']
          }
        },
        {
          name: 'add_fact',
          description: 'Add a new fact to the knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              statement: { type: 'string', description: 'The fact statement' },
              evidence: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Supporting evidence'
              },
              confidence: { type: 'number', description: 'Confidence score (0-1)' },
              source: { type: 'string', description: 'Source of the fact' },
              references: {
                type: 'array',
                items: { type: 'string' },
                description: 'Related references'
              }
            },
            required: ['statement', 'evidence', 'confidence', 'source']
          }
        },
        {
          name: 'add_rule',
          description: 'Add a new inference rule',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the rule' },
              condition: { type: 'string', description: 'Rule condition' },
              consequence: { type: 'string', description: 'Rule consequence' },
              priority: { type: 'number', description: 'Rule priority (0-10)' },
              domain: { type: 'string', description: 'Domain of the rule' },
              description: { type: 'string', description: 'Rule description' },
              examples: {
                type: 'array',
                items: { type: 'string' },
                description: 'Example applications'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Rule tags'
              }
            },
            required: ['name', 'condition', 'consequence', 'priority', 'domain', 'description']
          }
        },
        {
          name: 'validate_fact',
          description: 'Validate a fact against the knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              statement: { type: 'string', description: 'Statement to validate' }
            },
            required: ['statement']
          }
        },
        {
          name: 'apply_rules',
          description: 'Apply inference rules to a given context',
          inputSchema: {
            type: 'object',
            properties: {
              context: { type: 'string', description: 'Context to evaluate' }
            },
            required: ['context']
          }
        },
        
        // Reasoning Engine Tools
        {
          name: 'deductive_reasoning',
          description: 'Perform deductive reasoning from premises to conclusion',
          inputSchema: {
            type: 'object',
            properties: {
              premises: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of premise statements'
              },
              domain: { type: 'string', description: 'Knowledge domain' }
            },
            required: ['premises', 'domain']
          }
        },
        {
          name: 'inductive_reasoning',
          description: 'Perform inductive reasoning from examples to general rule',
          inputSchema: {
            type: 'object',
            properties: {
              examples: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of example cases'
              },
              confidence: { type: 'number', description: 'Minimum confidence threshold (0-1)' }
            },
            required: ['examples', 'confidence']
          }
        },
        {
          name: 'abductive_reasoning',
          description: 'Generate best explanation for observations',
          inputSchema: {
            type: 'object',
            properties: {
              observations: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of observations'
              },
              context: { type: 'string', description: 'Reasoning context' }
            },
            required: ['observations', 'context']
          }
        },
        
        // Decision Support Tools
        {
          name: 'analyze_options',
          description: 'Analyze decision options with trade-offs',
          inputSchema: {
            type: 'object',
            properties: {
              options: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of available options'
              },
              criteria: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Evaluation criteria'
              },
              context: { type: 'string', description: 'Decision context' }
            },
            required: ['options', 'criteria', 'context']
          }
        },
        {
          name: 'risk_assessment',
          description: 'Assess risks for a given scenario',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: { type: 'string', description: 'Scenario description' },
              domain: { type: 'string', description: 'Risk domain' },
              factors: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Relevant risk factors'
              }
            },
            required: ['scenario', 'domain']
          }
        },
        
        // Ethical Framework Tools
        {
          name: 'ethical_validation',
          description: 'Validate a decision against ethical principles',
          inputSchema: {
            type: 'object',
            properties: {
              decision: { type: 'string', description: 'Decision to validate' },
              principles: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Ethical principles to consider'
              },
              context: { type: 'string', description: 'Decision context' }
            },
            required: ['decision', 'context']
          }
        },
        
        // Mental Models Tools
        {
          name: 'apply_mental_model',
          description: 'Apply a specific mental model to analyze a situation',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', description: 'Mental model to apply (e.g., second_order_thinking, inversion, expected_value, systems_thinking, first_principles)' },
              situation: { type: 'string', description: 'Situation description' },
              objective: { type: 'string', description: 'Analysis objective' }
            },
            required: ['model', 'situation', 'objective']
          }
        },
        
        // Advanced Reasoning Tools
        {
          name: 'analogical_reasoning',
          description: 'Perform analogical reasoning to map patterns from a source domain to a target domain',
          inputSchema: {
            type: 'object',
            properties: {
              sourceDomain: { type: 'string', description: 'Source domain description' },
              targetDomain: { type: 'string', description: 'Target domain description' },
              mappingCriteria: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Criteria for establishing mappings'
              }
            },
            required: ['sourceDomain', 'targetDomain']
          }
        },
        
        {
          name: 'causal_reasoning',
          description: 'Perform causal reasoning to analyze cause-effect relationships',
          inputSchema: {
            type: 'object',
            properties: {
              situation: { type: 'string', description: 'Situation to analyze' },
              domain: { type: 'string', description: 'Domain context' },
              depth: { type: 'integer', description: 'Depth of causal chain analysis (default: 3)' }
            },
            required: ['situation', 'domain']
          }
        },
        
        // Rejection Sampling Tools
        {
          name: 'generate_solutions',
          description: 'Generate multiple solution candidates for a problem and select the best one',
          inputSchema: {
            type: 'object',
            properties: {
              problem: { type: 'string', description: 'Problem description' },
              count: { type: 'integer', description: 'Number of solutions to generate' },
              criteria: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Evaluation criteria'
              }
            },
            required: ['problem', 'count']
          }
        },
        
        // Reward Model Tools
        {
          name: 'evaluate_solution',
          description: 'Evaluate a solution against quality criteria',
          inputSchema: {
            type: 'object',
            properties: {
              solution: { type: 'string', description: 'Solution to evaluate' },
              criteria: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Evaluation criteria'
              },
              context: { type: 'string', description: 'Evaluation context' }
            },
            required: ['solution', 'criteria']
          }
        },
        
        // Sequential Thinking Tools
        {
          name: 'sequential_analysis',
          description: 'Perform step-by-step analysis of a complex problem',
          inputSchema: {
            type: 'object',
            properties: {
              problem: { type: 'string', description: 'Problem description' },
              steps: { type: 'integer', description: 'Maximum number of steps' },
              domain: { type: 'string', description: 'Knowledge domain' }
            },
            required: ['problem', 'steps']
          }
        },
        
        // Add the new LLM-based tools if LLM is enabled
        ...(this.useLLM ? [
          {
            name: 'extract_knowledge',
            description: 'Extract knowledge triples from text using LLM',
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'Text to extract knowledge from' },
                context: { type: 'string', description: 'Optional context to guide extraction' }
              },
              required: ['text']
            }
          },
          {
            name: 'update_domain_ontology',
            description: 'Update domain ontology with new concepts and relationships',
            inputSchema: {
              type: 'object',
              properties: {
                domain: { type: 'string', description: 'Domain to update ontology for' },
                existingConcepts: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'List of existing concepts in the domain'
                }
              },
              required: ['domain']
            }
          },
          {
            name: 'validate_knowledge_consistency',
            description: 'Validate if new knowledge is consistent with existing knowledge',
            inputSchema: {
              type: 'object',
              properties: {
                newFact: { type: 'string', description: 'New fact to validate' },
                existingFacts: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'List of existing facts to check against'
                }
              },
              required: ['newFact']
            }
          }
        ] : []),
        
        // Add the new WebCrawler tool if LLM is enabled
        ...(this.useLLM && this.webCrawler ? [
          {
            name: 'enrich_ontology_from_web',
            description: 'Enrich domain ontology by crawling relevant web pages',
            inputSchema: {
              type: 'object',
              properties: {
                domain: { type: 'string', description: 'Domain to enrich ontology for' },
                searchTerms: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Specific search terms to use (optional)'
                },
                maxResults: { 
                  type: 'number', 
                  description: 'Maximum number of web pages to crawl (default: 5)'
                }
              },
              required: ['domain']
            }
          }
        ] : []),
        
        // Add HyperGraph tools
        {
          name: 'connect_domains',
          description: 'Create hyperedge connecting concepts across domains',
          inputSchema: {
            type: 'object',
            properties: {
              sourceNode: { type: 'string', description: 'Source concept node' },
              targetNodes: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Target concept nodes to connect to'
              },
              relationship: { type: 'string', description: 'Relationship label' },
              domains: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Domains involved in this connection'
              },
              confidence: { type: 'number', description: 'Confidence score (0-1)' }
            },
            required: ['sourceNode', 'targetNodes', 'relationship', 'domains']
          }
        },
        {
          name: 'update_world_model',
          description: 'Dynamically update the world model with new concepts and relationships',
          inputSchema: {
            type: 'object',
            properties: {
              concepts: { 
                type: 'array', 
                items: { 
                  type: 'object',
                  properties: {
                    concept: { type: 'string' },
                    domain: { type: 'string' }
                  }
                },
                description: 'New concepts to add to the world model'
              },
              relationships: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    relationship: { type: 'string' },
                    confidence: { type: 'number' }
                  }
                },
                description: 'New relationships between concepts'
              }
            },
            required: ['concepts', 'relationships']
          }
        },
        {
          name: 'expand_problem_context',
          description: 'Expand problem-solving context by traversing ontology connections',
          inputSchema: {
            type: 'object',
            properties: {
              concepts: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Seed concepts to start exploration from'
              },
              domain: { type: 'string', description: 'Source domain (e.g., sdlc, world)' },
              task: { type: 'string', description: 'Task description to guide relevance filtering' },
              maxDepth: { type: 'number', description: 'Maximum traversal depth (default: 2)' },
              minConfidence: { type: 'number', description: 'Minimum confidence threshold (0-1)' }
            },
            required: ['concepts', 'domain']
          }
        },
        {
          name: 'get_sdlc_world_connections',
          description: 'Get connections between SDLC concepts and world knowledge',
          inputSchema: {
            type: 'object',
            properties: {
              sdlcConcepts: {
                type: 'array',
                items: { type: 'string' },
                description: 'SDLC concepts to find world connections for'
              },
              task: { type: 'string', description: 'Task description to guide relevance filtering' }
            },
            required: ['sdlcConcepts']
          }
        },
      ];
      
      debugLog('ListTools response:', { tools });
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      debugLog('CallTool request received:', request);
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          // Knowledge Base Operations
          case 'create_triple': {
            const triple = this.validateAndExtractTriple(request.params.arguments);
            const id = await this.knowledgeService.createTriple(triple);
            const result = await this.knowledgeService.getTriple(id);
            return this.formatResponse(result);
          }

          case 'add_fact': {
            const fact = this.validateAndExtractFact(request.params.arguments);
            const id = await this.knowledgeService.addFact(fact);
            return this.formatResponse({ id });
          }

          case 'add_rule': {
            const rule = this.validateAndExtractRule(request.params.arguments);
            const id = await this.knowledgeService.addRule(rule);
            return this.formatResponse({ id });
          }

          case 'validate_fact': {
            const { statement } = this.validateRequiredString(request.params.arguments, 'statement');
            const result = await this.knowledgeService.validateFact(statement);
            return this.formatResponse(result);
          }

          case 'apply_rules': {
            const { context } = this.validateRequiredString(request.params.arguments, 'context');
            const result = await this.knowledgeService.applyRules(context);
            return this.formatResponse(result);
          }

          // Reasoning Engine Operations
          case 'deductive_reasoning': {
            const { premises, domain } = request.params.arguments as { premises: string[], domain: string };
            const result = await this.reasoningCore.performDeductiveReasoning(premises, domain);
            return this.formatResponse(result);
          }

          case 'inductive_reasoning': {
            const { examples, confidence } = request.params.arguments as { examples: string[], confidence: number };
            const result = await this.reasoningCore.performInductiveReasoning(examples, confidence);
            return this.formatResponse(result);
          }

          case 'abductive_reasoning': {
            const { observations, context } = request.params.arguments as { observations: string[], context: string };
            const result = await this.reasoningCore.performAbductiveReasoning(observations, context);
            return this.formatResponse(result);
          }

          // Decision Support Operations
          case 'analyze_options': {
            const { options, criteria, context } = request.params.arguments as { options: string[], criteria: string[], context: string };
            const result = await this.decisionSupport.analyzeOptions(options, criteria, context);
            return this.formatResponse(result);
          }

          case 'risk_assessment': {
            const { scenario, domain, factors } = request.params.arguments as { scenario: string, domain: string, factors?: string[] };
            const result = await this.decisionSupport.assessRisks(scenario, domain, factors || []);
            return this.formatResponse(result);
          }

          // Ethical Framework Operations
          case 'ethical_validation': {
            const { decision, principles, context } = request.params.arguments as { decision: string, principles?: string[], context: string };
            const result = await this.validateEthics(decision, principles || [], context);
            return this.formatResponse(result);
          }

          // Mental Models Operations
          case 'apply_mental_model': {
            const { model, situation, objective } = request.params.arguments as { model: string, situation: string, objective: string };
            const result = await this.applyMentalModel(model, situation, objective);
            return this.formatResponse(result);
          }
            
          // Advanced Reasoning Operations
          case 'analogical_reasoning': {
            const { sourceDomain, targetDomain, mappingCriteria } = request.params.arguments as { 
              sourceDomain: string, 
              targetDomain: string, 
              mappingCriteria?: string[] 
            };
            const result = await this.advancedReasoning.performAnalogicalReasoning(
              sourceDomain, 
              targetDomain, 
              mappingCriteria || []
            );
            return this.formatResponse(result);
          }
            
          case 'causal_reasoning': {
            const { situation, domain, depth } = request.params.arguments as { 
              situation: string, 
              domain: string, 
              depth?: number 
            };
            const result = await this.advancedReasoning.performCausalReasoning(
              situation, 
              domain, 
              depth || 3
            );
            return this.formatResponse(result);
          }

          // Rejection Sampling Operations
          case 'generate_solutions': {
            const { problem, count, criteria } = request.params.arguments as { problem: string, count: number, criteria?: string[] };
            const result = await this.generateSolutions(problem, count, criteria || []);
            return this.formatResponse(result);
          }

          // Reward Model Operations
          case 'evaluate_solution': {
            const { solution, criteria, context } = request.params.arguments as { solution: string, criteria: string[], context?: string };
            const result = await this.evaluateSolution(solution, criteria, context || '');
            return this.formatResponse(result);
          }

          // Sequential Thinking Operations
          case 'sequential_analysis': {
            const { problem, steps, domain } = request.params.arguments as { problem: string, steps: number, domain?: string };
            const result = await this.performSequentialAnalysis(problem, steps, domain || '');
            return this.formatResponse(result);
          }

          // LLM-based tools
          case 'extract_knowledge': {
            if (!this.useLLM || !this.llmClient) {
              throw new McpError(ErrorCode.InternalError, 'LLM integration is not enabled');
            }
            
            const { text, context } = request.params.arguments as { text: string, context?: string };
            if (!text) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required text parameter');
            }
            
            const triples = await this.llmClient.extractTriples(text, context || '');
            
            // Optionally store the extracted triples in the knowledge base
            const storedTriples = [];
            for (const triple of triples) {
              try {
                const id = await this.knowledgeService.createTriple(triple);
                storedTriples.push({ id, ...triple });
              } catch (err) {
                console.error('[AIReasoningServer] Error storing extracted triple:', err);
              }
            }
            
            return this.formatResponse({ 
              triples: storedTriples,
              count: storedTriples.length
            });
          }
          
          case 'update_domain_ontology': {
            if (!this.useLLM || !this.llmClient) {
              throw new McpError(ErrorCode.InternalError, 'LLM integration is not enabled');
            }
            
            const { domain, existingConcepts } = request.params.arguments as { 
              domain: string, 
              existingConcepts?: string[] 
            };
            
            if (!domain) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required domain parameter');
            }
            
            const concepts = existingConcepts || await this.getExistingConcepts(domain);
            const ontologyUpdate = await this.llmClient.updateOntology(domain, concepts);
            
            // Store the new relationships as triples
            const storedRelationships = [];
            for (const rel of ontologyUpdate.relationships) {
              try {
                const triple = {
                  subject: rel.from,
                  predicate: rel.relation,
                  object: rel.to,
                  confidence: rel.confidence,
                  context: `domain:${domain}`,
                  source: 'llm_ontology_update'
                };
                
                const id = await this.knowledgeService.createTriple(triple);
                storedRelationships.push({ id, ...rel });
              } catch (err) {
                console.error('[AIReasoningServer] Error storing relationship:', err);
              }
            }
            
            return this.formatResponse({
              domain,
              new_concepts: ontologyUpdate.newConcepts,
              relationships: storedRelationships,
              existing_concepts: concepts
            });
          }
          
          case 'validate_knowledge_consistency': {
            if (!this.useLLM || !this.llmClient) {
              throw new McpError(ErrorCode.InternalError, 'LLM integration is not enabled');
            }
            
            const { newFact, existingFacts } = request.params.arguments as {
              newFact: string,
              existingFacts?: string[]
            };
            
            if (!newFact) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required newFact parameter');
            }
            
            // Get existing facts from knowledge base if not provided
            const facts = existingFacts || await this.getRelevantFacts(newFact);
            const validationResult = await this.llmClient.validateConsistency(newFact, facts);
            
            return this.formatResponse(validationResult);
          }

          // Add the new WebCrawler tool handler
          case 'enrich_ontology_from_web': {
            if (!this.useLLM || !this.llmClient || !this.webCrawler) {
              throw new McpError(ErrorCode.InternalError, 'Web crawler integration is not enabled');
            }
            
            const { domain, searchTerms, maxResults } = request.params.arguments as { 
              domain: string, 
              searchTerms?: string[],
              maxResults?: number
            };
            
            if (!domain) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required domain parameter');
            }
            
            // Get existing concepts for this domain
            const existingConcepts = await this.getExistingConcepts(domain);
            
            // Use WebCrawler to enrich the ontology
            const enrichmentResult = await this.webCrawler.enrichOntology(domain, existingConcepts);
            
            // Store the new concepts and relationships in the knowledge base
            const storedConcepts = [];
            const storedRelationships = [];
            
            // Store new concepts as triples (concept -> is_a -> domain_concept)
            for (const concept of enrichmentResult.newConcepts) {
              try {
                const triple = {
                  subject: concept,
                  predicate: 'is_a',
                  object: `${domain}_concept`,
                  confidence: 0.8,
                  context: `domain:${domain}`,
                  source: 'web_enrichment'
                };
                
                const id = await this.knowledgeService.createTriple(triple);
                storedConcepts.push({ id, concept });
              } catch (err) {
                console.error(`[AIReasoningServer] Error storing concept for domain ${domain}:`, err);
              }
            }
            
            // Store relationships as triples
            for (const rel of enrichmentResult.relationships) {
              try {
                const triple = {
                  subject: rel.from,
                  predicate: rel.relation,
                  object: rel.to,
                  confidence: rel.confidence,
                  context: `domain:${domain}`,
                  source: 'web_enrichment'
                };
                
                const id = await this.knowledgeService.createTriple(triple);
                storedRelationships.push({ id, ...rel });
              } catch (err) {
                console.error(`[AIReasoningServer] Error storing relationship for domain ${domain}:`, err);
              }
            }
            
            return this.formatResponse({
              domain,
              new_concepts: storedConcepts,
              relationships: storedRelationships,
              existing_concepts: existingConcepts,
              source: 'web_crawl'
            });
          }

          // Add HyperGraph tool handlers
          case 'connect_domains': {
            if (!this.hyperGraphManager) {
              throw new McpError(ErrorCode.InternalError, 'Hypergraph not initialized');
            }
            
            const { sourceNode, targetNodes, relationship, domains, confidence } = request.params.arguments as {
              sourceNode: string;
              targetNodes: string[];
              relationship: string;
              domains: string[];
              confidence?: number;
            };
            
            // Validate required parameters
            if (!sourceNode || !targetNodes || !relationship || !domains) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
            }
            
            // Create the hyperedge
            const edgeId = await this.hyperGraphManager.createHyperEdge({
              label: relationship,
              nodes: [sourceNode, ...targetNodes],
              domains,
              confidence: confidence || 0.8,
              source: 'api_request'
            });
            
            return this.formatResponse({
              edge_id: edgeId,
              source: sourceNode,
              targets: targetNodes,
              relationship,
              domains
            });
          }
          
          case 'update_world_model': {
            if (!this.hyperGraphManager) {
              throw new McpError(ErrorCode.InternalError, 'Hypergraph not initialized');
            }
            
            const { concepts, relationships } = request.params.arguments as {
              concepts: Array<{concept: string, domain: string}>;
              relationships: Array<{
                source: string;
                target: string;
                relationship: string;
                confidence: number;
              }>;
            };
            
            // Update the world model
            await this.hyperGraphManager.updateWorldModel(concepts, relationships);
            
            return this.formatResponse({
              success: true,
              concepts_added: concepts.length,
              relationships_added: relationships.length
            });
          }
          
          case 'expand_problem_context': {
            if (!this.hyperGraphManager) {
              throw new McpError(ErrorCode.InternalError, 'Hypergraph not initialized');
            }
            
            const { concepts, domain, task, maxDepth, minConfidence } = request.params.arguments as {
              concepts: string[];
              domain: string;
              task?: string;
              maxDepth?: number;
              minConfidence?: number;
            };
            
            // Expand the context
            const expandedContext = await this.hyperGraphManager.buildExpandedContext(
              concepts,
              domain,
              maxDepth || 2,
              minConfidence || 0.6
            );
            
            return this.formatResponse({
              expanded_context: expandedContext,
              seed_concepts: concepts,
              domain,
              task: task || ''
            });
          }
          
          case 'get_sdlc_world_connections': {
            if (!this.hyperGraphManager) {
              throw new McpError(ErrorCode.InternalError, 'Hypergraph not initialized');
            }
            
            const { sdlcConcepts, task } = request.params.arguments as {
              sdlcConcepts: string[];
              task?: string;
            };
            
            // Get relevant world knowledge
            const worldKnowledge = await this.hyperGraphManager.getContextRelevantWorldKnowledge(
              sdlcConcepts,
              task || ''
            );
            
            return this.formatResponse({
              sdlc_concepts: sdlcConcepts,
              relevant_world_concepts: worldKnowledge.concepts,
              relevant_facts: worldKnowledge.facts,
              task: task || ''
            });
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        debugLog('Tool Error:', error);
        console.error('[Tool Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  // Helper Methods for Validation
  private validateAndExtractTriple(args: any): Omit<import('./knowledge/types.js').Triple, 'timestamp'> {
    if (!args.subject || !args.predicate || !args.object || args.confidence === undefined || !args.source || !args.context) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required triple fields');
    }
    return {
      subject: args.subject as string,
      predicate: args.predicate as string,
      object: args.object as string,
      confidence: args.confidence as number,
      source: args.source as string,
      context: args.context as string
    };
  }

  private validateAndExtractFact(args: any): Omit<import('./knowledge/types.js').Fact, 'timestamp'> {
    if (!args.statement || !args.evidence || args.confidence === undefined || !args.source) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required fact fields');
    }
    return {
      statement: args.statement as string,
      evidence: args.evidence as string[],
      confidence: args.confidence as number,
      source: args.source as string,
      references: (args.references || []) as string[]
    };
  }

  private validateAndExtractRule(args: any): import('./knowledge/types.js').Rule {
    if (!args.name || !args.condition || !args.consequence || args.priority === undefined || !args.domain || !args.description) {
      throw new McpError(ErrorCode.InvalidParams, 'Missing required rule fields');
    }
    return {
      name: args.name as string,
      condition: args.condition as string,
      consequence: args.consequence as string,
      priority: args.priority as number,
      domain: args.domain as string,
      metadata: {
        description: args.description as string,
        examples: (args.examples || []) as string[],
        tags: (args.tags || []) as string[]
      }
    };
  }

  private validateRequiredString(args: any, field: string): { [key: string]: string } {
    if (!args[field] || typeof args[field] !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, `Missing or invalid ${field}`);
    }
    return { [field]: args[field] as string };
  }

  private formatResponse(data: any): any {
    // Convert null or undefined to an empty object for safety
    const safeData = data === null || data === undefined ? {} : data;
    
    // Debug log the response we're about to send
    debugLog('Formatted response:', safeData);
    
    // Return the data directly without wrapping it in content
    // The MCP server framework will handle the proper formatting
    return safeData;
  }

  // Reasoning Engine methods have been moved to src/core/index.ts

  // Decision Support methods moved to src/decision/index.ts

  // Ethical Framework Methods - now delegated to the EthicalFramework class
  private async validateEthics(decision: string, principles: string[], context: string): Promise<any> {
    console.log(`[AIReasoningServer] Validating ethics for decision: '${decision}' with principles:`, principles, `Context: ${context}`);
    return this.ethicalFramework.validateEthics(decision, principles, context);
  }

  // Mental Models Methods - now delegated to the AdvancedReasoning class
  private async applyMentalModel(model: string, situation: string, objective: string): Promise<any> {
    console.log(`[AIReasoningServer] Applying mental model '${model}' to situation: '${situation}' for objective: '${objective}'`);
    return this.advancedReasoning.applyMentalModel(model, situation, objective);
  }

  // Rejection Sampling Methods - now delegated to the AdvancedReasoning class
  private async generateSolutions(problem: string, count: number, criteria: string[]): Promise<any> {
    console.log(`[AIReasoningServer] Generating ${count} solutions for problem: '${problem}' with criteria:`, criteria);
    return this.advancedReasoning.generateSolutions(problem, count, criteria);
  }

  // Reward Model Methods
  private async evaluateSolution(solution: string, criteria: string[], context: string): Promise<any> {
    console.log(`[AIReasoningServer] Evaluating solution: '${solution}' with criteria:`, criteria, `Context: ${context}`);
    return { evaluation_score: 0.85, report: `Evaluation of ${solution}`, method: "solution_evaluation" };
  }

  // Sequential Thinking Methods - now delegated to the AdvancedReasoning class
  private async performSequentialAnalysis(problem: string, steps: number, domain: string): Promise<any> {
    console.log(`[AIReasoningServer] Performing sequential analysis for problem: '${problem}', steps: ${steps}, domain: '${domain}'`);
    return this.advancedReasoning.performSequentialAnalysis(problem, steps, domain);
  }

  // Helper methods for LLM integration
  
  /**
   * Get existing concepts for a domain from the knowledge base
   */
  private async getExistingConcepts(domain: string): Promise<string[]> {
    try {
      // Query for triples with context containing the domain
      const domainTriples = await this.graphClient.searchTriples({ context: `domain:${domain}` });
      
      // Extract unique subjects and objects as concepts
      const concepts = new Set<string>();
      domainTriples.forEach(triple => {
        if (typeof triple.subject === 'string') concepts.add(triple.subject);
        if (typeof triple.object === 'string') concepts.add(triple.object);
      });
      
      return Array.from(concepts);
    } catch (error) {
      console.error(`[AIReasoningServer] Error getting concepts for domain ${domain}:`, error);
      return [];
    }
  }
  
  /**
   * Get relevant facts from the knowledge base for consistency checking
   */
  private async getRelevantFacts(fact: string): Promise<string[]> {
    try {
      // Simple approach: extract keywords and find related facts
      const keywords = fact.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const facts = new Set<string>();
      
      // For each keyword, find facts containing it using triple search
      for (const keyword of keywords) {
        // Look for triples with statement-like predicates
        const triples = await this.graphClient.searchTriples({ 
          predicate: 'statement'
        });
        
        // Filter triples that contain the keyword in their object value
        triples.forEach(triple => {
          if (typeof triple.object === 'string' && 
              triple.object.toLowerCase().includes(keyword)) {
            facts.add(triple.object);
          }
        });
      }
      
      return Array.from(facts).slice(0, 20); // Limit to 20 facts
    } catch (error) {
      console.error('[AIReasoningServer] Error getting relevant facts:', error);
      return [];
    }
  }
  
  /**
   * Update ontologies for all domains in the knowledge base
   */
  private async updateDomainOntologies(): Promise<void> {
    if (!this.useLLM || !this.llmClient) {
      console.warn('[AIReasoningServer] Skipping ontology update - LLM not enabled');
      return;
    }
    
    try {
      // Get all distinct domains from the knowledge base
      const domains = await this.getDomains();
      
      console.log(`[AIReasoningServer] Running scheduled ontology update for ${domains.length} domains`);
      
      for (const domain of domains) {
        try {
          // Get existing concepts for this domain
          const concepts = await this.getExistingConcepts(domain);
          
          // Skip domains with too few concepts
          if (concepts.length < 3) continue;
          
          // Update the ontology
          const ontologyUpdate = await this.llmClient.updateOntology(domain, concepts);
          
          // Store the new relationships
          for (const rel of ontologyUpdate.relationships) {
            try {
              const triple = {
                subject: rel.from,
                predicate: rel.relation,
                object: rel.to,
                confidence: rel.confidence,
                context: `domain:${domain}`,
                source: 'automated_ontology_update'
              };
              
              await this.knowledgeService.createTriple(triple);
            } catch (err) {
              console.error(`[AIReasoningServer] Error storing relationship for domain ${domain}:`, err);
            }
          }
          
          console.log(`[AIReasoningServer] Updated ontology for domain '${domain}': ${ontologyUpdate.newConcepts.length} new concepts, ${ontologyUpdate.relationships.length} relationships`);
        } catch (domainError) {
          console.error(`[AIReasoningServer] Error updating ontology for domain ${domain}:`, domainError);
        }
      }
    } catch (error) {
      console.error('[AIReasoningServer] Error in updateDomainOntologies:', error);
    }
  }
  
  /**
   * Get all distinct domains from the knowledge base
   */
  private async getDomains(): Promise<string[]> {
    try {
      // Get all triples with context starting with 'domain:'
      const domainTriples = await this.graphClient.searchTriples({ context: 'domain:' });
      
      // Extract domain names from context strings
      const domains = new Set<string>();
      domainTriples.forEach(triple => {
        if (typeof triple.context === 'string' && triple.context.startsWith('domain:')) {
          const domain = triple.context.substring(7); // Remove 'domain:' prefix
          domains.add(domain);
        }
      });
      
      return Array.from(domains);
    } catch (error) {
      console.error('[AIReasoningServer] Error getting domains:', error);
      return [];
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AI Reasoning MCP Server running on stdio');

    process.on('SIGINT', async () => {
      if (this.ontologyUpdateInterval) {
        clearInterval(this.ontologyUpdateInterval);
        this.ontologyUpdateInterval = null;
      }
      
      // Close resources in reverse order of dependency
      if (this.advancedReasoning) await this.advancedReasoning.close();
      if (this.ethicalFramework) await this.ethicalFramework.close();
      if (this.reasoningCore) await this.reasoningCore.close();
      if (this.decisionSupport) await this.decisionSupport.close();
      await this.knowledgeService.close();
      if (this.graphClient) await this.graphClient.close();
      // The HyperGraphManager uses the graphClient, so no separate close needed
      await this.server.close();
      process.exit(0);
    });
  }
}

const server = new AIReasoningServer();
server.run().catch(console.error);
