/**
 * Types for test execution
 */

export interface TestExecutionResult {
  success: boolean;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  duration: number;
  output: string;
  errorMessage?: string;
}

export interface TestExecutor {
  /**
   * Execute tests in a specific directory
   * @param testDir Directory containing the tests
   * @returns Test execution result
   */
  executeTests(testDir: string): Promise<TestExecutionResult>;
  
  /**
   * Execute a specific test file
   * @param testFile Path to the test file
   * @returns Test execution result
   */
  executeTestFile(testFile: string): Promise<TestExecutionResult>;
  
  /**
   * Generate test files from test code
   * @param testCode Test code to write to files
   * @param outputDir Directory to write the test files to
   * @returns Paths to the generated test files
   */
  generateTestFiles(testCode: string | Record<string, string>, outputDir: string): Promise<string[]>;
}
