/**
 * Types for code analysis
 */

export interface CodeAnalysisResult {
  fileName: string;
  language: 'python' | 'nodejs';
  functions: FunctionInfo[];
  classes: ClassInfo[];
  dependencies: DependencyInfo[];
  imports: ImportInfo[];
}

export interface FunctionInfo {
  name: string;
  params: ParameterInfo[];
  returnType?: string;
  docstring?: string;
  complexity: number;
  startLine: number;
  endLine: number;
  isAsync: boolean;
  isExported: boolean;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isRequired: boolean;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  superClasses: string[];
  docstring?: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isPrivate: boolean;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  isDevDependency: boolean;
}

export interface ImportInfo {
  name: string;
  path: string;
  isDefault: boolean;
  isNamespace: boolean;
  namedImports?: string[];
}

export interface CodeAnalyzer {
  analyzeFile(filePath: string): Promise<CodeAnalysisResult>;
  supportedExtensions: string[];
}
