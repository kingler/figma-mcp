export interface DatabaseConfig {
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
}

export interface Credentials {
  service_name: string;
  credential_type: string;
  key_name: string;
  key_value: string;
  category: string;
}

export interface BackupConfig {
  operation: 'backup' | 'restore';
  path: string;
  tables: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Type guards
export function isDatabaseConfig(obj: any): obj is DatabaseConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.POSTGRES_DB === 'string' &&
    typeof obj.POSTGRES_USER === 'string' &&
    typeof obj.POSTGRES_PASSWORD === 'string'
  );
}

export function isCredentials(obj: any): obj is Credentials {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.service_name === 'string' &&
    typeof obj.credential_type === 'string' &&
    typeof obj.key_name === 'string' &&
    typeof obj.key_value === 'string' &&
    typeof obj.category === 'string'
  );
}

export function isBackupConfig(obj: any): obj is BackupConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.operation === 'backup' || obj.operation === 'restore') &&
    typeof obj.path === 'string' &&
    Array.isArray(obj.tables) &&
    obj.tables.every((table: any) => typeof table === 'string')
  );
}
