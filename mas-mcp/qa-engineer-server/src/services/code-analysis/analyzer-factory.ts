import * as path from 'path';
import * as os from 'os';

import { CodeAnalyzer } from './types.js';
import { NodejsAnalyzer } from './nodejs-analyzer.js';
import { PythonAnalyzer } from './python-analyzer.js';

export class CodeAnalyzerFactory {
  private analyzers: CodeAnalyzer[] = [];

  constructor() {
    // Register all available analyzers
    this.analyzers.push(new NodejsAnalyzer());
    this.analyzers.push(new PythonAnalyzer());
  }

  /**
   * Get the appropriate analyzer for a file
   * @param filePath Path to the file to analyze
   * @returns The appropriate analyzer or undefined if no analyzer supports the file
   */
  getAnalyzerForFile(filePath: string): CodeAnalyzer | undefined {
    const extension = path.extname(filePath).toLowerCase();
    
    // Find the first analyzer that supports this file extension
    return this.analyzers.find(analyzer => 
      analyzer.supportedExtensions.includes(extension)
    );
  }

  /**
   * Analyze a file
   * @param filePath Path to the file to analyze
   * @returns Analysis result or null if no analyzer supports the file
   */
  async analyzeFile(filePath: string) {
    const analyzer = this.getAnalyzerForFile(filePath);
    
    if (!analyzer) {
      throw new Error(`No analyzer available for file: ${filePath}`);
    }
    
    return analyzer.analyzeFile(filePath);
  }
}
