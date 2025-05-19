import { TestExecutor } from './types.js';
import { NodejsTestExecutor } from './nodejs-executor.js';
import { PythonTestExecutor } from './python-executor.js';

export class TestExecutorFactory {
  /**
   * Get a test executor for a specific language
   * @param language The programming language
   * @param framework Optional test framework to use
   * @returns A test executor for the specified language
   */
  static getExecutor(language: string, framework?: string): TestExecutor {
    language = language.toLowerCase();
    
    if (language === 'python') {
      return new PythonTestExecutor(framework as 'pytest' | 'unittest');
    } else if (['javascript', 'typescript', 'js', 'ts', 'nodejs', 'node'].includes(language)) {
      return new NodejsTestExecutor(framework as 'jest' | 'mocha');
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  }
}
