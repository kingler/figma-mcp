import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { TestExecutor, TestExecutionResult } from './types.js';

export class NodejsTestExecutor implements TestExecutor {
  private testFramework: 'jest' | 'mocha';
  
  constructor(testFramework: 'jest' | 'mocha' = 'jest') {
    this.testFramework = testFramework;
  }
  
  /**
   * Execute tests in a specific directory
   * @param testDir Directory containing the tests
   * @returns Test execution result
   */
  async executeTests(testDir: string): Promise<TestExecutionResult> {
    // Ensure the directory exists
    if (!await fs.pathExists(testDir)) {
      return {
        success: false,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 0,
        output: '',
        errorMessage: `Test directory does not exist: ${testDir}`
      };
    }
    
    // Execute the tests using the appropriate test runner
    if (this.testFramework === 'jest') {
      return this.executeJestTests(testDir);
    } else {
      return this.executeMochaTests(testDir);
    }
  }
  
  /**
   * Execute a specific test file
   * @param testFile Path to the test file
   * @returns Test execution result
   */
  async executeTestFile(testFile: string): Promise<TestExecutionResult> {
    // Ensure the file exists
    if (!await fs.pathExists(testFile)) {
      return {
        success: false,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        duration: 0,
        output: '',
        errorMessage: `Test file does not exist: ${testFile}`
      };
    }
    
    // Execute the test file using the appropriate test runner
    if (this.testFramework === 'jest') {
      return this.executeJestTests(undefined, testFile);
    } else {
      return this.executeMochaTests(undefined, testFile);
    }
  }
  
  /**
   * Generate test files from test code
   * @param testCode Test code to write to files
   * @param outputDir Directory to write the test files to
   * @returns Paths to the generated test files
   */
  async generateTestFiles(testCode: string | Record<string, string>, outputDir: string): Promise<string[]> {
    // Ensure the output directory exists
    await fs.ensureDir(outputDir);
    
    const generatedFiles: string[] = [];
    
    if (typeof testCode === 'string') {
      // Single test file
      const fileName = 'test.spec.js';
      const filePath = path.join(outputDir, fileName);
      await fs.writeFile(filePath, testCode);
      generatedFiles.push(filePath);
    } else {
      // Multiple test files
      for (const [fileName, code] of Object.entries(testCode)) {
        const filePath = path.join(outputDir, fileName);
        await fs.writeFile(filePath, code);
        generatedFiles.push(filePath);
      }
    }
    
    return generatedFiles;
  }
  
  /**
   * Execute tests using Jest
   * @param testDir Directory containing the tests
   * @param testFile Specific test file to run
   * @returns Test execution result
   */
  private async executeJestTests(testDir?: string, testFile?: string): Promise<TestExecutionResult> {
    return new Promise((resolve) => {
      // Prepare Jest command
      const args = ['--json', '--useStderr'];
      
      if (testDir) {
        args.push(testDir);
      }
      
      if (testFile) {
        args.push(testFile);
      }
      
      // Execute Jest
      const startTime = Date.now();
      const jestProcess = spawn('npx', ['jest', ...args]);
      
      let stdout = '';
      let stderr = '';
      
      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      jestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          // Parse Jest JSON output
          const jestOutput = stdout || stderr;
          const jestResult = JSON.parse(jestOutput);
          
          const result: TestExecutionResult = {
            success: jestResult.success,
            testsPassed: jestResult.numPassedTests,
            testsFailed: jestResult.numFailedTests,
            testsSkipped: jestResult.numPendingTests,
            duration,
            output: jestOutput
          };
          
          if (!jestResult.success) {
            result.errorMessage = this.extractJestErrorMessage(jestResult);
          }
          
          resolve(result);
        } catch (error) {
          // If we can't parse the JSON, return a basic result
          resolve({
            success: code === 0,
            testsPassed: 0,
            testsFailed: code === 0 ? 0 : 1,
            testsSkipped: 0,
            duration,
            output: stdout || stderr,
            errorMessage: code === 0 ? undefined : `Jest exited with code ${code}`
          });
        }
      });
    });
  }
  
  /**
   * Execute tests using Mocha
   * @param testDir Directory containing the tests
   * @param testFile Specific test file to run
   * @returns Test execution result
   */
  private async executeMochaTests(testDir?: string, testFile?: string): Promise<TestExecutionResult> {
    return new Promise((resolve) => {
      // Prepare Mocha command
      const args = ['--reporter', 'json'];
      
      if (testFile) {
        args.push(testFile);
      } else if (testDir) {
        args.push(`${testDir}/**/*.spec.js`, `${testDir}/**/*.test.js`);
      }
      
      // Execute Mocha
      const startTime = Date.now();
      const mochaProcess = spawn('npx', ['mocha', ...args]);
      
      let stdout = '';
      let stderr = '';
      
      mochaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      mochaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      mochaProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          // Parse Mocha JSON output
          const mochaOutput = stdout;
          const mochaResult = JSON.parse(mochaOutput);
          
          const testsPassed = mochaResult.stats.passes;
          const testsFailed = mochaResult.stats.failures;
          const testsSkipped = mochaResult.stats.pending;
          
          const result: TestExecutionResult = {
            success: testsFailed === 0,
            testsPassed,
            testsFailed,
            testsSkipped,
            duration,
            output: mochaOutput
          };
          
          if (testsFailed > 0) {
            result.errorMessage = this.extractMochaErrorMessage(mochaResult);
          }
          
          resolve(result);
        } catch (error) {
          // If we can't parse the JSON, return a basic result
          resolve({
            success: code === 0,
            testsPassed: 0,
            testsFailed: code === 0 ? 0 : 1,
            testsSkipped: 0,
            duration,
            output: stdout || stderr,
            errorMessage: code === 0 ? undefined : `Mocha exited with code ${code}`
          });
        }
      });
    });
  }
  
  /**
   * Extract error message from Jest result
   * @param jestResult Jest result object
   * @returns Error message
   */
  private extractJestErrorMessage(jestResult: any): string {
    if (!jestResult.testResults || jestResult.testResults.length === 0) {
      return 'Unknown error';
    }
    
    const failedTests = jestResult.testResults
      .filter((result: any) => result.status === 'failed')
      .flatMap((result: any) => result.assertionResults || [])
      .filter((assertion: any) => assertion.status === 'failed');
    
    if (failedTests.length === 0) {
      return 'Unknown error';
    }
    
    return failedTests
      .map((test: any) => `${test.fullName}: ${test.failureMessages.join('\n')}`)
      .join('\n\n');
  }
  
  /**
   * Extract error message from Mocha result
   * @param mochaResult Mocha result object
   * @returns Error message
   */
  private extractMochaErrorMessage(mochaResult: any): string {
    if (!mochaResult.failures || mochaResult.failures.length === 0) {
      return 'Unknown error';
    }
    
    return mochaResult.failures
      .map((failure: any) => `${failure.fullTitle}: ${failure.err.message}`)
      .join('\n\n');
  }
}
