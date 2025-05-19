import { ValidationServer } from '../index';
import { CallToolRequest, ListToolsRequest } from '../types/mcp';

describe('ValidationServer', () => {
  let server: ValidationServer;

  beforeEach(() => {
    server = new ValidationServer();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('List Tools', () => {
    it('should list available validation tools', async () => {
      const request: ListToolsRequest = {
        method: 'list_tools',
        params: {}
      };

      const response = await server.handleListTools(request);
      expect(response.tools).toHaveLength(2);
      expect(response.tools[0].name).toBe('validate_code');
      expect(response.tools[1].name).toBe('validate_architecture');
    });
  });

  describe('Code Validation', () => {
    it('should detect unsafe code patterns', async () => {
      const request: CallToolRequest = {
        method: 'call_tool',
        params: {
          name: 'validate_code',
          arguments: {
            code: `
              function unsafeCode() {
                eval('console.log("hello")');
                var x = 1;
              }
            `,
            language: 'javascript'
          }
        }
      };

      const response = await server.handleCallTool(request);
      const result = JSON.parse(response.content[0].text);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Use of eval is forbidden due to security risks.');
      expect(result.warnings).toContain('Use of var is discouraged. Consider using let or const instead.');
    });

    it('should validate code with custom rules', async () => {
      const request: CallToolRequest = {
        method: 'call_tool',
        params: {
          name: 'validate_code',
          arguments: {
            code: `
              function logData() {
                console.log("debug info");
              }
            `,
            language: 'javascript',
            rules: ['no-console']
          }
        }
      };

      const response = await server.handleCallTool(request);
      const result = JSON.parse(response.content[0].text);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Avoid using console.log in production code.');
    });
  });

  describe('Architecture Validation', () => {
    it('should validate component architecture', async () => {
      const request: CallToolRequest = {
        method: 'call_tool',
        params: {
          name: 'validate_architecture',
          arguments: {
            components: [
              {
                name: 'API-Gateway',
                type: 'gateway',
                connections: ['auth-service', 'unknown-service']
              },
              {
                name: 'auth-service',
                type: 'service'
              }
            ]
          }
        }
      };

      const response = await server.handleCallTool(request);
      const result = JSON.parse(response.content[0].text);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Component "API-Gateway" has unknown dependency "unknown-service"');
      expect(result.warnings).toContain('Component "API-Gateway" should use lowercase with hyphens');
    });

    it('should detect too many dependencies', async () => {
      const request: CallToolRequest = {
        method: 'call_tool',
        params: {
          name: 'validate_architecture',
          arguments: {
            components: [
              {
                name: 'api-gateway',
                type: 'gateway',
                connections: [
                  'service-1',
                  'service-2',
                  'service-3',
                  'service-4',
                  'service-5',
                  'service-6'
                ]
              },
              {
                name: 'service-1',
                type: 'service'
              },
              {
                name: 'service-2',
                type: 'service'
              },
              {
                name: 'service-3',
                type: 'service'
              },
              {
                name: 'service-4',
                type: 'service'
              },
              {
                name: 'service-5',
                type: 'service'
              },
              {
                name: 'service-6',
                type: 'service'
              }
            ]
          }
        }
      };

      const response = await server.handleCallTool(request);
      const result = JSON.parse(response.content[0].text);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Component "api-gateway" has too many dependencies (6)');
    });
  });
});