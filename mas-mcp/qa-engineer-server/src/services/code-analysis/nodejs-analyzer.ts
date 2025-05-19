import * as fs from 'fs-extra';
import * as path from 'path';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import { namedTypes } from 'ast-types';

import {
  CodeAnalysisResult,
  CodeAnalyzer,
  FunctionInfo,
  ClassInfo,
  ParameterInfo,
  PropertyInfo,
  ImportInfo,
  DependencyInfo
} from './types.js';

export class NodejsAnalyzer implements CodeAnalyzer {
  supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];

  async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    // Parse the file content into an AST
    const ast = acorn.parse(fileContent, {
      ecmaVersion: 2022,
      sourceType: 'module',
      locations: true
    });

    const functions: FunctionInfo[] = [];
    const classes: ClassInfo[] = [];
    const imports: ImportInfo[] = [];
    
    // Walk the AST to extract information
    acornWalk.simple(ast, {
      FunctionDeclaration: (node: any) => {
        functions.push(this.extractFunctionInfo(node, fileContent));
      },
      
      ArrowFunctionExpression: (node: any) => {
        if (node.parent && node.parent.type === 'VariableDeclarator') {
          functions.push(this.extractArrowFunctionInfo(node, node.parent, fileContent));
        }
      },
      
      ClassDeclaration: (node: any) => {
        classes.push(this.extractClassInfo(node, fileContent));
      },
      
      ImportDeclaration: (node: any) => {
        imports.push(this.extractImportInfo(node));
      }
    });

    // Extract dependencies from package.json if available
    const dependencies = await this.extractDependencies(filePath);

    return {
      fileName,
      language: 'nodejs',
      functions,
      classes,
      dependencies,
      imports
    };
  }

  private extractFunctionInfo(node: any, fileContent: string): FunctionInfo {
    const params = node.params.map((param: any) => this.extractParameterInfo(param));
    const functionBody = fileContent.substring(node.body.start, node.body.end);
    const docstring = this.extractDocstring(functionBody);
    
    return {
      name: node.id ? node.id.name : 'anonymous',
      params,
      returnType: this.extractReturnType(node),
      docstring,
      complexity: this.calculateComplexity(node),
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      isAsync: node.async,
      isExported: this.isExported(node)
    };
  }

  private extractArrowFunctionInfo(node: any, parent: any, fileContent: string): FunctionInfo {
    const params = node.params.map((param: any) => this.extractParameterInfo(param));
    const functionBody = fileContent.substring(node.body.start, node.body.end);
    const docstring = this.extractDocstring(functionBody);
    
    return {
      name: parent.id ? parent.id.name : 'anonymous',
      params,
      returnType: this.extractReturnType(node),
      docstring,
      complexity: this.calculateComplexity(node),
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      isAsync: node.async,
      isExported: this.isExported(parent)
    };
  }

  private extractParameterInfo(param: any): ParameterInfo {
    let name = '';
    let type: string | undefined = undefined;
    let defaultValue: string | undefined = undefined;
    let isRequired = true;

    if (param.type === 'Identifier') {
      name = param.name;
    } else if (param.type === 'AssignmentPattern') {
      name = param.left.name;
      defaultValue = this.getNodeValue(param.right);
      isRequired = false;
    } else if (param.type === 'RestElement') {
      name = `...${param.argument.name}`;
    } else if (param.type === 'ObjectPattern') {
      name = '{' + param.properties.map((p: any) => p.key.name).join(', ') + '}';
    } else if (param.type === 'ArrayPattern') {
      name = '[' + param.elements.map((e: any) => e ? e.name : '').join(', ') + ']';
    }

    // Try to extract type from TypeScript annotations if available
    if (param.typeAnnotation) {
      type = this.extractTypeAnnotation(param.typeAnnotation);
    }

    return {
      name,
      type,
      defaultValue,
      isRequired
    };
  }

  private extractClassInfo(node: any, fileContent: string): ClassInfo {
    const methods: FunctionInfo[] = [];
    const properties: PropertyInfo[] = [];
    const superClasses: string[] = [];
    
    // Extract superclass if exists
    if (node.superClass) {
      superClasses.push(node.superClass.name);
    }
    
    // Extract methods and properties
    for (const classElement of node.body.body) {
      if (classElement.type === 'MethodDefinition') {
        methods.push(this.extractMethodInfo(classElement, fileContent));
      } else if (classElement.type === 'PropertyDefinition') {
        properties.push(this.extractPropertyInfo(classElement));
      }
    }
    
    // Extract docstring
    const classBody = fileContent.substring(node.body.start, node.body.end);
    const docstring = this.extractDocstring(classBody);
    
    return {
      name: node.id.name,
      methods,
      properties,
      superClasses,
      docstring,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      isExported: this.isExported(node)
    };
  }

  private extractMethodInfo(node: any, fileContent: string): FunctionInfo {
    const params = node.value.params.map((param: any) => this.extractParameterInfo(param));
    const methodBody = fileContent.substring(node.value.body.start, node.value.body.end);
    const docstring = this.extractDocstring(methodBody);
    
    return {
      name: node.key.name || node.key.value,
      params,
      returnType: this.extractReturnType(node.value),
      docstring,
      complexity: this.calculateComplexity(node.value),
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      isAsync: node.value.async,
      isExported: false // Methods are not directly exported
    };
  }

  private extractPropertyInfo(node: any): PropertyInfo {
    return {
      name: node.key.name || node.key.value,
      type: node.typeAnnotation ? this.extractTypeAnnotation(node.typeAnnotation) : undefined,
      defaultValue: node.value ? this.getNodeValue(node.value) : undefined,
      isPrivate: node.key.name?.startsWith('_') || node.private === true
    };
  }

  private extractImportInfo(node: any): ImportInfo {
    const path = node.source.value;
    let name = '';
    let isDefault = false;
    let isNamespace = false;
    let namedImports: string[] = [];
    
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        name = specifier.local.name;
        isDefault = true;
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        name = specifier.local.name;
        isNamespace = true;
      } else if (specifier.type === 'ImportSpecifier') {
        namedImports.push(specifier.imported.name);
      }
    }
    
    return {
      name,
      path,
      isDefault,
      isNamespace,
      namedImports: namedImports.length > 0 ? namedImports : undefined
    };
  }

  private async extractDependencies(filePath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const projectRoot = this.findProjectRoot(filePath);
    
    if (!projectRoot) {
      return dependencies;
    }
    
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        
        if (packageJson.dependencies) {
          for (const [name, version] of Object.entries(packageJson.dependencies)) {
            dependencies.push({
              name,
              version: version as string,
              isDevDependency: false
            });
          }
        }
        
        if (packageJson.devDependencies) {
          for (const [name, version] of Object.entries(packageJson.devDependencies)) {
            dependencies.push({
              name,
              version: version as string,
              isDevDependency: true
            });
          }
        }
      } catch (error) {
        console.error('Error reading package.json:', error);
      }
    }
    
    return dependencies;
  }

  private findProjectRoot(filePath: string): string | null {
    let currentDir = path.dirname(filePath);
    const root = path.parse(currentDir).root;
    
    while (currentDir !== root) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  private extractDocstring(code: string): string | undefined {
    const docstringRegex = /\/\*\*([\s\S]*?)\*\//;
    const match = code.match(docstringRegex);
    
    if (match && match[1]) {
      return match[1]
        .split('\n')
        .map(line => line.trim().replace(/^\*\s*/, ''))
        .filter(line => line)
        .join('\n');
    }
    
    return undefined;
  }

  private extractReturnType(node: any): string | undefined {
    if (node.returnType && node.returnType.typeAnnotation) {
      return this.extractTypeAnnotation(node.returnType.typeAnnotation);
    }
    return undefined;
  }

  private extractTypeAnnotation(typeAnnotation: any): string {
    if (!typeAnnotation) return '';
    
    if (typeAnnotation.type === 'TSTypeAnnotation') {
      return this.extractTypeAnnotation(typeAnnotation.typeAnnotation);
    } else if (typeAnnotation.type === 'TSStringKeyword') {
      return 'string';
    } else if (typeAnnotation.type === 'TSNumberKeyword') {
      return 'number';
    } else if (typeAnnotation.type === 'TSBooleanKeyword') {
      return 'boolean';
    } else if (typeAnnotation.type === 'TSAnyKeyword') {
      return 'any';
    } else if (typeAnnotation.type === 'TSVoidKeyword') {
      return 'void';
    } else if (typeAnnotation.type === 'TSArrayType') {
      const elementType = this.extractTypeAnnotation(typeAnnotation.elementType);
      return `${elementType}[]`;
    } else if (typeAnnotation.type === 'TSTypeReference') {
      return typeAnnotation.typeName.name;
    } else if (typeAnnotation.type === 'TSUnionType') {
      return typeAnnotation.types.map((t: any) => this.extractTypeAnnotation(t)).join(' | ');
    } else if (typeAnnotation.type === 'TSIntersectionType') {
      return typeAnnotation.types.map((t: any) => this.extractTypeAnnotation(t)).join(' & ');
    }
    
    return 'unknown';
  }

  private calculateComplexity(node: any): number {
    let complexity = 1; // Base complexity
    
    // Count decision points (if, for, while, etc.)
    acornWalk.simple(node, {
      IfStatement: () => { complexity += 1; },
      ForStatement: () => { complexity += 1; },
      ForInStatement: () => { complexity += 1; },
      ForOfStatement: () => { complexity += 1; },
      WhileStatement: () => { complexity += 1; },
      DoWhileStatement: () => { complexity += 1; },
      ConditionalExpression: () => { complexity += 1; },
      SwitchCase: () => { complexity += 1; },
      CatchClause: () => { complexity += 1; },
      LogicalExpression: (node: any) => {
        if (node.operator === '&&' || node.operator === '||') {
          complexity += 1;
        }
      }
    });
    
    return complexity;
  }

  private isExported(node: any): boolean {
    if (!node.parent) return false;
    
    // Check for export declaration
    if (node.parent.type === 'ExportNamedDeclaration' || 
        node.parent.type === 'ExportDefaultDeclaration') {
      return true;
    }
    
    // Check for module.exports assignment
    if (node.parent.type === 'AssignmentExpression') {
      const left = node.parent.left;
      if (left.type === 'MemberExpression' && 
          left.object.name === 'module' && 
          left.property.name === 'exports') {
        return true;
      }
    }
    
    return false;
  }

  private getNodeValue(node: any): string | undefined {
    if (!node) return undefined;
    
    switch (node.type) {
      case 'Literal':
        return JSON.stringify(node.value);
      case 'Identifier':
        return node.name;
      case 'ArrayExpression':
        return '[...]';
      case 'ObjectExpression':
        return '{...}';
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return '() => {...}';
      case 'BinaryExpression':
        return `${this.getNodeValue(node.left)} ${node.operator} ${this.getNodeValue(node.right)}`;
      default:
        return '...';
    }
  }
}
