/**
 * Decision Support Module
 * 
 * This module provides tools for analyzing options, assessing risks,
 * and making structured decisions based on multiple criteria.
 */

import { KnowledgeBaseService } from '../knowledge/service.js';

/**
 * Option evaluation result
 */
export interface OptionEvaluation {
  option: string;
  score: number;
  criteriaScores: {[criterion: string]: number};
  strengths: string[];
  weaknesses: string[];
  notes: string;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
  identifiedRisks: Array<{
    description: string;
    probability: number;
    impact: number;
    mitigation?: string;
  }>;
  overallSummary: string;
}

/**
 * Decision support system class
 */
export class DecisionSupport {
  private knowledgeService: KnowledgeBaseService;

  constructor(knowledgeService?: KnowledgeBaseService) {
    this.knowledgeService = knowledgeService || new KnowledgeBaseService();
  }

  /**
   * Analyzes and compares multiple options based on given criteria
   * 
   * @param options Array of decision options to analyze
   * @param criteria Array of criteria to evaluate against
   * @param context Decision context
   * @returns Analysis of options with scores and recommendations
   */
  async analyzeOptions(
    options: string[],
    criteria: string[],
    context: string
  ): Promise<{
    rankedOptions: OptionEvaluation[];
    recommendation: string;
    justification: string;
    alternativeRecommendation?: string;
  }> {
    try {
      console.log(`[DecisionSupport] Analyzing ${options.length} options against ${criteria.length} criteria in context: ${context}`);
      
      // Evaluate each option against each criterion
      const evaluations: OptionEvaluation[] = [];
      
      // Set up criteria weights - can be enhanced with domain-specific weighting
      // Default to equal weights
      const criteriaWeights: {[criterion: string]: number} = {};
      criteria.forEach(criterion => {
        // Assign weights based on common importance patterns
        // This is a simplified approach; could be expanded with domain knowledge
        if (criterion.toLowerCase().includes('security') || 
            criterion.toLowerCase().includes('safety') ||
            criterion.toLowerCase().includes('critical')) {
          criteriaWeights[criterion] = 1.5; // Higher weight for security/safety concerns
        } 
        else if (criterion.toLowerCase().includes('cost') || 
                criterion.toLowerCase().includes('performance') ||
                criterion.toLowerCase().includes('efficiency')) {
          criteriaWeights[criterion] = 1.2; // Medium-high weight for cost/performance
        }
        else {
          criteriaWeights[criterion] = 1.0; // Default weight
        }
      });
      
      // Normalize weights
      const totalWeight = Object.values(criteriaWeights).reduce((sum, weight) => sum + weight, 0);
      for (const criterion in criteriaWeights) {
        criteriaWeights[criterion] = criteriaWeights[criterion] / totalWeight * criteria.length;
      }
      
      // Domain-specific evaluation factors
      // This could be extended with more domains and factors
      const domainFactors: {[domain: string]: {[option: string]: {[criterion: string]: number}}} = {
        'frontend framework selection': {
          'react': {
            'performance': 0.8,
            'developer experience': 0.9,
            'community support': 0.95,
            'ecosystem': 0.9,
            'learning curve': 0.7
          },
          'angular': {
            'performance': 0.7,
            'developer experience': 0.75,
            'community support': 0.8,
            'ecosystem': 0.85,
            'learning curve': 0.5
          },
          'vue': {
            'performance': 0.85,
            'developer experience': 0.85,
            'community support': 0.75,
            'ecosystem': 0.7,
            'learning curve': 0.8
          }
        },
        'database selection': {
          'postgresql': {
            'performance': 0.85,
            'scalability': 0.8,
            'reliability': 0.9,
            'feature set': 0.9,
            'community support': 0.85
          },
          'mongodb': {
            'performance': 0.9,
            'scalability': 0.85,
            'reliability': 0.8,
            'feature set': 0.75,
            'community support': 0.8
          },
          'mysql': {
            'performance': 0.8,
            'scalability': 0.75,
            'reliability': 0.85,
            'feature set': 0.8,
            'community support': 0.9
          }
        }
      };
      
      // Evaluate each option
      for (const option of options) {
        const criteriaScores: {[criterion: string]: number} = {};
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        
        // Evaluate each criterion
        for (const criterion of criteria) {
          let score: number;
          
          // Check if we have domain-specific data
          const lowercaseContext = context.toLowerCase();
          const lowercaseOption = option.toLowerCase();
          const lowerCaseCriterion = criterion.toLowerCase();
          
          if (Object.keys(domainFactors).some(domain => lowercaseContext.includes(domain)) &&
              Object.keys(domainFactors[Object.keys(domainFactors).find(domain => 
                lowercaseContext.includes(domain)) as string]).some(opt => 
                  lowercaseOption.includes(opt)) &&
              Object.keys(domainFactors[Object.keys(domainFactors).find(domain => 
                lowercaseContext.includes(domain)) as string]
                [Object.keys(domainFactors[Object.keys(domainFactors).find(domain => 
                  lowercaseContext.includes(domain)) as string]).find(opt => 
                    lowercaseOption.includes(opt)) as string]).some(crit => 
                      lowerCaseCriterion.includes(crit))) {
            
            // Get the domain, option, and criterion keys that match our input
            const domainKey = Object.keys(domainFactors).find(domain => 
              lowercaseContext.includes(domain)) as string;
              
            const optionKey = Object.keys(domainFactors[domainKey]).find(opt => 
              lowercaseOption.includes(opt)) as string;
              
            const criterionKey = Object.keys(domainFactors[domainKey][optionKey]).find(crit => 
              lowerCaseCriterion.includes(crit)) as string;
            
            // Use domain-specific score
            score = domainFactors[domainKey][optionKey][criterionKey];
          } else {
            // Use heuristic scoring based on option and criterion relationship
            score = this.heuristicScore(option, criterion);
          }
          
          criteriaScores[criterion] = score;
          
          // Identify strengths and weaknesses
          if (score >= 0.8) {
            strengths.push(`Strong ${criterion} capability`);
          } else if (score <= 0.5) {
            weaknesses.push(`Weak ${criterion} capability`);
          }
        }
        
        // Calculate weighted average score
        let totalScore = 0;
        for (const criterion in criteriaScores) {
          totalScore += criteriaScores[criterion] * criteriaWeights[criterion];
        }
        const finalScore = totalScore / criteria.length;
        
        // Generate notes about the option
        const notes = this.generateOptionNotes(option, context, strengths, weaknesses);
        
        // Add evaluation to list
        evaluations.push({
          option,
          score: finalScore,
          criteriaScores,
          strengths,
          weaknesses,
          notes
        });
      }
      
      // Rank options by score
      const rankedOptions = evaluations.sort((a, b) => b.score - a.score);
      
      // Generate recommendation
      let recommendation = '';
      let justification = '';
      let alternativeRecommendation = '';
      
      if (rankedOptions.length > 0) {
        const topOption = rankedOptions[0];
        
        // Generate recommendation based on top option
        recommendation = `${topOption.option} is recommended for ${context}`;
        
        // Generate justification based on strengths
        if (topOption.strengths.length > 0) {
          justification = `${topOption.option} is recommended because it ${topOption.strengths.join(' and ')}`;
        } else {
          justification = `${topOption.option} is recommended based on overall performance across the evaluated criteria`;
        }
        
        // Suggest alternative if scores are close
        if (rankedOptions.length > 1 && 
            (rankedOptions[0].score - rankedOptions[1].score) < 0.1) {
          alternativeRecommendation = `${rankedOptions[1].option} is a viable alternative with similar overall performance`;
        }
      }
      
      return {
        rankedOptions,
        recommendation,
        justification,
        alternativeRecommendation: alternativeRecommendation || undefined
      };
    } catch (error) {
      console.error('[DecisionSupport] Error analyzing options:', error);
      return {
        rankedOptions: options.map(option => ({
          option,
          score: 0.5,
          criteriaScores: criteria.reduce((acc, criterion) => ({...acc, [criterion]: 0.5}), {}),
          strengths: [],
          weaknesses: ['Analysis failed due to an error'],
          notes: `Error during analysis: ${error instanceof Error ? error.message : String(error)}`
        })),
        recommendation: 'Unable to provide a recommendation due to an error in analysis',
        justification: 'Analysis process encountered an error'
      };
    }
  }

  /**
   * Assesses risks for a given scenario
   * 
   * @param scenario Risk scenario description
   * @param domain Domain context for risk assessment
   * @param factors Optional array of risk factors to consider
   * @returns Risk assessment with identified risks and overall rating
   */
  async assessRisks(
    scenario: string,
    domain: string,
    factors: string[] = []
  ): Promise<RiskAssessment> {
    try {
      console.log(`[DecisionSupport] Assessing risks for scenario: '${scenario}' in domain '${domain}'`);
      
      // Domain-specific risk factors
      const domainRisks: {[domain: string]: Array<{
        pattern: string;
        risk: string;
        probability: number;
        impact: number;
        mitigation?: string;
      }>} = {
        'software development': [
          {
            pattern: 'deadline',
            risk: 'Schedule overrun risk',
            probability: 0.7,
            impact: 0.6,
            mitigation: 'Implement agile methodologies with regular progress tracking'
          },
          {
            pattern: 'budget',
            risk: 'Budget exceedance risk',
            probability: 0.6,
            impact: 0.7,
            mitigation: 'Establish clear financial controls and regular budget reviews'
          },
          {
            pattern: 'requirements',
            risk: 'Scope creep risk',
            probability: 0.8,
            impact: 0.7,
            mitigation: 'Implement formal change management processes'
          },
          {
            pattern: 'integration',
            risk: 'System integration failure risk',
            probability: 0.5,
            impact: 0.8,
            mitigation: 'Conduct thorough integration testing and establish clear API contracts'
          },
          {
            pattern: 'security',
            risk: 'Data security breach risk',
            probability: 0.4,
            impact: 0.9,
            mitigation: 'Implement security testing and regular vulnerability assessments'
          }
        ],
        'infrastructure': [
          {
            pattern: 'downtime',
            risk: 'Service availability risk',
            probability: 0.5,
            impact: 0.8,
            mitigation: 'Implement redundancy and automated failover systems'
          },
          {
            pattern: 'capacity',
            risk: 'Capacity constraints risk',
            probability: 0.6,
            impact: 0.7,
            mitigation: 'Establish capacity planning and monitoring processes'
          },
          {
            pattern: 'disaster',
            risk: 'Disaster recovery risk',
            probability: 0.3,
            impact: 0.9,
            mitigation: 'Implement comprehensive disaster recovery plan and regular testing'
          },
          {
            pattern: 'compliance',
            risk: 'Regulatory compliance risk',
            probability: 0.5,
            impact: 0.8,
            mitigation: 'Conduct regular compliance audits and maintain documentation'
          }
        ],
        'project management': [
          {
            pattern: 'stakeholder',
            risk: 'Stakeholder alignment risk',
            probability: 0.7,
            impact: 0.6,
            mitigation: 'Establish regular stakeholder communication and feedback channels'
          },
          {
            pattern: 'resource',
            risk: 'Resource availability risk',
            probability: 0.6,
            impact: 0.7,
            mitigation: 'Implement resource planning and backup strategies'
          },
          {
            pattern: 'quality',
            risk: 'Quality assurance risk',
            probability: 0.5,
            impact: 0.7,
            mitigation: 'Establish quality standards and implement testing procedures'
          },
          {
            pattern: 'communication',
            risk: 'Communication breakdown risk',
            probability: 0.6,
            impact: 0.6,
            mitigation: 'Implement communication plans and regular status updates'
          }
        ]
      };
      
      // Identify risks based on scenario, domain, and factors
      const identifiedRisks: Array<{
        description: string;
        probability: number;
        impact: number;
        mitigation?: string;
      }> = [];
      
      // Check for domain-specific risks
      const lowercaseDomain = domain.toLowerCase();
      const lowercaseScenario = scenario.toLowerCase();
      
      let domainKey = '';
      
      // Find the matching domain
      for (const key in domainRisks) {
        if (lowercaseDomain.includes(key)) {
          domainKey = key;
          break;
        }
      }
      
      if (domainKey) {
        // Look for domain-specific risks
        domainRisks[domainKey].forEach(riskItem => {
          if (lowercaseScenario.includes(riskItem.pattern)) {
            identifiedRisks.push({
              description: riskItem.risk,
              probability: riskItem.probability,
              impact: riskItem.impact,
              mitigation: riskItem.mitigation
            });
          }
        });
      }
      
      // Consider additional factors
      factors.forEach(factor => {
        const lowerFactor = factor.toLowerCase();
        
        // Generic risks based on common factors
        if (lowerFactor.includes('time') || lowerFactor.includes('schedule')) {
          identifiedRisks.push({
            description: 'Time constraint risk',
            probability: 0.7,
            impact: 0.6,
            mitigation: 'Implement time management strategies and buffer periods'
          });
        }
        
        if (lowerFactor.includes('cost') || lowerFactor.includes('budget')) {
          identifiedRisks.push({
            description: 'Cost overrun risk',
            probability: 0.6,
            impact: 0.7,
            mitigation: 'Implement cost control measures and regular financial reviews'
          });
        }
        
        if (lowerFactor.includes('quality') || lowerFactor.includes('standard')) {
          identifiedRisks.push({
            description: 'Quality deficiency risk',
            probability: 0.5,
            impact: 0.7,
            mitigation: 'Implement quality assurance processes and standards compliance'
          });
        }
        
        if (lowerFactor.includes('technology') || lowerFactor.includes('technical')) {
          identifiedRisks.push({
            description: 'Technical feasibility risk',
            probability: 0.5,
            impact: 0.8,
            mitigation: 'Conduct technical proof-of-concept and establish fallback options'
          });
        }
      });
      
      // Default risk if none identified
      if (identifiedRisks.length === 0) {
        identifiedRisks.push({
          description: 'Generic project risk',
          probability: 0.5,
          impact: 0.5,
          mitigation: 'Implement standard risk management procedures'
        });
      }
      
      // Calculate overall risk score (weighted average of probability and impact)
      const riskScores = identifiedRisks.map(risk => risk.probability * risk.impact);
      const overallRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
      
      // Determine risk level
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
      
      if (overallRiskScore < 0.3) {
        riskLevel = 'Low';
      } else if (overallRiskScore < 0.5) {
        riskLevel = 'Medium';
      } else if (overallRiskScore < 0.7) {
        riskLevel = 'High';
      } else {
        riskLevel = 'Critical';
      }
      
      // Generate overall summary
      const overallSummary = this.generateRiskSummary(riskLevel, identifiedRisks, scenario, domain);
      
      return {
        riskLevel,
        riskScore: overallRiskScore,
        identifiedRisks,
        overallSummary
      };
    } catch (error) {
      console.error('[DecisionSupport] Error assessing risks:', error);
      return {
        riskLevel: 'Medium',
        riskScore: 0.5,
        identifiedRisks: [{
          description: 'Error in risk assessment process',
          probability: 0.5,
          impact: 0.5
        }],
        overallSummary: `Unable to properly assess risks due to an error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Analyzes trade-offs between different options based on their strengths and weaknesses
   * 
   * @param options Array of options to analyze
   * @param strengths Object mapping options to their strengths
   * @param weaknesses Object mapping options to their weaknesses
   * @param priorityFactors Optional factors to prioritize in the analysis
   * @returns Analysis of trade-offs and recommended approach
   */
  async analyzeTradeoffs(
    options: string[],
    strengths: {[option: string]: string[]},
    weaknesses: {[option: string]: string[]},
    priorityFactors: string[] = []
  ): Promise<{
    tradeoffs: {[option: string]: {gives: string[], costs: string[]}};
    recommendation: string;
    reasoning: string;
  }> {
    try {
      const tradeoffs: {[option: string]: {gives: string[], costs: string[]}} = {};
      
      // Analyze each option
      for (const option of options) {
        const gives = strengths[option] || [];
        const costs = weaknesses[option] || [];
        
        tradeoffs[option] = { gives, costs };
      }
      
      // Determine best option based on prioritization
      let bestOption = '';
      let bestScore = -1;
      
      for (const option of options) {
        let score = 0;
        
        // Base score: strengths minus weaknesses
        score += (strengths[option]?.length || 0) - (weaknesses[option]?.length || 0);
        
        // Priority boost: add points for matching priority factors
        for (const factor of priorityFactors) {
          const factorLower = factor.toLowerCase();
          
          // Check if any strengths match this factor
          for (const strength of (strengths[option] || [])) {
            if (strength.toLowerCase().includes(factorLower)) {
              score += 2; // Bonus for matching priority in strengths
              break;
            }
          }
          
          // Penalty if any weaknesses match this factor
          for (const weakness of (weaknesses[option] || [])) {
            if (weakness.toLowerCase().includes(factorLower)) {
              score -= 3; // Higher penalty for matching priority in weaknesses
              break;
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestOption = option;
        }
      }
      
      // Generate recommendation and reasoning
      let recommendation = '';
      let reasoning = '';
      
      if (bestOption) {
        recommendation = `${bestOption} provides the best balance of benefits and costs`;
        
        // Generate reasoning
        const gives = tradeoffs[bestOption].gives;
        const costs = tradeoffs[bestOption].costs;
        
        if (gives.length > 0) {
          reasoning = `${bestOption} was selected because it provides ${gives.join(', ')}`;
          
          if (costs.length > 0) {
            reasoning += `, despite ${costs.join(', ')}`;
          }
          
          reasoning += '.';
        } else {
          reasoning = `${bestOption} was selected as it has the best overall balance of factors.`;
        }
        
        // Add information about priority factors
        if (priorityFactors.length > 0) {
          reasoning += ` The decision prioritized ${priorityFactors.join(', ')}.`;
        }
      } else {
        recommendation = 'No clear recommendation available';
        reasoning = 'Unable to determine a clear recommendation based on the provided information.';
      }
      
      return {
        tradeoffs,
        recommendation,
        reasoning
      };
    } catch (error) {
      console.error('[DecisionSupport] Error analyzing tradeoffs:', error);
      return {
        tradeoffs: options.reduce((acc, option) => ({
          ...acc,
          [option]: { gives: [], costs: ['Analysis error'] }
        }), {}),
        recommendation: 'Unable to provide a recommendation due to an error',
        reasoning: `Error during tradeoff analysis: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Scores an option against a criterion based on heuristic analysis
   * 
   * @param option Option to evaluate
   * @param criterion Criterion to evaluate against
   * @returns Score between 0 and 1
   */
  private heuristicScore(option: string, criterion: string): number {
    // Convert to lowercase for case-insensitive matching
    const optionLower = option.toLowerCase();
    const criterionLower = criterion.toLowerCase();
    
    // Default score
    let score = 0.5;
    
    // Domain-specific heuristics
    // Framework heuristics
    if (optionLower.includes('react')) {
      if (criterionLower.includes('performance')) score = 0.8;
      if (criterionLower.includes('ecosystem')) score = 0.9;
      if (criterionLower.includes('community')) score = 0.9;
      if (criterionLower.includes('learning')) score = 0.7;
    }
    
    if (optionLower.includes('angular')) {
      if (criterionLower.includes('performance')) score = 0.7;
      if (criterionLower.includes('enterprise')) score = 0.9;
      if (criterionLower.includes('structure')) score = 0.9;
      if (criterionLower.includes('learning')) score = 0.5;
    }
    
    if (optionLower.includes('vue')) {
      if (criterionLower.includes('performance')) score = 0.8;
      if (criterionLower.includes('learning')) score = 0.9;
      if (criterionLower.includes('flexibility')) score = 0.8;
      if (criterionLower.includes('ecosystem')) score = 0.7;
    }
    
    // Database heuristics
    if (optionLower.includes('sql') || optionLower.includes('postgres') || optionLower.includes('mysql')) {
      if (criterionLower.includes('reliability')) score = 0.9;
      if (criterionLower.includes('transaction')) score = 0.9;
      if (criterionLower.includes('consistency')) score = 0.9;
      if (criterionLower.includes('flexibility')) score = 0.6;
    }
    
    if (optionLower.includes('mongo') || optionLower.includes('nosql')) {
      if (criterionLower.includes('flexibility')) score = 0.9;
      if (criterionLower.includes('scalability')) score = 0.8;
      if (criterionLower.includes('rapid')) score = 0.8;
      if (criterionLower.includes('consistency')) score = 0.6;
    }
    
    // Add slight randomness to simulate complex factors
    score += (Math.random() * 0.1) - 0.05;
    
    // Ensure score is in valid range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generates notes about an option based on its evaluation
   * 
   * @param option Option name
   * @param context Decision context
   * @param strengths Identified strengths
   * @param weaknesses Identified weaknesses
   * @returns Generated notes as string
   */
  private generateOptionNotes(
    option: string,
    context: string,
    strengths: string[],
    weaknesses: string[]
  ): string {
    let notes = `${option} is `;
    
    if (strengths.length > 0 && weaknesses.length > 0) {
      notes += `a balanced choice that offers ${strengths.join(', ')}`;
      notes += ` but faces challenges with ${weaknesses.join(', ')}`;
    } else if (strengths.length > 0) {
      notes += `a strong choice primarily because it ${strengths.join(', ')}`;
    } else if (weaknesses.length > 0) {
      notes += `a challenging choice due to ${weaknesses.join(', ')}`;
    } else {
      notes += `a middle-ground option with no pronounced strengths or weaknesses for this ${context}`;
    }
    
    return notes;
  }

  /**
   * Generates a summary of risk assessment
   * 
   * @param riskLevel Overall risk level
   * @param risks Identified risks
   * @param scenario Risk scenario
   * @param domain Domain context
   * @returns Generated summary as string
   */
  private generateRiskSummary(
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical',
    risks: Array<{description: string; probability: number; impact: number; mitigation?: string}>,
    scenario: string,
    domain: string
  ): string {
    let summary = `The overall risk level for "${scenario}" in the ${domain} domain is ${riskLevel.toUpperCase()}. `;
    
    // Highlight highest risk
    const highestRisk = [...risks].sort((a, b) => 
      (b.probability * b.impact) - (a.probability * a.impact))[0];
    
    if (highestRisk) {
      summary += `The most significant risk identified is "${highestRisk.description}" `;
      summary += `with a probability of ${Math.round(highestRisk.probability * 100)}% and impact rating of ${Math.round(highestRisk.impact * 100)}%. `;
      
      if (highestRisk.mitigation) {
        summary += `Recommended mitigation: ${highestRisk.mitigation}. `;
      }
    }
    
    // Add general recommendation based on risk level
    switch (riskLevel) {
      case 'Low':
        summary += 'Standard monitoring procedures are recommended.';
        break;
      case 'Medium':
        summary += 'Regular monitoring and basic mitigation planning is recommended.';
        break;
      case 'High':
        summary += 'Active risk management with dedicated mitigation plans is strongly recommended.';
        break;
      case 'Critical':
        summary += 'Immediate attention and comprehensive risk mitigation strategies are essential.';
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

export default DecisionSupport;