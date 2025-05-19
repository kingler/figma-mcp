import { Client } from 'pg';
import {
  DBAnalysis,
  TableInfo,
  IndexInfo,
  RelationshipInfo,
  QueryPattern,
  PerformanceMetrics,
} from '../types/analysis.js';
import { DBConfig, DatabaseError } from '../types/database.js';

export class DBAnalyzer {
  private client: Client;

  constructor(config: DBConfig) {
    this.client = new Client(config);
  }

  /**
   * Analyzes the current state of the database
   */
  async analyzeDatabaseState(): Promise<DBAnalysis> {
    try {
      await this.client.connect();

      const analysis: DBAnalysis = {
        currentState: {
          tables: await this.analyzeTables(),
          relationships: await this.analyzeRelationships(),
          indexes: await this.analyzeIndexes(),
        },
        metrics: {
          rowCounts: await this.getRowCounts(),
          queryPatterns: await this.analyzeQueryPatterns(),
          performance: await this.analyzePerformance(),
        },
      };

      return analysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Database analysis failed: ${error.message}`);
      }
      throw new Error('Database analysis failed: Unknown error');
    } finally {
      await this.client.end();
    }
  }

  /**
   * Analyzes table structures and properties
   */
  private async analyzeTables(): Promise<TableInfo[]> {
    const query = `
      SELECT 
        n.nspname as schema,
        c.relname as name,
        c.reltuples::bigint as row_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, c.relname;
    `;

    const tables: TableInfo[] = [];
    const result = await this.client.query(query);

    for (const row of result.rows) {
      const columns = await this.getTableColumns(row.schema, row.name);
      const constraints = await this.getTableConstraints(row.schema, row.name);
      const indexes = await this.getTableIndexes(row.schema, row.name);

      tables.push({
        schema: row.schema,
        name: row.name,
        columns,
        constraints,
        indexes,
        rowCount: Number(row.row_count),
      });
    }

    return tables;
  }

  /**
   * Gets column information for a table
   */
  private async getTableColumns(schema: string, table: string): Promise<TableInfo['columns']> {
    const query = `
      SELECT 
        a.attname as name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
        a.attnotnull as not_null,
        pg_get_expr(d.adbin, d.adrelid) as default_value,
        COALESCE(p.contype = 'p', false) as is_primary,
        COALESCE(f.contype = 'f', false) as is_foreign
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
      LEFT JOIN pg_constraint p ON p.conrelid = a.attrelid 
        AND a.attnum = ANY(p.conkey) AND p.contype = 'p'
      LEFT JOIN pg_constraint f ON f.conrelid = a.attrelid 
        AND a.attnum = ANY(f.conkey) AND f.contype = 'f'
      WHERE a.attrelid = $1::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum;
    `;

    const result = await this.client.query(query, [`${schema}.${table}`]);
    
    return result.rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: !row.not_null,
      defaultValue: row.default_value,
      isPrimary: row.is_primary,
      isForeign: row.is_foreign,
    }));
  }

  /**
   * Gets constraint information for a table
   */
  private async getTableConstraints(schema: string, table: string): Promise<TableInfo['constraints']> {
    const query = `
      SELECT 
        c.conname as name,
        c.contype as type,
        pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conrelid = $1::regclass
      ORDER BY c.conname;
    `;

    const result = await this.client.query(query, [`${schema}.${table}`]);
    
    return result.rows.map(row => ({
      name: row.name,
      type: this.mapConstraintType(row.type),
      definition: row.definition,
    }));
  }

  /**
   * Gets index information for a table
   */
  private async getTableIndexes(schema: string, table: string): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        i.relname as name,
        am.amname as method,
        ix.indisunique as is_unique,
        array_agg(a.attname ORDER BY k.n) as columns
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n) ON TRUE
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE t.relname = $1 AND n.nspname = $2
      GROUP BY i.relname, am.amname, ix.indisunique
      ORDER BY i.relname;
    `;

    const result = await this.client.query(query, [table, schema]);
    
    return result.rows.map(row => ({
      name: row.name,
      columns: row.columns,
      isUnique: row.is_unique,
      method: row.method,
    }));
  }

  /**
   * Analyzes relationships between tables
   */
  private async analyzeRelationships(): Promise<RelationshipInfo[]> {
    const query = `
      SELECT
        n1.nspname as from_schema,
        c1.relname as from_table,
        a1.attname as from_column,
        n2.nspname as to_schema,
        c2.relname as to_table,
        a2.attname as to_column,
        con.conname as constraint_name,
        con.confupdtype as update_action,
        con.confdeltype as delete_action
      FROM pg_constraint con
      JOIN pg_class c1 ON c1.oid = con.conrelid
      JOIN pg_namespace n1 ON n1.oid = c1.relnamespace
      JOIN pg_class c2 ON c2.oid = con.confrelid
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      JOIN pg_attribute a1 ON a1.attnum = con.conkey[1] AND a1.attrelid = con.conrelid
      JOIN pg_attribute a2 ON a2.attnum = con.confkey[1] AND a2.attrelid = con.confrelid
      WHERE con.contype = 'f'
      ORDER BY n1.nspname, c1.relname, con.conname;
    `;

    const result = await this.client.query(query);
    
    return result.rows.map(row => ({
      fromSchema: row.from_schema,
      fromTable: row.from_table,
      fromColumn: row.from_column,
      toSchema: row.to_schema,
      toTable: row.to_table,
      toColumn: row.to_column,
      constraintName: row.constraint_name,
      updateAction: this.mapActionType(row.update_action),
      deleteAction: this.mapActionType(row.delete_action),
    }));
  }

  /**
   * Analyzes index usage and properties
   */
  private async analyzeIndexes(): Promise<IndexInfo[]> {
    const query = `
      SELECT 
        schemaname as schema,
        tablename as table,
        indexrelname as name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        indexrelname as index_name
      FROM pg_stat_user_indexes
      JOIN pg_index ON pg_index.indexrelid = pg_stat_user_indexes.indexrelid
      WHERE idx_scan > 0
      ORDER BY idx_scan DESC;
    `;

    const result = await this.client.query(query);
    
    return result.rows.map(row => ({
      name: row.name,
      columns: [], // Would need additional query to get columns
      isUnique: false, // Would need additional query to get uniqueness
      method: 'btree', // Would need additional query to get method
    }));
  }

  /**
   * Gets row counts for all tables
   */
  private async getRowCounts(): Promise<Record<string, number>> {
    const query = `
      SELECT 
        schemaname || '.' || relname as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY schemaname, relname;
    `;

    const result = await this.client.query(query);
    const counts: Record<string, number> = {};
    
    for (const row of result.rows) {
      counts[row.table_name] = parseInt(row.row_count, 10);
    }
    
    return counts;
  }

  /**
   * Analyzes query patterns from pg_stat_statements
   */
  private async analyzeQueryPatterns(): Promise<QueryPattern[]> {
    const query = `
      SELECT 
        query,
        calls as frequency,
        mean_exec_time as avg_execution_time,
        array_agg(DISTINCT object_name) as tables
      FROM pg_stat_statements
      LEFT JOIN pg_stat_statements_info ON true
      CROSS JOIN LATERAL unnest(string_to_array(
        regexp_replace(
          regexp_replace(query, '/\\*.*?\\*/', '', 'g'),
          '--.*$', '', 'gm'
        ), ' '
      )) word
      WHERE word ILIKE ANY(ARRAY['SELECT%', 'INSERT%', 'UPDATE%', 'DELETE%'])
      GROUP BY query, calls, mean_exec_time
      ORDER BY calls DESC
      LIMIT 100;
    `;

    try {
      const result = await this.client.query(query);
      return result.rows.map(row => ({
        query: row.query,
        frequency: parseInt(row.frequency, 10),
        avgExecutionTime: parseFloat(row.avg_execution_time),
        tables: row.tables || [],
      }));
    } catch (error) {
      // pg_stat_statements might not be enabled
      return [];
    }
  }

  /**
   * Analyzes database performance metrics
   */
  private async analyzePerformance(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      queryPatterns: await this.analyzeQueryPatterns(),
      tableMetrics: {},
    };

    const query = `
      SELECT 
        schemaname || '.' || relname as table_name,
        n_live_tup as row_count,
        (pg_total_relation_size(relid) / n_live_tup) as avg_row_size,
        idx_scan as index_scans,
        n_tup_ins + n_tup_upd + n_tup_del as write_ops,
        n_tup_hot_upd as hot_updates
      FROM pg_stat_user_tables
      WHERE n_live_tup > 0;
    `;

    const result = await this.client.query(query);
    
    for (const row of result.rows) {
      metrics.tableMetrics[row.table_name] = {
        rowCount: parseInt(row.row_count, 10),
        avgRowSize: parseInt(row.avg_row_size, 10),
        indexUsage: await this.getIndexUsage(row.table_name),
      };
    }

    return metrics;
  }

  /**
   * Gets index usage statistics for a table
   */
  private async getIndexUsage(tableName: string): Promise<PerformanceMetrics['tableMetrics'][string]['indexUsage']> {
    const query = `
      SELECT 
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as rows
      FROM pg_stat_user_indexes
      WHERE relname = $1;
    `;

    const result = await this.client.query(query, [tableName.split('.')[1]]);
    const usage: PerformanceMetrics['tableMetrics'][string]['indexUsage'] = {};
    
    for (const row of result.rows) {
      usage[row.index_name] = {
        scans: parseInt(row.scans, 10),
        rows: parseInt(row.rows, 10),
      };
    }
    
    return usage;
  }

  /**
   * Maps PostgreSQL constraint type to our type system
   */
  private mapConstraintType(type: string): 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'EXCLUDE' {
    const typeMap: { [key: string]: any } = {
      p: 'PRIMARY KEY',
      f: 'FOREIGN KEY',
      u: 'UNIQUE',
      c: 'CHECK',
      x: 'EXCLUDE',
    };
    return typeMap[type] || 'CHECK';
  }

  /**
   * Maps PostgreSQL action type to our type system
   */
  private mapActionType(type: string): 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT' {
    const typeMap: { [key: string]: any } = {
      a: 'NO ACTION',
      r: 'RESTRICT',
      c: 'CASCADE',
      n: 'SET NULL',
      d: 'SET DEFAULT',
    };
    return typeMap[type] || 'NO ACTION';
  }
}
