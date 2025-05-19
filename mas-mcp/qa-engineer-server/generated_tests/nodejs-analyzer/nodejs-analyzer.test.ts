import * as fs from 'fs-extra';
import * as path from 'path';
import { NodejsAnalyzer } from '../../../src/services/code-analysis/nodejs-analyzer';
import { CodeAnalysisResult } from '../../../src/services/code-analysis/types';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('path');

describe('NodejsAnalyzer', () => {
  let analyzer: NodejsAnalyzer;
  let mockFileContent: string;
  
  beforeEach(() => {
    analyzer = new NodejsAnalyzer();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock file content for testing
    mockFileContent = `
      import * as fs from 'fs-extra';
      import { someFunction } from './utils';
      
      /**
       * Example class docstring
       */
      export class ExampleClass {
        private _privateProperty: string;
        public publicProperty: number = 42;
        
        constructor(value: string) {
          this._privateProperty = value;
        }
        
        /**
         * Example method docstring
         * @param param1 First parameter
         * @param param2 Second parameter
         * @returns A string result
         */
        public exampleMethod(param1: string, param2: number = 0): string {
          if (param2 > 0) {
            return param1.repeat(param2);
          }
          return this._privateProperty + param1;
        }
        
        private _privateMethod(): void {
          console.log('Private method');
        }
      }
      
      /**
       * Example function docstring
       */
      export function exampleFunction(a: number, b: number): number {
        return a + b;
      }
      
      const arrowFunction = (x: number) => x * 2;
      
      module.exports = {
        anotherFunction: () => 'exported'
      };
    `;
    
    // Mock fs.readFile to return our test content
    (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);
    
    // Mock path functions
    (path.basename as jest.Mock).mockReturnValue('test-file.ts');
    (path.extname as jest.Mock).mockReturnValue('.ts');
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    (path.join as jest.Mock).mockImplementation((...parts) => parts.join('/'));
    (path.parse as jest.Mock).mockReturnValue({ root: '/' });
    
    // Mock fs.existsSync and fs.pathExists
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    // Mock fs.readJson for package.json
    (fs.readJson as jest.Mock).mockResolvedValue({
      dependencies: {
        'fs-extra': '^10.0.0',
        'acorn': '^8.7.0'
      },
      devDependencies: {
        'jest': '^27.0.0',
        'typescript': '^4.5.0'
      }
    });
  });
  
  describe('supportedExtensions', () => {
    it('should support JavaScript and TypeScript extensions', () => {
      expect(analyzer.supportedExtensions).toContain('.js');
      expect(analyzer.supportedExtensions).toContain('.ts');
      expect(analyzer.supportedExtensions).toContain('.jsx');
      expect(analyzer.supportedExtensions).toContain('.tsx');
      expect(analyzer.supportedExtensions.length).toBe(4);
    });
  });
  
  describe('analyzeFile', () => {
    it('should analyze a TypeScript file and return the correct structure', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      // Verify the basic structure
      expect(result).toBeDefined();
      expect(result.fileName).toBe('test-file.ts');
      expect(result.language).toBe('nodejs');
      
      // Verify functions were extracted
      expect(result.functions).toBeDefined();
      expect(result.functions.length).toBeGreaterThan(0);
      
      // Verify classes were extracted
      expect(result.classes).toBeDefined();
      expect(result.classes.length).toBeGreaterThan(0);
      
      // Verify imports were extracted
      expect(result.imports).toBeDefined();
      expect(result.imports.length).toBeGreaterThan(0);
      
      // Verify dependencies were extracted
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.length).toBeGreaterThan(0);
    });
    
    it('should read the file content using fs.readFile', async () => {
      await analyzer.analyzeFile('/path/to/test-file.ts');
      
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/test-file.ts', 'utf8');
    });
    
    it('should extract the correct file name and extension', async () => {
      await analyzer.analyzeFile('/path/to/test-file.ts');
      
      expect(path.basename).toHaveBeenCalledWith('/path/to/test-file.ts');
      expect(path.extname).toHaveBeenCalledWith('/path/to/test-file.ts');
    });
    
    it('should extract dependencies from package.json', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      expect(result.dependencies.length).toBe(4);
      
      // Check for regular dependencies
      const fsExtra = result.dependencies.find(d => d.name === 'fs-extra');
      expect(fsExtra).toBeDefined();
      expect(fsExtra?.version).toBe('^10.0.0');
      expect(fsExtra?.isDevDependency).toBe(false);
      
      // Check for dev dependencies
      const typescript = result.dependencies.find(d => d.name === 'typescript');
      expect(typescript).toBeDefined();
      expect(typescript?.version).toBe('^4.5.0');
      expect(typescript?.isDevDependency).toBe(true);
    });
  });
  
  describe('function extraction', () => {
    it('should extract named functions with correct properties', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      const exampleFunction = result.functions.find(f => f.name === 'exampleFunction');
      expect(exampleFunction).toBeDefined();
      expect(exampleFunction?.params.length).toBe(2);
      expect(exampleFunction?.params[0].name).toBe('a');
      expect(exampleFunction?.params[1].name).toBe('b');
      expect(exampleFunction?.returnType).toBe('number');
      expect(exampleFunction?.docstring).toContain('Example function docstring');
      expect(exampleFunction?.isExported).toBe(true);
    });
    
    it('should extract arrow functions with correct properties', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      const arrowFunction = result.functions.find(f => f.name === 'arrowFunction');
      expect(arrowFunction).toBeDefined();
      expect(arrowFunction?.params.length).toBe(1);
      expect(arrowFunction?.params[0].name).toBe('x');
    });
    
    it('should detect exported functions', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      const exportedFunction = result.functions.find(f => f.name === 'anotherFunction');
      expect(exportedFunction).toBeDefined();
      expect(exportedFunction?.isExported).toBe(true);
    });
  });
  
  describe('class extraction', () => {
    let exampleClass: any;
    
    beforeEach(async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      exampleClass = result.classes.find(c => c.name === 'ExampleClass');
    });
    
    it('should extract classes with correct properties', () => {
      expect(exampleClass).toBeDefined();
      expect(exampleClass.docstring).toContain('Example class docstring');
      expect(exampleClass.isExported).toBe(true);
    });
    
    it('should extract class methods', () => {
      expect(exampleClass.methods.length).toBe(2);
      
      const publicMethod = exampleClass.methods.find((m: any) => m.name === 'exampleMethod');
      expect(publicMethod).toBeDefined();
      expect(publicMethod.params.length).toBe(2);
      expect(publicMethod.returnType).toBe('string');
      expect(publicMethod.docstring).toContain('Example method docstring');
      
      const privateMethod = exampleClass.methods.find((m: any) => m.name === '_privateMethod');
      expect(privateMethod).toBeDefined();
      expect(privateMethod.returnType).toBe('void');
    });
    
    it('should extract class properties', () => {
      expect(exampleClass.properties.length).toBe(2);
      
      const privateProperty = exampleClass.properties.find((p: any) => p.name === '_privateProperty');
      expect(privateProperty).toBeDefined();
      expect(privateProperty.isPrivate).toBe(true);
      
      const publicProperty = exampleClass.properties.find((p: any) => p.name === 'publicProperty');
      expect(publicProperty).toBeDefined();
      expect(publicProperty.isPrivate).toBe(false);
      expect(publicProperty.defaultValue).toBe('42');
    });
  });
  
  describe('import extraction', () => {
    it('should extract imports with correct properties', async () => {
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      expect(result.imports.length).toBe(2);
      
      const fsImport = result.imports.find(i => i.path === 'fs-extra');
      expect(fsImport).toBeDefined();
      expect(fsImport?.isNamespace).toBe(true);
      
      const utilsImport = result.imports.find(i => i.path === './utils');
      expect(utilsImport).toBeDefined();
      expect(utilsImport?.namedImports).toContain('someFunction');
    });
  });
  
  describe('error handling', () => {
    it('should handle errors when reading package.json', async () => {
      // Mock fs.readJson to throw an error
      (fs.readJson as jest.Mock).mockRejectedValue(new Error('Failed to read package.json'));
      
      // Should not throw an error
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      // Should still return a valid result with empty dependencies
      expect(result).toBeDefined();
      expect(result.dependencies).toEqual([]);
    });
    
    it('should handle missing package.json', async () => {
      // Mock fs.pathExists to return false
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      
      const result = await analyzer.analyzeFile('/path/to/test-file.ts');
      
      expect(result).toBeDefined();
      expect(result.dependencies).toEqual([]);
    });
  });
});
