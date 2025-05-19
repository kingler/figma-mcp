import {
  CodeAnalysis,
  DBAnalysis,
  ImpactAnalysis,
  ComponentImpact,
  RiskReport,
  TableInfo,
  FunctionInfo,
  PolicyInfo,
} from '../types/analysis.js';

export class ImpactAnalyzer {
  /**
   * Analyzes the potential impact of database changes
   */
  async analyzeImpact(
    codeAnalysis: CodeAnalysis,
    dbAnalysis: DBAnalysis,
    changes: {
      tables?: { name: string; schema?: string; operation: 'CREATE' | 'ALTER' | 'DROP' }[];
      columns?: { table: string; schema?: string; name: string; operation: 'ADD' | 'ALTER' | 'DROP' }[];
      constraints?: { table: string; schema?: string; name: string; operation: 'ADD' | 'DROP' }[];
      indexes?: { table: string; schema?: string; name: string; operation: 'CREATE' | 'DROP' }[];
    }
  ): Promise<ImpactAnalysis> {
    const directImpact: ComponentImpact[] = [];
    const indirectImpact: ComponentImpact[] = [];

    // Analyze table changes
    if (changes.tables) {
      for (const change of changes.tables) {
        const impacts = await this.analyzeTableChange(
          change,
          codeAnalysis,
          dbAnalysis
        );
        directImpact.push(...impacts.direct);
        indirectImpact.push(...impacts.indirect);
      }
    }

    // Analyze column changes
    if (changes.columns) {
      for (const change of changes.columns) {
        const impacts = await this.analyzeColumnChange(
          change,
          codeAnalysis,
          dbAnalysis
        );
        directImpact.push(...impacts.direct);
        indirectImpact.push(...impacts.indirect);
      }
    }

    // Analyze constraint changes
    if (changes.constraints) {
      for (const change of changes.constraints) {
        const impacts = await this.analyzeConstraintChange(
          change,
          codeAnalysis,
          dbAnalysis
        );
        directImpact.push(...impacts.direct);
        indirectImpact.push(...impacts.indirect);
      }
    }

    // Analyze index changes
    if (changes.indexes) {
      for (const change of changes.indexes) {
        const impacts = await this.analyzeIndexChange(
          change,
          codeAnalysis,
          dbAnalysis
        );
        directImpact.push(...impacts.direct);
        indirectImpact.push(...impacts.indirect);
      }
    }

    // Generate risk assessment
    const riskReport = this.generateRiskReport(
      directImpact,
      indirectImpact,
      dbAnalysis
    );

    return {
      directImpact,
      indirectImpact,
      riskAssessment: riskReport,
    };
  }

  /**
   * Analyzes the impact of table changes
   */
  private async analyzeTableChange(
    change: { name: string; schema?: string; operation: 'CREATE' | 'ALTER' | 'DROP' },
    codeAnalysis: CodeAnalysis,
    dbAnalysis: DBAnalysis
  ): Promise<{ direct: ComponentImpact[]; indirect: ComponentImpact[] }> {
    const direct: ComponentImpact[] = [];
    const indirect: ComponentImpact[] = [];
    const schema = change.schema || 'public';
    const tableName = `${schema}.${change.name}`;

    // Analyze direct impacts
    if (change.operation === 'DROP') {
      // Check for dependent tables (foreign keys)
      const dependentTables = this.findDependentTables(tableName, codeAnalysis);
      for (const depTable of dependentTables) {
        direct.push({
          component: depTable,
          type: 'TABLE',
          impact: 'HIGH',
          description: `Foreign key dependency on table ${change.name}`,
          mitigationSteps: [
            'Update or remove foreign key constraints',
            'Update application logic to handle missing references',
          ],
        });
      }

      // Check for dependent functions
      const dependentFunctions = this.findDependentFunctions(tableName, codeAnalysis);
      for (const func of dependentFunctions) {
        direct.push({
          component: func,
          type: 'FUNCTION',
          impact: 'HIGH',
          description: `Function references table ${change.name}`,
          mitigationSteps: [
            'Update function logic to handle table removal',
            'Consider creating replacement functions',
          ],
        });
      }

      // Check for security policies
      const affectedPolicies = this.findAffectedPolicies(tableName, codeAnalysis);
      for (const policy of affectedPolicies) {
        direct.push({
          component: policy,
          type: 'POLICY',
          impact: 'HIGH',
          description: `Security policy depends on table ${change.name}`,
          mitigationSteps: [
            'Remove or update security policies',
            'Review security implications',
          ],
        });
      }
    }

    // Analyze indirect impacts
    if (change.operation === 'DROP' || change.operation === 'ALTER') {
      // Check for query patterns that might be affected
      const affectedQueries = this.findAffectedQueries(tableName, dbAnalysis);
      for (const query of affectedQueries) {
        indirect.push({
          component: query,
          type: 'TABLE',
          impact: 'MEDIUM',
          description: 'Query pattern may need updates',
          mitigationSteps: [
            'Review and update affected queries',
            'Update application code using these queries',
          ],
        });
      }

      // Check for performance implications
      if (dbAnalysis.metrics.performance.tableMetrics[tableName]) {
        const metrics = dbAnalysis.metrics.performance.tableMetrics[tableName];
        if (metrics.rowCount > 10000) {
          indirect.push({
            component: tableName,
            type: 'TABLE',
            impact: 'MEDIUM',
            description: 'High-traffic table modifications may impact performance',
            mitigationSteps: [
              'Consider performing changes during off-peak hours',
              'Plan for potential performance degradation',
            ],
          });
        }
      }
    }

    return { direct, indirect };
  }

  /**
   * Analyzes the impact of column changes
   */
  private async analyzeColumnChange(
    change: { table: string; schema?: string; name: string; operation: 'ADD' | 'ALTER' | 'DROP' },
    codeAnalysis: CodeAnalysis,
    dbAnalysis: DBAnalysis
  ): Promise<{ direct: ComponentImpact[]; indirect: ComponentImpact[] }> {
    const direct: ComponentImpact[] = [];
    const indirect: ComponentImpact[] = [];
    const schema = change.schema || 'public';
    const tableName = `${schema}.${change.table}`;

    if (change.operation === 'DROP' || change.operation === 'ALTER') {
      // Check for column usage in functions
      const affectedFunctions = this.findFunctionsUsingColumn(
        tableName,
        change.name,
        codeAnalysis
      );
      for (const func of affectedFunctions) {
        direct.push({
          component: func,
          type: 'FUNCTION',
          impact: 'HIGH',
          description: `Function uses column ${change.name}`,
          mitigationSteps: [
            'Update function to handle column changes',
            'Review function logic for compatibility',
          ],
        });
      }

      // Check for column usage in constraints
      const affectedConstraints = this.findConstraintsUsingColumn(
        tableName,
        change.name,
        dbAnalysis
      );
      for (const constraint of affectedConstraints) {
        direct.push({
          component: constraint,
          type: 'TABLE',
          impact: 'HIGH',
          description: `Constraint depends on column ${change.name}`,
          mitigationSteps: [
            'Update or remove affected constraints',
            'Review data integrity implications',
          ],
        });
      }
    }

    // Check for performance implications
    if (change.operation === 'ALTER') {
      const table = dbAnalysis.currentState.tables.find(
        t => t.schema === schema && t.name === change.table
      );
      if (table && table.rowCount > 10000) {
        indirect.push({
          component: tableName,
          type: 'TABLE',
          impact: 'MEDIUM',
          description: 'Column modification on large table may impact performance',
          mitigationSteps: [
            'Consider breaking change into smaller batches',
            'Plan for table lock duration',
          ],
        });
      }
    }

    return { direct, indirect };
  }

  /**
   * Analyzes the impact of constraint changes
   */
  private async analyzeConstraintChange(
    change: { table: string; schema?: string; name: string; operation: 'ADD' | 'DROP' },
    codeAnalysis: CodeAnalysis,
    dbAnalysis: DBAnalysis
  ): Promise<{ direct: ComponentImpact[]; indirect: ComponentImpact[] }> {
    const direct: ComponentImpact[] = [];
    const indirect: ComponentImpact[] = [];
    const schema = change.schema || 'public';
    const tableName = `${schema}.${change.table}`;

    // Find the constraint details
    const table = dbAnalysis.currentState.tables.find(
      t => t.schema === schema && t.name === change.table
    );
    const constraint = table?.constraints.find(c => c.name === change.name);

    if (constraint) {
      if (change.operation === 'DROP') {
        direct.push({
          component: tableName,
          type: 'TABLE',
          impact: 'HIGH',
          description: `Removing ${constraint.type} constraint may affect data integrity`,
          mitigationSteps: [
            'Review data integrity implications',
            'Update application validation logic',
          ],
        });

        if (constraint.type === 'FOREIGN KEY') {
          // Check for cascade effects
          const relationships = dbAnalysis.currentState.relationships.filter(
            r => r.constraintName === change.name
          );
          for (const rel of relationships) {
            indirect.push({
              component: `${rel.toSchema}.${rel.toTable}`,
              type: 'TABLE',
              impact: 'MEDIUM',
              description: 'Referenced table may need additional validation logic',
              mitigationSteps: [
                'Review referential integrity implications',
                'Add application-level validation if needed',
              ],
            });
          }
        }
      }
    }

    return { direct, indirect };
  }

  /**
   * Analyzes the impact of index changes
   */
  private async analyzeIndexChange(
    change: { table: string; schema?: string; name: string; operation: 'CREATE' | 'DROP' },
    codeAnalysis: CodeAnalysis,
    dbAnalysis: DBAnalysis
  ): Promise<{ direct: ComponentImpact[]; indirect: ComponentImpact[] }> {
    const direct: ComponentImpact[] = [];
    const indirect: ComponentImpact[] = [];
    const schema = change.schema || 'public';
    const tableName = `${schema}.${change.table}`;

    if (change.operation === 'DROP') {
      // Check index usage statistics
      const tableMetrics = dbAnalysis.metrics.performance.tableMetrics[tableName];
      if (tableMetrics?.indexUsage[change.name]) {
        const usage = tableMetrics.indexUsage[change.name];
        if (usage.scans > 1000) {
          direct.push({
            component: tableName,
            type: 'INDEX',
            impact: 'HIGH',
            description: 'Frequently used index will be removed',
            mitigationSteps: [
              'Review query performance implications',
              'Consider creating replacement index',
              'Update queries to use alternative indexes',
            ],
          });
        }
      }

      // Check for unique constraints implemented as indexes
      const table = dbAnalysis.currentState.tables.find(
        t => t.schema === schema && t.name === change.table
      );
      const index = table?.indexes.find(i => i.name === change.name);
      if (index?.isUnique) {
        indirect.push({
          component: tableName,
          type: 'TABLE',
          impact: 'HIGH',
          description: 'Removing unique index may affect data integrity',
          mitigationSteps: [
            'Review uniqueness requirements',
            'Add application-level validation if needed',
          ],
        });
      }
    }

    return { direct, indirect };
  }

  /**
   * Finds tables that depend on the given table
   */
  private findDependentTables(tableName: string, analysis: CodeAnalysis): string[] {
    const dependents: string[] = [];
    const deps = analysis.dependencies[tableName];
    if (deps) {
      dependents.push(...deps.dependents);
    }
    return dependents;
  }

  /**
   * Finds functions that reference the given table
   */
  private findDependentFunctions(tableName: string, analysis: CodeAnalysis): string[] {
    return analysis.functions
      .filter(f => f.source.toLowerCase().includes(tableName.toLowerCase()))
      .map(f => `${f.schema}.${f.name}`);
  }

  /**
   * Finds security policies that depend on the given table
   */
  private findAffectedPolicies(tableName: string, analysis: CodeAnalysis): string[] {
    return analysis.securityPolicies
      .filter(p => `${p.schema}.${p.table}` === tableName)
      .map(p => p.name);
  }

  /**
   * Finds query patterns that reference the given table
   */
  private findAffectedQueries(tableName: string, analysis: DBAnalysis): string[] {
    return analysis.metrics.queryPatterns
      .filter(p => p.tables.includes(tableName))
      .map(p => p.query);
  }

  /**
   * Finds functions that use the specified column
   */
  private findFunctionsUsingColumn(
    tableName: string,
    columnName: string,
    analysis: CodeAnalysis
  ): string[] {
    return analysis.functions
      .filter(f => {
        const source = f.source.toLowerCase();
        return (
          source.includes(tableName.toLowerCase()) &&
          source.includes(columnName.toLowerCase())
        );
      })
      .map(f => `${f.schema}.${f.name}`);
  }

  /**
   * Finds constraints that use the specified column
   */
  private findConstraintsUsingColumn(
    tableName: string,
    columnName: string,
    analysis: DBAnalysis
  ): string[] {
    const table = analysis.currentState.tables.find(
      t => `${t.schema}.${t.name}` === tableName
    );
    if (!table) return [];

    return table.constraints
      .filter(c => c.definition.toLowerCase().includes(columnName.toLowerCase()))
      .map(c => c.name);
  }

  /**
   * Generates a risk assessment report based on identified impacts
   */
  private generateRiskReport(
    directImpacts: ComponentImpact[],
    indirectImpacts: ComponentImpact[],
    dbAnalysis: DBAnalysis
  ): RiskReport {
    const highImpacts = [...directImpacts, ...indirectImpacts].filter(
      i => i.impact === 'HIGH'
    );
    
    const report: RiskReport = {
      overallRisk: this.calculateOverallRisk(highImpacts.length),
      dataLossRisk: this.hasDataLossRisk(directImpacts),
      performanceRisk: this.hasPerformanceRisk(indirectImpacts, dbAnalysis),
      securityRisk: this.hasSecurityRisk(directImpacts),
      recommendations: this.generateRecommendations(directImpacts, indirectImpacts),
      requiredPrecautions: this.generatePrecautions(directImpacts, indirectImpacts),
    };

    return report;
  }

  /**
   * Calculates overall risk level based on number of high-impact changes
   */
  private calculateOverallRisk(highImpactCount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (highImpactCount > 5) return 'HIGH';
    if (highImpactCount > 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Checks if changes pose a risk of data loss
   */
  private hasDataLossRisk(impacts: ComponentImpact[]): boolean {
    return impacts.some(
      i =>
        i.impact === 'HIGH' &&
        (i.description.includes('DROP') || i.description.includes('data'))
    );
  }

  /**
   * Checks if changes pose a risk to performance
   */
  private hasPerformanceRisk(
    impacts: ComponentImpact[],
    analysis: DBAnalysis
  ): boolean {
    return impacts.some(
      i =>
        i.description.includes('performance') ||
        i.description.includes('high-traffic')
    );
  }

  /**
   * Checks if changes pose a security risk
   */
  private hasSecurityRisk(impacts: ComponentImpact[]): boolean {
    return impacts.some(
      i => i.type === 'POLICY' || i.description.includes('security')
    );
  }

  /**
   * Generates recommendations based on identified impacts
   */
  private generateRecommendations(
    directImpacts: ComponentImpact[],
    indirectImpacts: ComponentImpact[]
  ): string[] {
    const recommendations = new Set<string>();

    // Add recommendations based on impact types
    for (const impact of [...directImpacts, ...indirectImpacts]) {
      if (impact.mitigationSteps) {
        impact.mitigationSteps.forEach(step => recommendations.add(step));
      }
    }

    // Add general recommendations
    if (directImpacts.length > 0) {
      recommendations.add('Create backup before implementing changes');
      recommendations.add('Test changes in staging environment first');
    }

    if (this.hasDataLossRisk(directImpacts)) {
      recommendations.add('Implement data migration strategy');
      recommendations.add('Create rollback plan');
    }

    return Array.from(recommendations);
  }

  /**
   * Generates required precautions based on identified impacts
   */
  private generatePrecautions(
    directImpacts: ComponentImpact[],
    indirectImpacts: ComponentImpact[]
  ): string[] {
    const precautions = new Set<string>();

    if (directImpacts.some(i => i.impact === 'HIGH')) {
      precautions.add('Require manual review of changes');
      precautions.add('Schedule maintenance window');
    }

    if (this.hasSecurityRisk(directImpacts)) {
      precautions.add('Review security implications');
      precautions.add('Update security documentation');
    }

    if (indirectImpacts.some(i => i.description.includes('performance'))) {
      precautions.add('Monitor system performance during changes');
      precautions.add('Have rollback plan ready');
    }

    return Array.from(precautions);
  }
}
