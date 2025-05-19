import { promises as fs } from 'fs';
import * as path from 'path';
import {
  CodeAnalysis,
  SchemaInfo,
  TableInfo,
  FunctionInfo,
  PolicyInfo,
  DependencyMap,
} from '../types/analysis.js';

export class CodeAnalyzer {
  private readonly sqlFileExtensions = ['.sql', '.pgsql'];
  private readonly typeScriptFileExtensions = ['.ts', '.tsx'];
  private readonly javascriptFileExtensions = ['.js', '.jsx'];

  /**
   * Analyzes a codebase for database-related structures and patterns
   * @param basePath - Root path of the codebase to analyze
   */
  async analyzeCodebase(basePath: string): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      schemas: [],
      tables: [],
      functions: [],
      dependencies: {},
      securityPolicies: [],
    };

    try {
      // Find all relevant files
      const files = await this.findRelevantFiles(basePath);

      // Process SQL files first as they contain direct database definitions
      const sqlFiles = files.filter(file => 
        this.sqlFileExtensions.includes(path.extname(file))
      );
      await this.processSqlFiles(sqlFiles, analysis);

      // Process TypeScript/JavaScript files for ORM definitions and database usage
      const tsFiles = files.filter(file =>
        this.typeScriptFileExtensions.includes(path.extname(file))
      );
      const jsFiles = files.filter(file =>
        this.javascriptFileExtensions.includes(path.extname(file))
      );
      await this.processTypeScriptFiles([...tsFiles, ...jsFiles], analysis);

      // Build dependency map
      analysis.dependencies = await this.buildDependencyMap(analysis);

      return analysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to analyze codebase: ${error.message}`);
      }
      throw new Error('Failed to analyze codebase: Unknown error');
    }
  }

  /**
   * Recursively finds all relevant files in the codebase
   */
  private async findRelevantFiles(basePath: string): Promise<string[]> {
    const relevantFiles: string[] = [];
    
    async function walk(dir: string) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          await walk(filePath);
        } else if (stat.isFile()) {
          relevantFiles.push(filePath);
        }
      }
    }

    await walk(basePath);
    return relevantFiles;
  }

  /**
   * Processes SQL files to extract database structures
   */
  private async processSqlFiles(files: string[], analysis: CodeAnalysis): Promise<void> {
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Extract schema definitions
      this.extractSchemas(content, analysis);
      
      // Extract table definitions
      this.extractTables(content, analysis);
      
      // Extract function definitions
      this.extractFunctions(content, analysis);
      
      // Extract security policies
      this.extractPolicies(content, analysis);
    }
  }

  /**
   * Processes TypeScript/JavaScript files for ORM definitions
   */
  private async processTypeScriptFiles(files: string[], analysis: CodeAnalysis): Promise<void> {
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Extract TypeORM/Prisma/other ORM entity definitions
      this.extractOrmDefinitions(content, analysis);
      
      // Extract database queries and usage patterns
      this.extractDatabaseUsage(content, analysis);
    }
  }

  /**
   * Extracts schema definitions from SQL content
   */
  private extractSchemas(content: string, analysis: CodeAnalysis): void {
    const schemaRegex = /CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      if (!analysis.schemas.find((s: SchemaInfo) => s.name === schemaName)) {
        analysis.schemas.push({
          name: schemaName,
          tables: [],
          functions: [],
          triggers: [],
          policies: [],
        });
      }
    }
  }

  /**
   * Extracts table definitions from SQL content
   */
  private extractTables(content: string, analysis: CodeAnalysis): void {
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\);/gi;
    let match: RegExpExecArray | null;
    
    while ((match = tableRegex.exec(content)) !== null) {
      const schemaName = match[1] ? match[1].slice(0, -1) : 'public';
      const tableName = match[2];
      const tableDefinition = match[3];
      
      const table: TableInfo = {
        schema: schemaName,
        name: tableName,
        columns: this.extractColumns(tableDefinition),
        constraints: this.extractConstraints(tableDefinition),
        indexes: [],
        rowCount: 0,
      };
      
      analysis.tables.push(table);
      
      // Add table to schema
      const schema = analysis.schemas.find((s: SchemaInfo) => s.name === schemaName);
      if (schema && !schema.tables.includes(tableName)) {
        schema.tables.push(tableName);
      }
    }
  }

  /**
   * Extracts column definitions from table definition
   */
  private extractColumns(tableDefinition: string): TableInfo['columns'] {
    const columns = [];
    const columnLines = tableDefinition.split(',').map(line => line.trim());
    
    for (const line of columnLines) {
      const columnMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\(.*?\))?)\s*(NOT NULL|NULL)?/i);
      if (columnMatch) {
        columns.push({
          name: columnMatch[1],
          type: columnMatch[2],
          nullable: !columnMatch[3] || columnMatch[3].toUpperCase() !== 'NOT NULL',
          isPrimary: false,
          isForeign: false,
        });
      }
    }
    
    return columns;
  }

  /**
   * Extracts constraint definitions from table definition
   */
  private extractConstraints(tableDefinition: string): TableInfo['constraints'] {
    const constraints = [];
    const constraintRegex = /CONSTRAINT\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|EXCLUDE)\s*(.*?)(?:,|$)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = constraintRegex.exec(tableDefinition)) !== null) {
      constraints.push({
        name: match[1],
        type: match[2].toUpperCase() as any,
        definition: match[3].trim(),
      });
    }
    
    return constraints;
  }

  /**
   * Extracts function definitions from SQL content
   */
  private extractFunctions(content: string, analysis: CodeAnalysis): void {
    const functionRegex = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*RETURNS\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\[\])?)\s+(?:LANGUAGE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+)?AS\s*\$\$\s*([\s\S]*?)\$\$/gi;
    let match: RegExpExecArray | null;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const schemaName = match[1] ? match[1].slice(0, -1) : 'public';
      const functionName = match[2];
      const args = this.extractFunctionArguments(match[3]);
      const returnType = match[4];
      const language = match[5] || 'plpgsql';
      const source = match[6];
      
      const func: FunctionInfo = {
        schema: schemaName,
        name: functionName,
        arguments: args,
        returnType,
        language,
        source,
      };
      
      analysis.functions.push(func);
      
      // Add function to schema
      const schema = analysis.schemas.find((s: SchemaInfo) => s.name === schemaName);
      if (schema && !schema.functions.includes(functionName)) {
        schema.functions.push(functionName);
      }
    }
  }

  /**
   * Extracts function arguments
   */
  private extractFunctionArguments(argsString: string): FunctionInfo['arguments'] {
    const args = [];
    const argParts = argsString.split(',').map(arg => arg.trim());
    
    for (const part of argParts) {
      if (!part) continue;
      
      const argMatch = part.match(/(?:(IN|OUT|INOUT|VARIADIC)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\[\])?)\s*(?:=\s*(.+))?/i);
      if (argMatch) {
        args.push({
          mode: (argMatch[1]?.toUpperCase() || 'IN') as any,
          name: argMatch[2],
          type: argMatch[3],
          defaultValue: argMatch[4],
        });
      }
    }
    
    return args;
  }

  /**
   * Extracts security policies from SQL content
   */
  private extractPolicies(content: string, analysis: CodeAnalysis): void {
    const policyRegex = /CREATE\s+POLICY\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+ON\s+([a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+)?(?:FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL))\s+(?:TO\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*))?\s+USING\s*\(([\s\S]*?)\)(?:\s+WITH\s+CHECK\s*\(([\s\S]*?)\))?/gi;
    let match: RegExpExecArray | null;
    
    while ((match = policyRegex.exec(content)) !== null) {
      const policy: PolicyInfo = {
        name: match[1],
        schema: match[2] ? match[2].slice(0, -1) : 'public',
        table: match[3],
        command: match[5].toUpperCase() as any,
        roles: match[6] ? match[6].split(',').map(r => r.trim()) : ['public'],
        using: match[7].trim(),
        withCheck: match[8]?.trim(),
      };
      
      analysis.securityPolicies.push(policy);
      
      // Add policy to schema
      const schema = analysis.schemas.find((s: SchemaInfo) => s.name === policy.schema);
      if (schema && !schema.policies.includes(policy.name)) {
        schema.policies.push(policy.name);
      }
    }
  }

  /**
   * Extracts ORM entity definitions from TypeScript/JavaScript files
   */
  private extractOrmDefinitions(content: string, analysis: CodeAnalysis): void {
    // TypeORM entity definitions
    const typeormRegex = /@Entity\(['"]([^'"]+)['"]\)[\s\S]*?export\s+class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match: RegExpExecArray | null;
    
    while ((match = typeormRegex.exec(content)) !== null) {
      const tableName = match[1];
      const className = match[2];
      
      // Extract columns and relations
      const classBody = this.extractClassBody(content, className);
      if (classBody) {
        const columns = this.extractTypeOrmColumns(classBody);
        const relations = this.extractTypeOrmRelations(classBody);
        
        // Add to analysis
        if (!analysis.tables.find((t: TableInfo) => t.name === tableName)) {
          analysis.tables.push({
            schema: 'public',
            name: tableName,
            columns,
            constraints: [],
            indexes: [],
            rowCount: 0,
          });
        }
      }
    }
  }

  /**
   * Extracts database usage patterns from TypeScript/JavaScript files
   */
  private extractDatabaseUsage(content: string, analysis: CodeAnalysis): void {
    // Raw SQL queries
    const rawSqlRegex = /(?:executeQuery|query)\(['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    
    while ((match = rawSqlRegex.exec(content)) !== null) {
      const query = match[1];
      // Add to query patterns if needed
    }
    
    // ORM operations
    const ormOperationRegex = /\.(find(?:One|By|AndCount)?|create|update|delete|save)\(/g;
    while ((match = ormOperationRegex.exec(content)) !== null) {
      const operation = match[1];
      // Add to operation patterns if needed
    }
  }

  /**
   * Builds a dependency map from the analyzed components
   */
  private async buildDependencyMap(analysis: CodeAnalysis): Promise<DependencyMap> {
    const dependencies: DependencyMap = {};
    
    // Initialize map entries
    for (const table of analysis.tables) {
      const key = `${table.schema}.${table.name}`;
      dependencies[key] = {
        dependencies: [],
        dependents: [],
      };
    }
    
    // Add foreign key relationships
    for (const table of analysis.tables) {
      const tableKey = `${table.schema}.${table.name}`;
      
      for (const constraint of table.constraints) {
        if (constraint.type === 'FOREIGN KEY') {
          const match = constraint.definition.match(/REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)/i);
          if (match) {
            const refSchema = match[1] ? match[1].slice(0, -1) : 'public';
            const refTable = match[2];
            const refKey = `${refSchema}.${refTable}`;
            
            dependencies[tableKey].dependencies.push(refKey);
            if (dependencies[refKey]) {
              dependencies[refKey].dependents.push(tableKey);
            }
          }
        }
      }
    }
    
    // Add function dependencies
    for (const func of analysis.functions) {
      const funcKey = `${func.schema}.${func.name}`;
      dependencies[funcKey] = {
        dependencies: [],
        dependents: [],
      };
      
      // Extract table references from function body
      const tableRefs = this.extractTableReferences(func.source);
      for (const ref of tableRefs) {
        if (dependencies[ref]) {
          dependencies[funcKey].dependencies.push(ref);
          dependencies[ref].dependents.push(funcKey);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Extracts table references from SQL code
   */
  private extractTableReferences(sql: string): string[] {
    const refs = new Set<string>();
    const tableRefRegex = /(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+([a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = tableRefRegex.exec(sql)) !== null) {
      const schema = match[1] ? match[1].slice(0, -1) : 'public';
      const table = match[2];
      refs.add(`${schema}.${table}`);
    }
    
    return Array.from(refs);
  }

  /**
   * Extracts class body from TypeScript/JavaScript content
   */
  private extractClassBody(content: string, className: string): string | null {
    const classRegex = new RegExp(`class\\s+${className}\\s*{([\\s\\S]*?)}\\s*$`, 'm');
    const match = classRegex.exec(content);
    return match ? match[1] : null;
  }

  /**
   * Extracts TypeORM column definitions
   */
  private extractTypeOrmColumns(classBody: string): TableInfo['columns'] {
    const columns = [];
    const columnRegex = /@Column\([^)]*\)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>]*)/g;
    let match: RegExpExecArray | null;
    
    while ((match = columnRegex.exec(classBody)) !== null) {
      columns.push({
        name: match[1],
        type: this.mapTypeScriptTypeToSQL(match[2]),
        nullable: !classBody.includes(`@IsNotEmpty()`),
        isPrimary: classBody.includes(`@PrimaryColumn()`),
        isForeign: false,
      });
    }
    
    return columns;
  }

  /**
   * Extracts TypeORM relation definitions
   */
  private extractTypeOrmRelations(classBody: string): void {
    const relationRegex = /@(OneToOne|OneToMany|ManyToOne|ManyToMany)\([^)]+\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match: RegExpExecArray | null;
    
    while ((match = relationRegex.exec(classBody)) !== null) {
      const relationType = match[1];
      const propertyName = match[2];
      // Add to relationships if needed
    }
  }

  /**
   * Maps TypeScript types to SQL types
   */
  private mapTypeScriptTypeToSQL(tsType: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'text',
      'number': 'numeric',
      'boolean': 'boolean',
      'Date': 'timestamp',
      'Buffer': 'bytea',
    };
    
    return typeMap[tsType] || 'text';
  }
}
