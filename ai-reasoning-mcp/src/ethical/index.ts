/**
 * Ethical Framework Module
 * 
 * This module provides ethical validation and analysis capabilities
 * for decisions and processes.
 */

import { KnowledgeBaseService } from '../knowledge/service.js';

/**
 * Ethical principle types supported by the framework
 */
export enum EthicalPrinciple {
  BENEFICENCE = 'beneficence',         // Do good
  NONMALEFICENCE = 'nonmaleficence',   // Do no harm
  AUTONOMY = 'autonomy',               // Respect autonomy and freedom
  JUSTICE = 'justice',                 // Be fair and equitable
  TRANSPARENCY = 'transparency',       // Be open and explainable
  PRIVACY = 'privacy',                 // Respect privacy and confidentiality
  ACCOUNTABILITY = 'accountability',   // Be accountable for decisions
  SUSTAINABILITY = 'sustainability'    // Consider long-term impacts
}

/**
 * Ethical validation result
 */
export interface EthicalValidationResult {
  isEthical: boolean;
  score: number;
  principleAnalysis: {[principle in EthicalPrinciple]?: {
    score: number;
    analysis: string;
  }};
  concerns: string[];
  recommendations: string[];
  overallAnalysis: string;
}

/**
 * Ethical framework implementation
 */
export class EthicalFramework {
  private knowledgeService: KnowledgeBaseService;

  constructor(knowledgeService?: KnowledgeBaseService) {
    this.knowledgeService = knowledgeService || new KnowledgeBaseService();
  }

  /**
   * Validates a decision against ethical principles
   * 
   * @param decision Decision to validate
   * @param principles Optional array of specific principles to check
   * @param context Context information for the decision
   * @returns Ethical validation result
   */
  async validateEthics(
    decision: string,
    principles: string[] = [],
    context: string
  ): Promise<EthicalValidationResult> {
    try {
      console.log(`[EthicalFramework] Validating decision: '${decision}' in context: '${context}'`);
      
      // Normalize principles
      const normalizedPrinciples = this.normalizePrinciples(principles);
      
      // If no principles specified, use all
      if (normalizedPrinciples.length === 0) {
        normalizedPrinciples.push(
          EthicalPrinciple.BENEFICENCE,
          EthicalPrinciple.NONMALEFICENCE,
          EthicalPrinciple.AUTONOMY,
          EthicalPrinciple.JUSTICE,
          EthicalPrinciple.TRANSPARENCY,
          EthicalPrinciple.PRIVACY,
          EthicalPrinciple.ACCOUNTABILITY,
          EthicalPrinciple.SUSTAINABILITY
        );
      }
      
      // Analyze each principle
      const principleAnalysis: {[principle in EthicalPrinciple]?: {
        score: number;
        analysis: string;
      }} = {};
      
      for (const principle of normalizedPrinciples) {
        const analysis = await this.analyzePrinciple(decision, principle, context);
        principleAnalysis[principle] = analysis;
      }
      
      // Calculate overall ethical score
      let totalScore = 0;
      let totalWeight = 0;
      
      for (const principle in principleAnalysis) {
        const typedPrinciple = principle as EthicalPrinciple;
        const weight = this.getPrincipleWeight(typedPrinciple, context);
        
        totalScore += principleAnalysis[typedPrinciple]!.score * weight;
        totalWeight += weight;
      }
      
      const overallScore = totalScore / totalWeight;
      
      // Identify concerns (principles with low scores)
      const concerns: string[] = [];
      for (const principle in principleAnalysis) {
        const typedPrinciple = principle as EthicalPrinciple;
        if (principleAnalysis[typedPrinciple]!.score < 0.6) {
          concerns.push(`${this.getPrincipleLabel(typedPrinciple)}: ${principleAnalysis[typedPrinciple]!.analysis}`);
        }
      }
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(decision, concerns, context);
      
      // Generate overall analysis
      const isEthical = overallScore >= 0.7;
      const overallAnalysis = this.generateOverallAnalysis(
        decision,
        isEthical,
        overallScore,
        Object.keys(principleAnalysis) as EthicalPrinciple[],
        concerns,
        context
      );
      
      return {
        isEthical,
        score: overallScore,
        principleAnalysis,
        concerns,
        recommendations,
        overallAnalysis
      };
    } catch (error) {
      console.error('[EthicalFramework] Error validating ethics:', error);
      
      return {
        isEthical: false,
        score: 0.5,
        principleAnalysis: {
          [EthicalPrinciple.NONMALEFICENCE]: {
            score: 0.5,
            analysis: `Unable to fully analyze due to error: ${error instanceof Error ? error.message : String(error)}`
          }
        },
        concerns: ['Could not complete ethical analysis due to an error'],
        recommendations: ['Review the decision manually with an ethics expert'],
        overallAnalysis: `The ethical analysis encountered an error and could not be completed. The decision "${decision}" should be carefully reviewed by a human ethics expert.`
      };
    }
  }

  /**
   * Analyzes a decision for compliance with specific ethical guidelines
   * 
   * @param decision Decision to analyze
   * @param guidelines Array of specific guidelines
   * @param domain Domain of the decision
   * @returns Compliance analysis results
   */
  async analyzeCompliance(
    decision: string,
    guidelines: string[],
    domain: string
  ): Promise<{
    compliant: boolean;
    complianceScore: number;
    guidelineAnalysis: {[guideline: string]: {
      compliant: boolean;
      confidence: number;
      notes: string;
    }};
    overallAnalysis: string;
  }> {
    try {
      console.log(`[EthicalFramework] Analyzing compliance for decision: '${decision}' in domain: '${domain}'`);
      
      // Analyze each guideline
      const guidelineAnalysis: {[guideline: string]: {
        compliant: boolean;
        confidence: number;
        notes: string;
      }} = {};
      
      for (const guideline of guidelines) {
        const analysis = this.analyzeGuideline(decision, guideline, domain);
        guidelineAnalysis[guideline] = analysis;
      }
      
      // Calculate overall compliance score
      let totalScore = 0;
      
      for (const guideline in guidelineAnalysis) {
        const compliantScore = guidelineAnalysis[guideline].compliant ? 1 : 0;
        totalScore += compliantScore * guidelineAnalysis[guideline].confidence;
      }
      
      const overallScore = guidelines.length > 0 ? 
        totalScore / guidelines.length : 0.5;
      
      // Determine overall compliance
      const compliant = overallScore >= 0.7;
      
      // Generate overall analysis
      const overallAnalysis = this.generateComplianceAnalysis(
        decision,
        compliant,
        overallScore,
        guidelineAnalysis,
        domain
      );
      
      return {
        compliant,
        complianceScore: overallScore,
        guidelineAnalysis,
        overallAnalysis
      };
    } catch (error) {
      console.error('[EthicalFramework] Error analyzing compliance:', error);
      
      return {
        compliant: false,
        complianceScore: 0.5,
        guidelineAnalysis: Object.fromEntries(
          guidelines.map(g => [
            g, 
            {
              compliant: false,
              confidence: 0.5,
              notes: `Unable to analyze due to error: ${error instanceof Error ? error.message : String(error)}`
            }
          ])
        ),
        overallAnalysis: `The compliance analysis encountered an error. The decision "${decision}" should be manually reviewed for compliance.`
      };
    }
  }

  /**
   * Provides an ethical impact assessment for a proposed action
   * 
   * @param action Action to assess
   * @param stakeholders Array of affected stakeholders
   * @param domain Domain context
   * @returns Impact assessment results
   */
  async assessImpact(
    action: string,
    stakeholders: string[],
    domain: string
  ): Promise<{
    overallImpact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
    stakeholderImpacts: {[stakeholder: string]: {
      impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
      description: string;
      considerations: string[];
    }};
    shortTermImpacts: string[];
    longTermImpacts: string[];
    recommendations: string[];
    summary: string;
  }> {
    try {
      console.log(`[EthicalFramework] Assessing impact for action: '${action}' affecting ${stakeholders.length} stakeholders`);
      
      // Analyze impact on each stakeholder
      const stakeholderImpacts: {[stakeholder: string]: {
        impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
        description: string;
        considerations: string[];
      }} = {};
      
      for (const stakeholder of stakeholders) {
        stakeholderImpacts[stakeholder] = this.analyzeStakeholderImpact(action, stakeholder, domain);
      }
      
      // Calculate overall impact
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      let mixedCount = 0;
      
      for (const stakeholder in stakeholderImpacts) {
        switch (stakeholderImpacts[stakeholder].impact) {
          case 'Positive': positiveCount++; break;
          case 'Negative': negativeCount++; break;
          case 'Neutral': neutralCount++; break;
          case 'Mixed': mixedCount++; break;
        }
      }
      
      let overallImpact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
      
      if (positiveCount > negativeCount && positiveCount > neutralCount && positiveCount > mixedCount) {
        overallImpact = 'Positive';
      } else if (negativeCount > positiveCount && negativeCount > neutralCount && negativeCount > mixedCount) {
        overallImpact = 'Negative';
      } else if (neutralCount > positiveCount && neutralCount > negativeCount && neutralCount > mixedCount) {
        overallImpact = 'Neutral';
      } else {
        overallImpact = 'Mixed';
      }
      
      // Identify short-term and long-term impacts
      const shortTermImpacts = this.identifyShortTermImpacts(action, stakeholders, domain);
      const longTermImpacts = this.identifyLongTermImpacts(action, stakeholders, domain);
      
      // Generate recommendations
      const recommendations = this.generateImpactRecommendations(
        action,
        overallImpact,
        stakeholderImpacts,
        domain
      );
      
      // Generate summary
      const summary = this.generateImpactSummary(
        action,
        overallImpact,
        stakeholderImpacts,
        shortTermImpacts,
        longTermImpacts,
        domain
      );
      
      return {
        overallImpact,
        stakeholderImpacts,
        shortTermImpacts,
        longTermImpacts,
        recommendations,
        summary
      };
    } catch (error) {
      console.error('[EthicalFramework] Error assessing impact:', error);
      
      return {
        overallImpact: 'Mixed',
        stakeholderImpacts: Object.fromEntries(
          stakeholders.map(s => [
            s, 
            {
              impact: 'Mixed',
              description: `Unable to analyze impact due to error: ${error instanceof Error ? error.message : String(error)}`,
              considerations: ['Review impact manually']
            }
          ])
        ),
        shortTermImpacts: ['Unable to determine short-term impacts due to an error'],
        longTermImpacts: ['Unable to determine long-term impacts due to an error'],
        recommendations: ['Conduct a manual impact assessment'],
        summary: `The impact assessment encountered an error. The action "${action}" should be manually reviewed for its ethical impacts.`
      };
    }
  }

  /**
   * Normalize principles from string array to enum values
   * 
   * @param principles Array of principle strings
   * @returns Array of EthicalPrinciple enum values
   */
  private normalizePrinciples(principles: string[]): EthicalPrinciple[] {
    const normalizedPrinciples: EthicalPrinciple[] = [];
    
    for (const principle of principles) {
      const lowercasePrinciple = principle.toLowerCase();
      
      // Match to enum values
      if (lowercasePrinciple.includes('benefi') || lowercasePrinciple.includes('good')) {
        normalizedPrinciples.push(EthicalPrinciple.BENEFICENCE);
      }
      else if (lowercasePrinciple.includes('nonmalef') || lowercasePrinciple.includes('harm') || 
               lowercasePrinciple.includes('no harm')) {
        normalizedPrinciples.push(EthicalPrinciple.NONMALEFICENCE);
      }
      else if (lowercasePrinciple.includes('autono') || lowercasePrinciple.includes('freedom') || 
               lowercasePrinciple.includes('choice')) {
        normalizedPrinciples.push(EthicalPrinciple.AUTONOMY);
      }
      else if (lowercasePrinciple.includes('justi') || lowercasePrinciple.includes('fair') || 
               lowercasePrinciple.includes('equal')) {
        normalizedPrinciples.push(EthicalPrinciple.JUSTICE);
      }
      else if (lowercasePrinciple.includes('transp') || lowercasePrinciple.includes('open') || 
               lowercasePrinciple.includes('explain')) {
        normalizedPrinciples.push(EthicalPrinciple.TRANSPARENCY);
      }
      else if (lowercasePrinciple.includes('priva') || lowercasePrinciple.includes('confiden')) {
        normalizedPrinciples.push(EthicalPrinciple.PRIVACY);
      }
      else if (lowercasePrinciple.includes('account') || lowercasePrinciple.includes('responsib')) {
        normalizedPrinciples.push(EthicalPrinciple.ACCOUNTABILITY);
      }
      else if (lowercasePrinciple.includes('sustain') || lowercasePrinciple.includes('long-term') || 
               lowercasePrinciple.includes('future')) {
        normalizedPrinciples.push(EthicalPrinciple.SUSTAINABILITY);
      }
    }
    
    // Remove duplicates
    return [...new Set(normalizedPrinciples)];
  }

  /**
   * Analyze a decision against a specific ethical principle
   * 
   * @param decision Decision to analyze
   * @param principle Ethical principle to apply
   * @param context Context information
   * @returns Score and analysis for the principle
   */
  private async analyzePrinciple(
    decision: string,
    principle: EthicalPrinciple,
    context: string
  ): Promise<{score: number; analysis: string}> {
    // Decision and context keywords that affect ethical analysis
    const decisionLower = decision.toLowerCase();
    const contextLower = context.toLowerCase();
    
    // Base score starts at neutral
    let score = 0.5;
    let analysis = '';
    
    switch (principle) {
      case EthicalPrinciple.BENEFICENCE:
        // Check for positive impact, benefits, helping others
        if (decisionLower.includes('help') || decisionLower.includes('improve') || 
            decisionLower.includes('benefit') || decisionLower.includes('assist') ||
            decisionLower.includes('support') || decisionLower.includes('enhance')) {
          score += 0.3;
          analysis = 'The decision appears to actively help or benefit others.';
        } 
        else if (decisionLower.includes('reduce') && 
                (decisionLower.includes('harm') || decisionLower.includes('risk') || 
                 decisionLower.includes('danger') || decisionLower.includes('problem'))) {
          score += 0.2;
          analysis = 'The decision aims to reduce harm or problems.';
        }
        else {
          analysis = 'The decision does not clearly demonstrate a focus on doing good or creating benefits.';
        }
        break;
      
      case EthicalPrinciple.NONMALEFICENCE:
        // Check for harm, risks, damage
        if (decisionLower.includes('harm') || decisionLower.includes('damage') || 
            decisionLower.includes('hurt') || decisionLower.includes('negative') ||
            decisionLower.includes('risk') || decisionLower.includes('danger')) {
          score -= 0.3;
          analysis = 'The decision appears to involve potential harm or negative consequences.';
        } 
        else if (decisionLower.includes('safe') || decisionLower.includes('protect') || 
                 decisionLower.includes('prevent harm') || decisionLower.includes('secure')) {
          score += 0.2;
          analysis = 'The decision actively seeks to prevent harm or ensure safety.';
        }
        else {
          score += 0.1;
          analysis = 'The decision does not appear to cause direct harm.';
        }
        break;
      
      case EthicalPrinciple.AUTONOMY:
        // Check for respect of autonomy, choice, consent
        if (decisionLower.includes('choice') || decisionLower.includes('option') || 
            decisionLower.includes('consent') || decisionLower.includes('voluntary') ||
            decisionLower.includes('self-determination') || decisionLower.includes('freedom')) {
          score += 0.3;
          analysis = 'The decision respects and supports individual autonomy and freedom of choice.';
        } 
        else if (decisionLower.includes('force') || decisionLower.includes('compel') || 
                 decisionLower.includes('mandatory') || decisionLower.includes('restrict') ||
                 decisionLower.includes('limit') || decisionLower.includes('impose')) {
          score -= 0.3;
          analysis = 'The decision may limit individual autonomy and freedom of choice.';
        }
        else {
          analysis = 'The decision neither clearly supports nor undermines autonomy.';
        }
        break;
      
      case EthicalPrinciple.JUSTICE:
        // Check for fairness, equality, distribution
        if (decisionLower.includes('fair') || decisionLower.includes('equal') || 
            decisionLower.includes('equit') || decisionLower.includes('just') ||
            decisionLower.includes('balanc') || decisionLower.includes('impartial')) {
          score += 0.3;
          analysis = 'The decision appears to promote fairness and equitable treatment.';
        } 
        else if (decisionLower.includes('unfair') || decisionLower.includes('bias') || 
                 decisionLower.includes('discriminat') || decisionLower.includes('prejudice') ||
                 decisionLower.includes('favorit') || decisionLower.includes('inequal')) {
          score -= 0.3;
          analysis = 'The decision may involve unfairness or bias.';
        }
        else {
          analysis = 'The decision does not clearly address justice or fairness concerns.';
        }
        break;
      
      case EthicalPrinciple.TRANSPARENCY:
        // Check for transparency, explanations, clarity
        if (decisionLower.includes('explain') || decisionLower.includes('transparen') || 
            decisionLower.includes('disclose') || decisionLower.includes('inform') ||
            decisionLower.includes('communicat') || decisionLower.includes('clear')) {
          score += 0.3;
          analysis = 'The decision promotes transparency and clear communication.';
        } 
        else if (decisionLower.includes('hidden') || decisionLower.includes('secret') || 
                 decisionLower.includes('obscur') || decisionLower.includes('conceal') ||
                 decisionLower.includes('withhold') || decisionLower.includes('unclear')) {
          score -= 0.3;
          analysis = 'The decision may lack transparency or involve concealment.';
        }
        else {
          analysis = 'The decision does not specifically address transparency.';
        }
        break;
      
      case EthicalPrinciple.PRIVACY:
        // Check for privacy, confidentiality, data protection
        if (decisionLower.includes('privacy') || decisionLower.includes('confidential') || 
            decisionLower.includes('secure data') || decisionLower.includes('protect information') ||
            decisionLower.includes('anonymiz') || decisionLower.includes('encryption')) {
          score += 0.3;
          analysis = 'The decision respects and protects privacy and confidentiality.';
        } 
        else if (decisionLower.includes('expose') || decisionLower.includes('reveal') || 
                 decisionLower.includes('share data') || decisionLower.includes('personal information') ||
                 decisionLower.includes('track') || decisionLower.includes('monitor')) {
          score -= 0.3;
          analysis = 'The decision may compromise privacy or confidentiality.';
        }
        else {
          analysis = 'The decision does not specifically address privacy concerns.';
        }
        break;
      
      case EthicalPrinciple.ACCOUNTABILITY:
        // Check for accountability, responsibility, oversight
        if (decisionLower.includes('accountab') || decisionLower.includes('responsib') || 
            decisionLower.includes('oversight') || decisionLower.includes('audit') ||
            decisionLower.includes('assess') || decisionLower.includes('measure')) {
          score += 0.3;
          analysis = 'The decision promotes accountability and responsibility.';
        } 
        else if (decisionLower.includes('avoid responsib') || decisionLower.includes('blame') || 
                 decisionLower.includes('unaccountable') || decisionLower.includes('no oversight')) {
          score -= 0.3;
          analysis = 'The decision may diminish accountability or responsibility.';
        }
        else {
          analysis = 'The decision does not specifically address accountability.';
        }
        break;
      
      case EthicalPrinciple.SUSTAINABILITY:
        // Check for long-term effects, future impacts, sustainability
        if (decisionLower.includes('sustain') || decisionLower.includes('long-term') || 
            decisionLower.includes('future') || decisionLower.includes('lasting') ||
            decisionLower.includes('environment') || decisionLower.includes('generation')) {
          score += 0.3;
          analysis = 'The decision considers long-term sustainability and future impacts.';
        } 
        else if (decisionLower.includes('short-term') || decisionLower.includes('temporary') || 
                 decisionLower.includes('immediate') || decisionLower.includes('quick')) {
          score -= 0.1;
          analysis = 'The decision appears focused on short-term outcomes without considering long-term sustainability.';
        }
        else {
          analysis = 'The decision does not specifically address long-term sustainability.';
        }
        break;
    }
    
    // Adjust based on context
    if (contextLower.includes('emergency') || contextLower.includes('crisis') || 
        contextLower.includes('urgent') || contextLower.includes('life-threatening')) {
      // In emergencies, beneficence and nonmaleficence often take priority
      if (principle === EthicalPrinciple.BENEFICENCE || 
          principle === EthicalPrinciple.NONMALEFICENCE) {
        score += 0.1;
        analysis += ' The emergency context gives higher priority to this principle.';
      }
    }
    
    if (contextLower.includes('medical') || contextLower.includes('healthcare') || 
        contextLower.includes('health') || contextLower.includes('patient')) {
      // In medical contexts, all principles tend to be more strictly applied
      score = (score > 0.5) ? Math.min(score + 0.1, 1.0) : Math.max(score - 0.1, 0.0);
      
      if (principle === EthicalPrinciple.PRIVACY) {
        score = Math.max(score, 0.6); // Privacy is particularly important in healthcare
        analysis += ' This is especially important in a medical/healthcare context.';
      }
    }
    
    if (contextLower.includes('personal data') || contextLower.includes('sensitive information') || 
        contextLower.includes('user data')) {
      // Data contexts make privacy more important
      if (principle === EthicalPrinciple.PRIVACY) {
        score = Math.max(score, 0.7);
        analysis += ' This is critical when handling personal or sensitive data.';
      }
      
      if (principle === EthicalPrinciple.TRANSPARENCY) {
        score = Math.max(score, 0.6);
        analysis += ' Transparency is especially important when handling personal data.';
      }
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(1, score));
    
    return {score, analysis};
  }

  /**
   * Get the human-readable label for an ethical principle
   * 
   * @param principle Ethical principle enum value
   * @returns Human-readable label
   */
  private getPrincipleLabel(principle: EthicalPrinciple): string {
    switch (principle) {
      case EthicalPrinciple.BENEFICENCE: return 'Beneficence (Do Good)';
      case EthicalPrinciple.NONMALEFICENCE: return 'Non-maleficence (Do No Harm)';
      case EthicalPrinciple.AUTONOMY: return 'Autonomy (Respect Freedom)';
      case EthicalPrinciple.JUSTICE: return 'Justice (Be Fair)';
      case EthicalPrinciple.TRANSPARENCY: return 'Transparency (Be Open)';
      case EthicalPrinciple.PRIVACY: return 'Privacy (Respect Confidentiality)';
      case EthicalPrinciple.ACCOUNTABILITY: return 'Accountability (Take Responsibility)';
      case EthicalPrinciple.SUSTAINABILITY: return 'Sustainability (Consider Long-term)';
      default: return 'Unknown Principle';
    }
  }

  /**
   * Get the importance weight for a principle in a given context
   * 
   * @param principle Ethical principle
   * @param context Context information
   * @returns Weight value
   */
  private getPrincipleWeight(principle: EthicalPrinciple, context: string): number {
    const contextLower = context.toLowerCase();
    
    // Default weights - higher values indicate more importance
    const defaultWeights: {[principle in EthicalPrinciple]: number} = {
      [EthicalPrinciple.BENEFICENCE]: 1.0,
      [EthicalPrinciple.NONMALEFICENCE]: 1.2, // Do no harm is slightly more important by default
      [EthicalPrinciple.AUTONOMY]: 1.0,
      [EthicalPrinciple.JUSTICE]: 1.0,
      [EthicalPrinciple.TRANSPARENCY]: 0.9,
      [EthicalPrinciple.PRIVACY]: 0.9,
      [EthicalPrinciple.ACCOUNTABILITY]: 0.8,
      [EthicalPrinciple.SUSTAINABILITY]: 0.8
    };
    
    // Context-specific weight adjustments
    if (contextLower.includes('medical') || contextLower.includes('healthcare') || 
        contextLower.includes('health') || contextLower.includes('patient')) {
      // In medical contexts
      if (principle === EthicalPrinciple.NONMALEFICENCE) return 1.5; // Do no harm is critical
      if (principle === EthicalPrinciple.BENEFICENCE) return 1.3;    // Doing good is very important
      if (principle === EthicalPrinciple.AUTONOMY) return 1.3;       // Patient autonomy is important
      if (principle === EthicalPrinciple.PRIVACY) return 1.2;        // Privacy is important
    }
    
    if (contextLower.includes('data') || contextLower.includes('personal information') || 
        contextLower.includes('privacy')) {
      // In data/privacy contexts
      if (principle === EthicalPrinciple.PRIVACY) return 1.5;        // Privacy is critical
      if (principle === EthicalPrinciple.TRANSPARENCY) return 1.2;   // Transparency is important
      if (principle === EthicalPrinciple.AUTONOMY) return 1.2;       // User control is important
    }
    
    if (contextLower.includes('justice') || contextLower.includes('fair') || 
        contextLower.includes('equity') || contextLower.includes('equal')) {
      // In justice/fairness contexts
      if (principle === EthicalPrinciple.JUSTICE) return 1.5;        // Justice is critical
      if (principle === EthicalPrinciple.ACCOUNTABILITY) return 1.2; // Accountability is important
    }
    
    if (contextLower.includes('environment') || contextLower.includes('climate') || 
        contextLower.includes('future generation') || contextLower.includes('sustainable')) {
      // In environmental/sustainability contexts
      if (principle === EthicalPrinciple.SUSTAINABILITY) return 1.5; // Sustainability is critical
      if (principle === EthicalPrinciple.NONMALEFICENCE) return 1.3; // Avoiding harm is important
    }
    
    return defaultWeights[principle];
  }

  /**
   * Generate recommendations for addressing ethical concerns
   * 
   * @param decision Decision being evaluated
   * @param concerns Array of identified concerns
   * @param context Context information
   * @returns Array of recommendations
   */
  private generateRecommendations(
    decision: string,
    concerns: string[],
    context: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Generate recommendations based on concerns
    for (const concern of concerns) {
      if (concern.includes('Beneficence')) {
        recommendations.push('Enhance the positive impact of the decision by explicitly identifying and maximizing benefits.');
      }
      
      if (concern.includes('Non-maleficence')) {
        recommendations.push('Conduct a thorough risk assessment to identify and mitigate potential harms.');
      }
      
      if (concern.includes('Autonomy')) {
        recommendations.push('Ensure affected parties have informed consent and meaningful choices.');
      }
      
      if (concern.includes('Justice')) {
        recommendations.push('Review the decision for fairness and equitable treatment of all affected parties.');
      }
      
      if (concern.includes('Transparency')) {
        recommendations.push('Improve transparency by clearly explaining the decision process and rationale.');
      }
      
      if (concern.includes('Privacy')) {
        recommendations.push('Strengthen privacy safeguards and minimize collection of unnecessary data.');
      }
      
      if (concern.includes('Accountability')) {
        recommendations.push('Establish clear responsibilities and oversight mechanisms for the decision and its outcomes.');
      }
      
      if (concern.includes('Sustainability')) {
        recommendations.push('Consider long-term impacts and sustainability implications of the decision.');
      }
    }
    
    // If no specific concerns, provide general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Continue to monitor the ethical implications of this decision during implementation.');
      recommendations.push('Establish feedback mechanisms to identify any emerging ethical concerns.');
    }
    
    // Add context-specific recommendations
    const contextLower = context.toLowerCase();
    
    if (contextLower.includes('medical') || contextLower.includes('healthcare')) {
      recommendations.push('Ensure all actions comply with established medical ethics guidelines and protocols.');
    }
    
    if (contextLower.includes('data') || contextLower.includes('privacy')) {
      recommendations.push('Implement data minimization and privacy-by-design principles.');
    }
    
    if (contextLower.includes('ai') || contextLower.includes('algorithm') || 
        contextLower.includes('automated')) {
      recommendations.push('Ensure algorithmic transparency and accountability with regular bias audits.');
    }
    
    return recommendations;
  }

  /**
   * Generate overall analysis for ethical validation
   * 
   * @param decision Decision being evaluated
   * @param isEthical Whether the decision is considered ethical
   * @param score Overall ethical score
   * @param principles Principles analyzed
   * @param concerns Identified concerns
   * @param context Context information
   * @returns Overall analysis text
   */
  private generateOverallAnalysis(
    decision: string,
    isEthical: boolean,
    score: number,
    principles: EthicalPrinciple[],
    concerns: string[],
    context: string
  ): string {
    // Primary assessment based on ethical status
    let analysis = `The decision to "${decision}" in the context of ${context} has been `;
    
    if (isEthical) {
      analysis += `determined to be ethically sound with a score of ${(score * 100).toFixed(1)}%. `;
      
      if (concerns.length > 0) {
        analysis += `However, there are ${concerns.length} concerns that should be addressed: `;
        analysis += concerns.join('; ') + '. ';
      } else {
        analysis += `It demonstrates strong alignment with ethical principles. `;
      }
    } else {
      analysis += `found to have ethical issues with a score of ${(score * 100).toFixed(1)}%. `;
      
      if (concerns.length > 0) {
        analysis += `The following ${concerns.length} concerns should be addressed: `;
        analysis += concerns.join('; ') + '. ';
      } else {
        analysis += `The overall score indicates ethical weaknesses even though no specific concerns were identified. `;
      }
    }
    
    // Add principles breakdown
    analysis += 'The evaluation considered ';
    
    if (principles.length <= 3) {
      analysis += principles.map(p => this.getPrincipleLabel(p)).join(', ') + '. ';
    } else {
      analysis += `${principles.length} ethical principles including ${this.getPrincipleLabel(principles[0])}, ${this.getPrincipleLabel(principles[1])}, and others. `;
    }
    
    // Context-specific conclusions
    const contextLower = context.toLowerCase();
    
    if (contextLower.includes('medical') || contextLower.includes('healthcare')) {
      analysis += 'In healthcare contexts, particular attention must be paid to do no harm and respect patient autonomy. ';
    }
    
    if (contextLower.includes('data') || contextLower.includes('privacy')) {
      analysis += 'For decisions involving data, privacy protections and transparency are especially important. ';
    }
    
    if (contextLower.includes('vulnerable') || contextLower.includes('children')) {
      analysis += 'When dealing with vulnerable populations, the ethical bar must be set higher with additional safeguards. ';
    }
    
    // Final recommendation
    if (isEthical) {
      if (score > 0.9) {
        analysis += 'This decision can proceed with confidence in its ethical foundation.';
      } else {
        analysis += 'The decision can proceed but would benefit from addressing the noted concerns.';
      }
    } else {
      if (score < 0.5) {
        analysis += 'It is recommended to reconsider or substantially revise this decision before proceeding.';
      } else {
        analysis += 'The decision requires modifications to address ethical concerns before proceeding.';
      }
    }
    
    return analysis;
  }

  /**
   * Analyze compliance with a specific guideline
   * 
   * @param decision Decision to analyze
   * @param guideline Guideline to check
   * @param domain Domain context
   * @returns Compliance analysis for the guideline
   */
  private analyzeGuideline(
    decision: string,
    guideline: string,
    domain: string
  ): {compliant: boolean; confidence: number; notes: string} {
    const decisionLower = decision.toLowerCase();
    const guidelineLower = guideline.toLowerCase();
    
    // Simple keyword matching for compliance assessment
    // Could be replaced with more sophisticated analysis in a real implementation
    const guidelineKeywords = guidelineLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    let matchCount = 0;
    for (const keyword of guidelineKeywords) {
      if (decisionLower.includes(keyword)) {
        matchCount++;
      }
    }
    
    const matchRatio = guidelineKeywords.length > 0 ? 
      matchCount / guidelineKeywords.length : 0;
    
    // Determine compliance and confidence
    let compliant = false;
    let confidence = 0.5;
    let notes = '';
    
    if (matchRatio > 0.7) {
      compliant = true;
      confidence = 0.8;
      notes = `Strong alignment with guideline "${guideline}"`;
    } 
    else if (matchRatio > 0.4) {
      compliant = true;
      confidence = 0.6;
      notes = `Moderate alignment with guideline "${guideline}"`;
    }
    else if (matchRatio > 0.2) {
      compliant = false;
      confidence = 0.6;
      notes = `Limited alignment with guideline "${guideline}"`;
    }
    else {
      compliant = false;
      confidence = 0.7;
      notes = `Minimal alignment with guideline "${guideline}"`;
    }
    
    // Domain-specific adjustments
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('medical') && guidelineLower.includes('consent')) {
      if (!decisionLower.includes('consent') && !decisionLower.includes('inform')) {
        compliant = false;
        confidence = 0.8;
        notes = `Medical decisions require explicit informed consent; this appears to be missing`;
      }
    }
    
    if (domainLower.includes('privacy') && guidelineLower.includes('data')) {
      if (!decisionLower.includes('protect') && !decisionLower.includes('secure') && 
          !decisionLower.includes('privacy')) {
        compliant = false;
        confidence = 0.8;
        notes = `Privacy policies require explicit data protection measures; these appear to be missing`;
      }
    }
    
    return { compliant, confidence, notes };
  }

  /**
   * Generate an overall compliance analysis
   * 
   * @param decision Decision being analyzed
   * @param compliant Whether the decision is compliant
   * @param score Overall compliance score
   * @param guidelineAnalysis Analysis of individual guidelines
   * @param domain Domain context
   * @returns Overall compliance analysis text
   */
  private generateComplianceAnalysis(
    decision: string,
    compliant: boolean,
    score: number,
    guidelineAnalysis: {[guideline: string]: {
      compliant: boolean;
      confidence: number;
      notes: string;
    }},
    domain: string
  ): string {
    // Count compliant and non-compliant guidelines
    let compliantCount = 0;
    let nonCompliantCount = 0;
    
    for (const guideline in guidelineAnalysis) {
      if (guidelineAnalysis[guideline].compliant) {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    }
    
    // Generate overall analysis
    let analysis = `The decision to "${decision}" in the ${domain} domain `;
    
    if (compliant) {
      analysis += `appears to be generally compliant with the specified guidelines, with an overall compliance score of ${(score * 100).toFixed(1)}%. `;
      
      if (nonCompliantCount > 0) {
        analysis += `However, there are concerns with ${nonCompliantCount} of the ${compliantCount + nonCompliantCount} guidelines. `;
      } else {
        analysis += `All ${compliantCount} guidelines appear to be satisfied. `;
      }
    } else {
      analysis += `raises compliance concerns with an overall compliance score of ${(score * 100).toFixed(1)}%. `;
      
      if (nonCompliantCount > 0) {
        analysis += `There are issues with ${nonCompliantCount} of the ${compliantCount + nonCompliantCount} guidelines. `;
      } else {
        analysis += `While individual guidelines may appear to be satisfied, the overall implementation raises concerns. `;
      }
    }
    
    // List non-compliant guidelines
    if (nonCompliantCount > 0) {
      analysis += `Non-compliant areas include: `;
      
      const nonCompliantGuidelines = Object.entries(guidelineAnalysis)
        .filter(([_, analysis]) => !analysis.compliant)
        .map(([guideline, analysis]) => `"${guideline}" (${analysis.notes})`);
      
      analysis += nonCompliantGuidelines.join('; ') + '. ';
    }
    
    // Domain-specific advice
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('healthcare') || domainLower.includes('medical')) {
      analysis += 'Healthcare decisions must strictly adhere to established protocols and regulations. ';
    }
    
    if (domainLower.includes('finance') || domainLower.includes('banking')) {
      analysis += 'Financial decisions are subject to strict regulatory oversight and compliance requirements. ';
    }
    
    // Final recommendation
    if (compliant) {
      if (score > 0.9) {
        analysis += 'The decision appears to meet compliance requirements and can proceed.';
      } else {
        analysis += 'The decision generally meets compliance requirements but would benefit from addressing the noted concerns.';
      }
    } else {
      if (score < 0.5) {
        analysis += 'It is recommended to review and revise the decision to ensure compliance before proceeding.';
      } else {
        analysis += 'The decision requires modifications to address compliance concerns.';
      }
    }
    
    return analysis;
  }

  /**
   * Analyze the impact of an action on a specific stakeholder
   * 
   * @param action Action to assess
   * @param stakeholder Affected stakeholder
   * @param domain Domain context
   * @returns Impact analysis for the stakeholder
   */
  private analyzeStakeholderImpact(
    action: string,
    stakeholder: string,
    domain: string
  ): {
    impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
    description: string;
    considerations: string[];
  } {
    const actionLower = action.toLowerCase();
    const stakeholderLower = stakeholder.toLowerCase();
    const domainLower = domain.toLowerCase();
    
    // Impact determination variables
    let impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed' = 'Neutral';
    let description = '';
    const considerations: string[] = [];
    
    // Generic stakeholder impact analysis
    if (stakeholderLower.includes('user') || stakeholderLower.includes('customer') || 
        stakeholderLower.includes('client')) {
      if (actionLower.includes('improve') || actionLower.includes('enhance') || 
          actionLower.includes('benefit') || actionLower.includes('help')) {
        impact = 'Positive';
        description = `${action} is likely to benefit ${stakeholder} by improving their experience or outcomes`;
        considerations.push('Ensure benefits are accessible to all users/customers');
      }
      else if (actionLower.includes('restrict') || actionLower.includes('limit') || 
               actionLower.includes('remove') || actionLower.includes('reduce')) {
        impact = 'Negative';
        description = `${action} may negatively impact ${stakeholder} by limiting their options or capabilities`;
        considerations.push('Consider whether limitations are necessary and justified');
        considerations.push('Explore alternative approaches with fewer negative impacts');
      }
      else if (actionLower.includes('change') || actionLower.includes('modify') || 
               actionLower.includes('update')) {
        impact = 'Mixed';
        description = `${action} will change the experience for ${stakeholder} with both potential benefits and drawbacks`;
        considerations.push('Clearly communicate changes to affected users/customers');
        considerations.push('Provide support during transition periods');
      }
      else {
        impact = 'Neutral';
        description = `${action} appears to have limited direct impact on ${stakeholder}`;
        considerations.push('Monitor for unexpected effects on user experience');
      }
    }
    else if (stakeholderLower.includes('employee') || stakeholderLower.includes('worker') || 
             stakeholderLower.includes('staff')) {
      if (actionLower.includes('training') || actionLower.includes('development') || 
          actionLower.includes('support') || actionLower.includes('improve condition')) {
        impact = 'Positive';
        description = `${action} is likely to benefit ${stakeholder} through professional development or improved working conditions`;
        considerations.push('Ensure equitable access to benefits across all staff');
      }
      else if (actionLower.includes('restructure') || actionLower.includes('reduce staff') || 
               actionLower.includes('automate') || actionLower.includes('outsource')) {
        impact = 'Negative';
        description = `${action} may negatively impact ${stakeholder} through potential job loss or increased workload`;
        considerations.push('Consider transition support and fair treatment');
        considerations.push('Explore ways to minimize negative impacts');
      }
      else if (actionLower.includes('change process') || actionLower.includes('new system') || 
               actionLower.includes('reorganiz')) {
        impact = 'Mixed';
        description = `${action} will change work processes for ${stakeholder} with mixed effects`;
        considerations.push('Provide adequate training and support for new systems/processes');
        considerations.push('Involve staff in planning to identify potential issues');
      }
      else {
        impact = 'Neutral';
        description = `${action} appears to have limited direct impact on ${stakeholder}`;
        considerations.push('Consider potential indirect effects on work environment');
      }
    }
    else if (stakeholderLower.includes('community') || stakeholderLower.includes('public') || 
             stakeholderLower.includes('society')) {
      if (actionLower.includes('environment') || actionLower.includes('sustainable') || 
          actionLower.includes('benefit community') || actionLower.includes('social good')) {
        impact = 'Positive';
        description = `${action} is likely to benefit ${stakeholder} through environmental or social improvements`;
        considerations.push('Ensure benefits are widely distributed across the community');
      }
      else if (actionLower.includes('pollut') || actionLower.includes('disrupt') || 
               actionLower.includes('noise') || actionLower.includes('congest')) {
        impact = 'Negative';
        description = `${action} may negatively impact ${stakeholder} through environmental or social disruption`;
        considerations.push('Explore mitigation strategies for negative community impacts');
        considerations.push('Engage with community representatives to address concerns');
      }
      else if (actionLower.includes('develop') || actionLower.includes('build') || 
               actionLower.includes('change') || actionLower.includes('expand')) {
        impact = 'Mixed';
        description = `${action} will bring change to ${stakeholder} with varying impacts among different groups`;
        considerations.push('Analyze impacts on different community segments');
        considerations.push('Develop targeted mitigation for vulnerable groups');
      }
      else {
        impact = 'Neutral';
        description = `${action} appears to have limited direct impact on the broader ${stakeholder}`;
        considerations.push('Monitor for unexpected community effects over time');
      }
    }
    
    // Domain-specific impact considerations
    if (domainLower.includes('education')) {
      if (stakeholderLower.includes('student')) {
        considerations.push('Consider effects on learning outcomes and educational access');
      }
      if (stakeholderLower.includes('teacher') || stakeholderLower.includes('faculty')) {
        considerations.push('Consider effects on teaching methods and workload');
      }
    }
    
    if (domainLower.includes('health') || domainLower.includes('medical')) {
      if (stakeholderLower.includes('patient')) {
        considerations.push('Consider effects on patient care quality and health outcomes');
      }
      if (stakeholderLower.includes('provider') || stakeholderLower.includes('doctor') || 
          stakeholderLower.includes('nurse')) {
        considerations.push('Consider effects on clinical practice and care delivery');
      }
    }
    
    if (domainLower.includes('technology') || domainLower.includes('software')) {
      considerations.push('Consider digital divide and accessibility implications');
      considerations.push('Consider data privacy and security implications');
    }
    
    // Ensure at least one consideration
    if (considerations.length === 0) {
      considerations.push(`Evaluate specific impacts on ${stakeholder} more thoroughly`);
    }
    
    return { impact, description, considerations };
  }

  /**
   * Identify potential short-term impacts of an action
   * 
   * @param action Action to assess
   * @param stakeholders Affected stakeholders
   * @param domain Domain context
   * @returns Array of short-term impacts
   */
  private identifyShortTermImpacts(
    action: string,
    stakeholders: string[],
    domain: string
  ): string[] {
    const impacts: string[] = [];
    const actionLower = action.toLowerCase();
    const domainLower = domain.toLowerCase();
    
    // Generic short-term impacts
    if (actionLower.includes('implement') || actionLower.includes('adopt') || 
        actionLower.includes('introduce') || actionLower.includes('launch')) {
      impacts.push('Initial adjustment period with potential disruption to current processes');
      impacts.push('Training and support requirements for affected parties');
    }
    
    if (actionLower.includes('change') || actionLower.includes('modify') || 
        actionLower.includes('update') || actionLower.includes('revise')) {
      impacts.push('Transition costs and temporary efficiency losses');
      impacts.push('Need for clear communication about changes');
    }
    
    if (actionLower.includes('restrict') || actionLower.includes('limit') || 
        actionLower.includes('reduce') || actionLower.includes('cut')) {
      impacts.push('Immediate limitations for affected stakeholders');
      impacts.push('Potential resistance or dissatisfaction');
    }
    
    // Domain-specific short-term impacts
    if (domainLower.includes('business') || domainLower.includes('finance') || 
        domainLower.includes('economic')) {
      impacts.push('Short-term financial costs for implementation');
      impacts.push('Potential market or customer reaction');
    }
    
    if (domainLower.includes('technology') || domainLower.includes('software') || 
        domainLower.includes('digital')) {
      impacts.push('Technical integration challenges');
      impacts.push('Potential system instability during transition');
    }
    
    if (domainLower.includes('policy') || domainLower.includes('regulation') || 
        domainLower.includes('compliance')) {
      impacts.push('Initial compliance costs and administrative burden');
      impacts.push('Need for monitoring and enforcement mechanisms');
    }
    
    if (domainLower.includes('healthcare') || domainLower.includes('medical') || 
        domainLower.includes('health')) {
      impacts.push('Potential disruption to ongoing care processes');
      impacts.push('Need for clinical validation and safety monitoring');
    }
    
    // Stakeholder-specific impacts
    for (const stakeholder of stakeholders) {
      const stakeholderLower = stakeholder.toLowerCase();
      
      if (stakeholderLower.includes('user') || stakeholderLower.includes('customer') || 
          stakeholderLower.includes('client')) {
        impacts.push(`Immediate changes to ${stakeholder} experience or services`);
      }
      
      if (stakeholderLower.includes('employee') || stakeholderLower.includes('worker') || 
          stakeholderLower.includes('staff')) {
        impacts.push(`Workflow adjustments for ${stakeholder}`);
      }
    }
    
    // Ensure a reasonable number of impacts
    return impacts.slice(0, 5);
  }

  /**
   * Identify potential long-term impacts of an action
   * 
   * @param action Action to assess
   * @param stakeholders Affected stakeholders
   * @param domain Domain context
   * @returns Array of long-term impacts
   */
  private identifyLongTermImpacts(
    action: string,
    stakeholders: string[],
    domain: string
  ): string[] {
    const impacts: string[] = [];
    const actionLower = action.toLowerCase();
    const domainLower = domain.toLowerCase();
    
    // Generic long-term impacts
    if (actionLower.includes('strategic') || actionLower.includes('long-term') || 
        actionLower.includes('transform') || actionLower.includes('fundamental')) {
      impacts.push('Structural changes to operating models or systems');
      impacts.push('Potential shifts in organizational culture or practices');
    }
    
    if (actionLower.includes('invest') || actionLower.includes('develop') || 
        actionLower.includes('build') || actionLower.includes('grow')) {
      impacts.push('Long-term resource commitments and maintenance requirements');
      impacts.push('Future expansion or scaling capabilities');
    }
    
    if (actionLower.includes('automate') || actionLower.includes('digital') || 
        actionLower.includes('technology') || actionLower.includes('ai')) {
      impacts.push('Evolving skill requirements and workforce adaptation');
      impacts.push('Dependency on technological infrastructure and updates');
    }
    
    // Domain-specific long-term impacts
    if (domainLower.includes('business') || domainLower.includes('finance') || 
        domainLower.includes('economic')) {
      impacts.push('Long-term competitive positioning and market share implications');
      impacts.push('Potential financial sustainability and return on investment');
    }
    
    if (domainLower.includes('environment') || domainLower.includes('sustain') || 
        domainLower.includes('climate')) {
      impacts.push('Long-term environmental footprint and resource usage');
      impacts.push('Alignment with future environmental regulations and standards');
    }
    
    if (domainLower.includes('social') || domainLower.includes('community') || 
        domainLower.includes('public')) {
      impacts.push('Long-term social license to operate and community relationships');
      impacts.push('Potential impacts on social cohesion and equity');
    }
    
    if (domainLower.includes('healthcare') || domainLower.includes('medical') || 
        domainLower.includes('health')) {
      impacts.push('Long-term health outcomes and quality of care implications');
      impacts.push('Adaptation to evolving medical practices and standards');
    }
    
    // Stakeholder-specific impacts
    for (const stakeholder of stakeholders) {
      const stakeholderLower = stakeholder.toLowerCase();
      
      if (stakeholderLower.includes('future') || stakeholderLower.includes('generation') || 
          stakeholderLower.includes('children')) {
        impacts.push(`Intergenerational effects on ${stakeholder}`);
      }
      
      if (stakeholderLower.includes('industry') || stakeholderLower.includes('sector') || 
          stakeholderLower.includes('market')) {
        impacts.push(`Structural changes to ${stakeholder} over time`);
      }
    }
    
    // Ensure a reasonable number of impacts
    return impacts.slice(0, 5);
  }

  /**
   * Generate recommendations based on impact assessment
   * 
   * @param action Action being assessed
   * @param overallImpact Overall impact assessment
   * @param stakeholderImpacts Impact on specific stakeholders
   * @param domain Domain context
   * @returns Array of recommendations
   */
  private generateImpactRecommendations(
    action: string,
    overallImpact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed',
    stakeholderImpacts: {[stakeholder: string]: {
      impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
      description: string;
      considerations: string[];
    }},
    domain: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Add general recommendations based on overall impact
    switch (overallImpact) {
      case 'Positive':
        recommendations.push('Continue with the planned action while monitoring for any unexpected negative effects');
        recommendations.push('Document positive outcomes to inform future similar decisions');
        break;
      
      case 'Neutral':
        recommendations.push('Proceed with the action while looking for opportunities to enhance positive impacts');
        recommendations.push('Implement monitoring mechanisms to ensure no unexpected negative impacts emerge');
        break;
      
      case 'Negative':
        recommendations.push('Reconsider the action or develop significant mitigation measures before proceeding');
        recommendations.push('Explore alternative approaches that could achieve similar goals with fewer negative impacts');
        break;
      
      case 'Mixed':
        recommendations.push('Implement targeted mitigation measures for identified negative impacts');
        recommendations.push('Enhance and expand positive impact aspects where possible');
        recommendations.push('Develop a balanced scorecard to track both positive and negative outcomes');
        break;
    }
    
    // Add stakeholder-specific recommendations
    for (const stakeholder in stakeholderImpacts) {
      const impact = stakeholderImpacts[stakeholder];
      
      if (impact.impact === 'Negative' || impact.impact === 'Mixed') {
        recommendations.push(`For ${stakeholder}: Develop specific mitigation strategies to address potential negative impacts`);
      }
      
      // Add one key consideration as a recommendation
      if (impact.considerations.length > 0) {
        recommendations.push(`For ${stakeholder}: ${impact.considerations[0]}`);
      }
    }
    
    // Add domain-specific recommendations
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('healthcare') || domainLower.includes('medical')) {
      recommendations.push('Ensure compliance with healthcare ethics principles and patient safety protocols');
    }
    
    if (domainLower.includes('technology') || domainLower.includes('software')) {
      recommendations.push('Address digital inclusion and accessibility requirements in implementation plans');
    }
    
    if (domainLower.includes('environment') || domainLower.includes('sustainability')) {
      recommendations.push('Establish environmental monitoring protocols to track long-term impacts');
    }
    
    // Ensure a reasonable number of recommendations
    return recommendations.slice(0, 5);
  }

  /**
   * Generate a summary of the impact assessment
   * 
   * @param action Action being assessed
   * @param overallImpact Overall impact assessment
   * @param stakeholderImpacts Impact on specific stakeholders
   * @param shortTermImpacts Short-term impacts identified
   * @param longTermImpacts Long-term impacts identified
   * @param domain Domain context
   * @returns Summary text
   */
  private generateImpactSummary(
    action: string,
    overallImpact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed',
    stakeholderImpacts: {[stakeholder: string]: {
      impact: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
      description: string;
      considerations: string[];
    }},
    shortTermImpacts: string[],
    longTermImpacts: string[],
    domain: string
  ): string {
    // Generate initial summary based on overall impact
    let summary = `The action to "${action}" in the ${domain} domain is assessed to have an overall ${overallImpact.toLowerCase()} impact. `;
    
    // Add stakeholder breakdown
    const stakeholders = Object.keys(stakeholderImpacts);
    
    if (stakeholders.length > 0) {
      summary += `The impact varies across ${stakeholders.length} stakeholder groups: `;
      
      // Count impacts by type
      const impactCounts = {
        'Positive': stakeholders.filter(s => stakeholderImpacts[s].impact === 'Positive').length,
        'Neutral': stakeholders.filter(s => stakeholderImpacts[s].impact === 'Neutral').length,
        'Negative': stakeholders.filter(s => stakeholderImpacts[s].impact === 'Negative').length,
        'Mixed': stakeholders.filter(s => stakeholderImpacts[s].impact === 'Mixed').length
      };
      
      // Add impact breakdown
      summary += `${impactCounts['Positive']} positive, ${impactCounts['Negative']} negative, `;
      summary += `${impactCounts['Mixed']} mixed, and ${impactCounts['Neutral']} neutral impacts. `;
      
      // Highlight most impacted stakeholders
      const negativelyImpacted = stakeholders.filter(s => stakeholderImpacts[s].impact === 'Negative');
      if (negativelyImpacted.length > 0) {
        if (negativelyImpacted.length <= 2) {
          summary += `${negativelyImpacted.join(' and ')} would be most negatively affected. `;
        } else {
          summary += `${negativelyImpacted.length} stakeholders would be negatively affected. `;
        }
      }
      
      const positivelyImpacted = stakeholders.filter(s => stakeholderImpacts[s].impact === 'Positive');
      if (positivelyImpacted.length > 0) {
        if (positivelyImpacted.length <= 2) {
          summary += `${positivelyImpacted.join(' and ')} would receive the most benefits. `;
        } else {
          summary += `${positivelyImpacted.length} stakeholders would receive positive benefits. `;
        }
      }
    }
    
    // Add temporal dimension
    summary += 'The impact assessment identified both short-term and long-term considerations. ';
    
    if (shortTermImpacts.length > 0) {
      summary += `In the near term, key impacts include ${shortTermImpacts[0]}`;
      if (shortTermImpacts.length > 1) {
        summary += ` and ${shortTermImpacts[1]}`;
      }
      summary += '. ';
    }
    
    if (longTermImpacts.length > 0) {
      summary += `Over the longer term, significant considerations include ${longTermImpacts[0]}`;
      if (longTermImpacts.length > 1) {
        summary += ` and ${longTermImpacts[1]}`;
      }
      summary += '. ';
    }
    
    // Add domain-specific conclusion
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('healthcare') || domainLower.includes('medical')) {
      summary += 'In healthcare contexts, patient outcomes and care quality should remain the primary considerations. ';
    }
    
    if (domainLower.includes('environment') || domainLower.includes('sustainability')) {
      summary += 'Environmental impacts should be monitored over time to ensure sustainability goals are met. ';
    }
    
    if (domainLower.includes('technology') || domainLower.includes('digital')) {
      summary += 'In technology contexts, ensuring equitable access and managing digital divides remain ongoing concerns. ';
    }
    
    // Final recommendation
    switch (overallImpact) {
      case 'Positive':
        summary += 'Based on this assessment, the action appears worthwhile to pursue with appropriate monitoring.';
        break;
      
      case 'Neutral':
        summary += 'Based on this assessment, the action can proceed but should be monitored for emerging impacts.';
        break;
      
      case 'Negative':
        summary += 'Based on this assessment, the action should be reconsidered or substantially modified before proceeding.';
        break;
      
      case 'Mixed':
        summary += 'Based on this assessment, the action should proceed with caution, implementing mitigation measures for negative impacts.';
        break;
    }
    
    return summary;
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

export default EthicalFramework;