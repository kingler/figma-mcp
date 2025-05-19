export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface DBConnection {
  client: any; // Will be typed as pg.Client when initialized
  config: DBConfig;
}

export interface QueryOptions {
  timeout?: number;
  rowMode?: 'array' | 'object';
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

export interface TableStats {
  schemaName: string;
  tableName: string;
  live: {
    rowCount: number;
    diskUsage: number;
    indexUsage: number;
  };
  dead: {
    rowCount: number;
    diskUsage: number;
  };
  lastVacuum?: Date;
  lastAnalyze?: Date;
}

export interface IndexStats {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexSize: number;
  scans: number;
  rowsRead: number;
  rowsFetched: number;
  efficiency: number;
}

export interface ConnectionPool {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
}

export interface DatabaseSize {
  databaseName: string;
  sizeBytes: number;
  prettySize: string;
}

export interface SchemaSize {
  schemaName: string;
  sizeBytes: number;
  prettySize: string;
  tableCount: number;
  functionCount: number;
}

export interface BackupConfig {
  path: string;
  format: 'plain' | 'custom' | 'directory' | 'tar';
  compression?: number;
  encoding?: string;
  schemas?: string[];
  tables?: string[];
  excludeTables?: string[];
}

export interface RestoreConfig extends BackupConfig {
  cleanFirst?: boolean;
  createDb?: boolean;
  singleTransaction?: boolean;
}

export interface MaintenanceConfig {
  vacuum: {
    full: boolean;
    analyze: boolean;
    tables?: string[];
  };
  reindex: {
    force: boolean;
    tables?: string[];
    indexes?: string[];
  };
}

export interface MonitoringConfig {
  interval: number;
  metrics: {
    connections: boolean;
    queryStats: boolean;
    tableStats: boolean;
    indexStats: boolean;
    diskUsage: boolean;
  };
}

export interface DatabaseError extends Error {
  code: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}

// Type guards
export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof Error && 'code' in error;
}

export function isQueryResult<T>(result: any): result is QueryResult<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    Array.isArray(result.rows) &&
    typeof result.rowCount === 'number' &&
    typeof result.command === 'string' &&
    Array.isArray(result.fields)
  );
}
