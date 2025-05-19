export interface SchemaInfo {
  name: string;
  tables: string[];
  functions: string[];
  triggers: string[];
  policies: string[];
}

export interface TableInfo {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimary: boolean;
  isForeign: boolean;
}

export interface ConstraintInfo {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'EXCLUDE';
  definition: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  method: string;
}

export interface FunctionInfo {
  schema: string;
  name: string;
  arguments: ArgumentInfo[];
  returnType: string;
  language: string;
  source: string;
}

export interface ArgumentInfo {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
  defaultValue?: string;
}

export interface PolicyInfo {
  schema: string;
  table: string;
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  roles: string[];
  using: string;
  withCheck?: string;
}

export interface DependencyMap {
  [key: string]: {
    dependencies: string[];
    dependents: string[];
  };
}

export interface QueryPattern {
  query: string;
  frequency: number;
  avgExecutionTime: number;
  tables: string[];
}

export interface PerformanceMetrics {
  queryPatterns: QueryPattern[];
  tableMetrics: {
    [table: string]: {
      rowCount: number;
      avgRowSize: number;
      indexUsage: {
        [index: string]: {
          scans: number;
          rows: number;
        };
      };
    };
  };
}

export interface CodeAnalysis {
  schemas: SchemaInfo[];
  tables: TableInfo[];
  functions: FunctionInfo[];
  dependencies: DependencyMap;
  securityPolicies: PolicyInfo[];
}

export interface DBAnalysis {
  currentState: {
    tables: TableInfo[];
    relationships: RelationshipInfo[];
    indexes: IndexInfo[];
  };
  metrics: {
    rowCounts: Record<string, number>;
    queryPatterns: QueryPattern[];
    performance: PerformanceMetrics;
  };
}

export interface RelationshipInfo {
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
  updateAction: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
  deleteAction: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
}

export interface ImpactAnalysis {
  directImpact: ComponentImpact[];
  indirectImpact: ComponentImpact[];
  riskAssessment: RiskReport;
}

export interface ComponentImpact {
  component: string;
  type: 'TABLE' | 'FUNCTION' | 'TRIGGER' | 'POLICY' | 'INDEX';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  mitigationSteps?: string[];
}

export interface RiskReport {
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  dataLossRisk: boolean;
  performanceRisk: boolean;
  securityRisk: boolean;
  recommendations: string[];
  requiredPrecautions: string[];
}

export interface AnalysisResult {
  timestamp: string;
  codeAnalysis: CodeAnalysis;
  dbAnalysis: DBAnalysis;
  impactAnalysis: ImpactAnalysis;
}
