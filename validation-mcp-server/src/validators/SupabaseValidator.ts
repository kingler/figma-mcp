import {
  DatabaseConfig,
  Credentials,
  BackupConfig,
  ValidationResult,
} from '../types/validation.js';

export class SupabaseValidator {
  async validateDatabaseConfig(config: DatabaseConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check for empty values first
    if (!config.POSTGRES_DB) {
      errors.push('Database name cannot be empty');
    }
    if (!config.POSTGRES_USER) {
      errors.push('Database user cannot be empty');
    }
    if (!config.POSTGRES_PASSWORD) {
      errors.push('Database password cannot be empty');
    }

    // Only perform format validation if values are not empty
    if (config.POSTGRES_DB && !config.POSTGRES_DB.match(/^[a-zA-Z0-9_]+$/)) {
      errors.push('Database name must contain only alphanumeric characters and underscores');
    }
    if (config.POSTGRES_USER && !config.POSTGRES_USER.match(/^[a-zA-Z0-9_]+$/)) {
      errors.push('Username must contain only alphanumeric characters and underscores');
    }
    if (config.POSTGRES_PASSWORD) {
      if (config.POSTGRES_PASSWORD.length < 12) {
        errors.push('Password must be at least 12 characters long');
      }
      if (!config.POSTGRES_PASSWORD.match(/[A-Z]/)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!config.POSTGRES_PASSWORD.match(/[a-z]/)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!config.POSTGRES_PASSWORD.match(/[0-9]/)) {
        errors.push('Password must contain at least one number');
      }
      if (!config.POSTGRES_PASSWORD.match(/[!@#$%^&*(),.?":{}|<>]/)) {
        errors.push('Password must contain at least one special character');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateSchemaChanges(sql: string): Promise<ValidationResult> {
    const errors: string[] = [];

    // Basic SQL validation
    if (!sql.trim()) {
      errors.push('SQL statement cannot be empty');
    }

    // Check for basic SQL syntax
    const validKeywords = ['CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'CONSTRAINT'];
    const hasValidKeyword = validKeywords.some(keyword => 
      sql.toUpperCase().includes(keyword)
    );

    if (!hasValidKeyword) {
      errors.push('Invalid SQL syntax');
    }

    // Check for potentially dangerous operations
    const dangerousKeywords = ['TRUNCATE', 'DROP DATABASE', 'DROP SCHEMA'];
    const hasDangerousOperation = dangerousKeywords.some(keyword =>
      sql.toUpperCase().includes(keyword)
    );

    if (hasDangerousOperation) {
      errors.push('Dangerous operation detected - requires manual review');
    }

    // Check for proper table name format
    const tableNameRegex = /(?:CREATE|ALTER|DROP)\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i;
    const tableNameMatch = sql.match(tableNameRegex);
    if (tableNameMatch) {
      const tableName = tableNameMatch[1];
      if (!tableName.match(/^[a-z][a-z0-9_]*$/)) {
        errors.push('Table names must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateCredentials(credentials: Credentials): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check for empty values first
    if (!credentials.service_name) {
      errors.push('Service name cannot be empty');
    }
    if (!credentials.credential_type) {
      errors.push('Credential type cannot be empty');
    }
    if (!credentials.key_name) {
      errors.push('Key name cannot be empty');
    }
    if (!credentials.key_value) {
      errors.push('Key value cannot be empty');
    }
    if (!credentials.category) {
      errors.push('Category cannot be empty');
    }

    // Only perform format validation if values are not empty
    if (credentials.service_name && !credentials.service_name.match(/^[a-z][a-z0-9-]*$/)) {
      errors.push('Service name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens');
    }
    if (credentials.credential_type) {
      const validTypes = ['api_key', 'oauth2', 'basic_auth', 'jwt', 'access_token'];
      if (!validTypes.includes(credentials.credential_type)) {
        errors.push(`Credential type must be one of: ${validTypes.join(', ')}`);
      }
    }
    if (credentials.key_name && !credentials.key_name.match(/^[A-Z][A-Z0-9_]*$/)) {
      errors.push('Key name must be uppercase with underscores');
    }
    if (credentials.key_value && credentials.key_value.length < 8) {
      errors.push('Key value must be at least 8 characters long');
    }
    if (credentials.category) {
      const validCategories = [
        'authentication',
        'messaging',
        'storage',
        'database',
        'analytics',
        'payment',
        'ai_services',
        'search_research',
        'webhook'
      ];
      if (!validCategories.includes(credentials.category)) {
        errors.push(`Category must be one of: ${validCategories.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateBackupRestore(config: BackupConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check for empty values first
    if (!config.path) {
      errors.push('Backup path cannot be empty');
    }
    if (!config.tables || config.tables.length === 0) {
      errors.push('No tables specified for backup/restore');
    }

    // Only perform format validation if values are not empty
    if (config.path) {
      if (!config.path.endsWith('.dump')) {
        errors.push('Backup file must have .dump extension');
      }
      if (!config.path.startsWith('/backups/')) {
        errors.push('Backup path must be in the /backups directory');
      }
    }

    // Validate table names if tables array exists
    if (config.tables && config.tables.length > 0) {
      const validTableNameRegex = /^[a-z][a-z0-9_]*$/;
      config.tables.forEach(table => {
        if (!validTableNameRegex.test(table)) {
          errors.push(`Invalid table name: ${table} (must start with lowercase letter, contain only lowercase letters, numbers, and underscores)`);
        }
      });

      // Check for duplicate table names
      const uniqueTables = new Set(config.tables);
      if (uniqueTables.size !== config.tables.length) {
        errors.push('Duplicate table names are not allowed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
