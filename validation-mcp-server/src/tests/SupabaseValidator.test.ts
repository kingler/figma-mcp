import { SupabaseValidator } from '../validators/SupabaseValidator.js';

describe('SupabaseValidator', () => {
  let validator: SupabaseValidator;

  beforeEach(() => {
    validator = new SupabaseValidator();
  });

  describe('validateDatabaseConfig', () => {
    it('should validate database configuration changes', async () => {
      const config = {
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'Test123!@#$Password'
      };

      const result = await validator.validateDatabaseConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid database configurations', async () => {
      const config = {
        POSTGRES_DB: '',
        POSTGRES_USER: '',
        POSTGRES_PASSWORD: ''
      };

      const result = await validator.validateDatabaseConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Database name cannot be empty');
      expect(result.errors).toContain('Database user cannot be empty');
      expect(result.errors).toContain('Database password cannot be empty');
    });
  });

  describe('validateSchemaChanges', () => {
    it('should validate SQL schema changes', async () => {
      const sql = `
        CREATE TABLE test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL
        );
      `;

      const result = await validator.validateSchemaChanges(sql);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid SQL schema changes', async () => {
      const sql = 'INVALID SQL STATEMENT';

      const result = await validator.validateSchemaChanges(sql);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid SQL syntax');
    });
  });

  describe('validateCredentials', () => {
    it('should validate credential changes', async () => {
      const credentials = {
        service_name: 'test-service',
        credential_type: 'api_key',
        key_name: 'TEST_API_KEY',
        key_value: 'test-value-123',
        category: 'authentication'
      };

      const result = await validator.validateCredentials(credentials);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid credential changes', async () => {
      const credentials = {
        service_name: '',
        credential_type: '',
        key_name: '',
        key_value: '',
        category: ''
      };

      const result = await validator.validateCredentials(credentials);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Service name cannot be empty');
      expect(result.errors).toContain('Credential type cannot be empty');
      expect(result.errors).toContain('Key name cannot be empty');
      expect(result.errors).toContain('Key value cannot be empty');
      expect(result.errors).toContain('Category cannot be empty');
    });
  });

  describe('validateBackupRestore', () => {
    it('should validate backup/restore operations', async () => {
      const backupConfig = {
        operation: 'backup' as const,
        path: '/backups/test.dump',
        tables: ['api_credentials']
      };

      const result = await validator.validateBackupRestore(backupConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid backup/restore operations', async () => {
      const backupConfig = {
        operation: 'backup' as const,
        path: '',
        tables: []
      };

      const result = await validator.validateBackupRestore(backupConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backup path cannot be empty');
      expect(result.errors).toContain('No tables specified for backup/restore');
    });
  });
});
