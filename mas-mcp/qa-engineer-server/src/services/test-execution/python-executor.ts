import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { TestExecutor, TestExecutionResult } from './types.js';

export class PythonTestExecutor implements TestExecutor {
  private testFramework: 'pytest' | 'unittest';
  
  constructor(testFramework: 'pytest' | 'unittest' = 'pytest') {
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
    if (this.testFramework === 'pytest') {
      return this.executePytestTests(testDir);
    } else {
      return this.executeUnittestTests(testDir);
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
    if (this.testFramework === 'pytest') {
      return this.executePytestTests(undefined, testFile);
    } else {
      return this.executeUnittestTests(undefined, testFile);
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
      const fileName = 'test_main.py';
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
    
    // Create an __init__.py file to make the directory a Python package
    const initFilePath = path.join(outputDir, '__init__.py');
    await fs.writeFile(initFilePath, '# Test package');
    generatedFiles.push(initFilePath);
    
    return generatedFiles;
  }
  
  /**
   * Execute tests using pytest
   * @param testDir Directory containing the tests
   * @param testFile Specific test file to run
   * @returns Test execution result
   */
  private async executePytestTests(testDir?: string, testFile?: string): Promise<TestExecutionResult> {
    return new Promise((resolve) => {
      // Prepare pytest command
      const args = ['-v', '--json-report', '--json-report-file=-'];
      
      if (testFile) {
        args.push(testFile);
      } else if (testDir) {
        args.push(testDir);
      }
      
      // Execute pytest
      const startTime = Date.now();
      const pytestProcess = spawn('python', ['-m', 'pytest', ...args]);
      
      let stdout = '';
      let stderr = '';
      
      pytestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pytestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pytestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          // Parse pytest JSON output
          const jsonOutput = stdout.substring(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1);
          const pytestResult = JSON.parse(jsonOutput);
          
          const summary = pytestResult.summary;
          
          const result: TestExecutionResult = {
            success: summary.failed === 0,
            testsPassed: summary.passed,
            testsFailed: summary.failed,
            testsSkipped: summary.skipped,
            duration,
            output: stdout
          };
          
          if (summary.failed > 0) {
            result.errorMessage = this.extractPytestErrorMessage(pytestResult);
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
            errorMessage: code === 0 ? undefined : `pytest exited with code ${code}`
          });
        }
      });
    });
  }
  
  /**
   * Execute tests using unittest
   * @param testDir Directory containing the tests
   * @param testFile Specific test file to run
   * @returns Test execution result
   */
  private async executeUnittestTests(testDir?: string, testFile?: string): Promise<TestExecutionResult> {
    return new Promise((resolve) => {
      // Prepare unittest command
      let args: string[] = [];
      
      if (testFile) {
        // For a specific file, use the module name
        const moduleName = testFile.replace(/\.py$/, '').replace(/\//g, '.');
        args = ['-m', 'unittest', moduleName];
      } else if (testDir) {
        // For a directory, use discover
        args = ['-m', 'unittest', 'discover', testDir];
      } else {
        // Default to discover in current directory
        args = ['-m', 'unittest', 'discover'];
      }
      
      // Execute unittest
      const startTime = Date.now();
      const unittestProcess = spawn('python', args);
      
      let stdout = '';
      let stderr = '';
      
      unittestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      unittestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      unittestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        // Parse unittest output (it doesn't have JSON output)
        const output = stdout || stderr;
        
        // Try to extract test counts from the output
        const passedMatch = output.match(/Ran (\d+) tests? in/);
        const failedMatch = output.match(/FAILED \((?:failures=(\d+))?(?:, )?(?:errors=(\d+))?/);
        const skippedMatch = output.match(/skipped=(\d+)/);
        
        const testsPassed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
        const testsFailed = failedMatch ? 
          (parseInt(failedMatch[1] || '0', 10) + parseInt(failedMatch[2] || '0', 10)) : 
          (code === 0 ? 0 : 1);
        const testsSkipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        
        resolve({
          success: code === 0,
          testsPassed: testsPassed - testsFailed - testsSkipped,
          testsFailed,
          testsSkipped,
          duration,
          output,
          errorMessage: code === 0 ? undefined : this.extractUnittestErrorMessage(output)
        });
      });
    });
  }
  
  /**
   * Extract error message from pytest result
   * @param pytestResult pytest result object
   * @returns Error message
   */
  private extractPytestErrorMessage(pytestResult: any): string {
    if (!pytestResult.tests || pytestResult.tests.length === 0) {
      return 'Unknown error';
    }
    
    const failedTests = pytestResult.tests.filter((test: any) => test.outcome === 'failed');
    
    if (failedTests.length === 0) {
      return 'Unknown error';
    }
    
    return failedTests
      .map((test: any) => {
        const nodeid = test.nodeid;
        const message = test.call?.longrepr || 'Test failed';
        return `${nodeid}: ${message}`;
      })
      .join('\n\n');
  }
  
  /**
   * Extract error message from unittest output
   * @param output unittest output
   * @returns Error message
   */
  private extractUnittestErrorMessage(output: string): string {
    // Extract error messages from unittest output
    const errorSection = output.split('======================================================================');
    
    if (errorSection.length <= 1) {
      return 'Unknown error';
    }
    
    // Return all error sections
    return errorSection
      .slice(1)
      .map(section => section.trim())
      .filter(section => section.length > 0)
      .join('\n\n');
  }
}
