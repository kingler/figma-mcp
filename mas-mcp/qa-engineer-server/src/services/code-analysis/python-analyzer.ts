import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

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

export class PythonAnalyzer implements CodeAnalyzer {
  supportedExtensions = ['.py'];

  async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Use Python's ast module to parse the file
    // We'll create a small Python script to analyze the file and return JSON
    const pythonScript = `
import ast
import json
import sys
import os
import re
from typing import Dict, List, Any, Optional, Tuple

def extract_docstring(node: ast.AST) -> Optional[str]:
    """Extract docstring from an AST node."""
    if not isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
        return None
    
    if not node.body:
        return None
    
    first_node = node.body[0]
    if isinstance(first_node, ast.Expr) and isinstance(first_node.value, ast.Str):
        return first_node.value.s
    
    return None

def get_param_info(param: ast.arg, defaults: List[ast.AST], default_offset: int) -> Dict[str, Any]:
    """Extract parameter information."""
    param_index = param.arg_offset if hasattr(param, 'arg_offset') else -1
    has_default = param_index >= 0 and param_index >= len(defaults) - default_offset
    
    param_info = {
        "name": param.arg,
        "type": getattr(param, 'annotation', None),
        "defaultValue": None,
        "isRequired": not has_default
    }
    
    # Extract type annotation if available
    if param.annotation:
        if isinstance(param.annotation, ast.Name):
            param_info["type"] = param.annotation.id
        elif isinstance(param.annotation, ast.Subscript):
            if isinstance(param.annotation.value, ast.Name):
                base_type = param.annotation.value.id
                if isinstance(param.annotation.slice, ast.Index):
                    if isinstance(param.annotation.slice.value, ast.Name):
                        param_type = f"{base_type}[{param.annotation.slice.value.id}]"
                    else:
                        param_type = f"{base_type}[...]"
                else:
                    param_type = f"{base_type}[...]"
                param_info["type"] = param_type
    
    # Extract default value if available
    if has_default:
        default_index = param_index - (len(defaults) - default_offset)
        if default_index >= 0 and default_index < len(defaults):
            default_node = defaults[default_index]
            if isinstance(default_node, ast.Str):
                param_info["defaultValue"] = f'"{default_node.s}"'
            elif isinstance(default_node, ast.Num):
                param_info["defaultValue"] = str(default_node.n)
            elif isinstance(default_node, ast.NameConstant):
                param_info["defaultValue"] = str(default_node.value)
            elif isinstance(default_node, ast.List):
                param_info["defaultValue"] = "[...]"
            elif isinstance(default_node, ast.Dict):
                param_info["defaultValue"] = "{...}"
            else:
                param_info["defaultValue"] = "..."
    
    return param_info

def calculate_complexity(node: ast.AST) -> int:
    """Calculate cyclomatic complexity of a function or method."""
    complexity = 1  # Base complexity
    
    class ComplexityVisitor(ast.NodeVisitor):
        def __init__(self):
            self.complexity = 0
        
        def visit_If(self, node):
            self.complexity += 1
            self.generic_visit(node)
        
        def visit_For(self, node):
            self.complexity += 1
            self.generic_visit(node)
        
        def visit_While(self, node):
            self.complexity += 1
            self.generic_visit(node)
        
        def visit_Try(self, node):
            self.complexity += len(node.handlers)
            self.generic_visit(node)
        
        def visit_BoolOp(self, node):
            if isinstance(node.op, ast.And) or isinstance(node.op, ast.Or):
                self.complexity += len(node.values) - 1
            self.generic_visit(node)
    
    visitor = ComplexityVisitor()
    visitor.visit(node)
    
    return complexity + visitor.complexity

def analyze_python_file(file_path: str) -> Dict[str, Any]:
    """Analyze a Python file and return structured information."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        return {
            "error": f"Syntax error: {str(e)}",
            "fileName": os.path.basename(file_path),
            "language": "python",
            "functions": [],
            "classes": [],
            "dependencies": [],
            "imports": []
        }
    
    functions = []
    classes = []
    imports = []
    
    # Extract module docstring
    module_docstring = extract_docstring(tree)
    
    # Process imports
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                imports.append({
                    "name": name.name,
                    "path": name.name,
                    "isDefault": True,
                    "isNamespace": False
                })
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for name in node.names:
                imports.append({
                    "name": name.name,
                    "path": f"{module}.{name.name}" if module else name.name,
                    "isDefault": False,
                    "isNamespace": False,
                    "namedImports": [name.name]
                })
    
    # Process functions
    for node in [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]:
        # Skip methods (they'll be handled in class processing)
        if isinstance(node.parent, ast.ClassDef):
            continue
        
        docstring = extract_docstring(node)
        
        # Process parameters
        params = []
        defaults = node.args.defaults
        
        # Handle positional args
        for i, arg in enumerate(node.args.args):
            arg.arg_offset = i
            params.append(get_param_info(arg, defaults, len(defaults)))
        
        # Handle keyword-only args
        kw_defaults = node.args.kw_defaults
        for i, arg in enumerate(node.args.kwonlyargs):
            arg.arg_offset = i
            params.append(get_param_info(arg, kw_defaults, len(kw_defaults)))
        
        # Extract return type
        return_type = None
        if node.returns:
            if isinstance(node.returns, ast.Name):
                return_type = node.returns.id
            elif isinstance(node.returns, ast.Subscript):
                if isinstance(node.returns.value, ast.Name):
                    return_type = f"{node.returns.value.id}[...]"
        
        # Check if function is exported (at module level)
        is_exported = node.parent == tree
        
        functions.append({
            "name": node.name,
            "params": params,
            "returnType": return_type,
            "docstring": docstring,
            "complexity": calculate_complexity(node),
            "startLine": node.lineno,
            "endLine": node.end_lineno if hasattr(node, 'end_lineno') else node.lineno,
            "isAsync": isinstance(node, ast.AsyncFunctionDef),
            "isExported": is_exported
        })
    
    # Process classes
    for node in [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]:
        docstring = extract_docstring(node)
        methods = []
        properties = []
        
        # Extract superclasses
        superclasses = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                superclasses.append(base.id)
            elif isinstance(base, ast.Attribute):
                superclasses.append(f"{base.value.id}.{base.attr}" if hasattr(base.value, 'id') else base.attr)
        
        # Process class body
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                method_docstring = extract_docstring(item)
                
                # Process parameters (skip 'self' or 'cls')
                params = []
                defaults = item.args.defaults
                
                # Handle positional args (skip first arg which is self/cls)
                for i, arg in enumerate(item.args.args[1:], start=1):
                    arg.arg_offset = i - 1  # Adjust for skipping self/cls
                    params.append(get_param_info(arg, defaults, len(defaults)))
                
                # Handle keyword-only args
                kw_defaults = item.args.kw_defaults
                for i, arg in enumerate(item.args.kwonlyargs):
                    arg.arg_offset = i
                    params.append(get_param_info(arg, kw_defaults, len(kw_defaults)))
                
                # Extract return type
                return_type = None
                if item.returns:
                    if isinstance(item.returns, ast.Name):
                        return_type = item.returns.id
                    elif isinstance(item.returns, ast.Subscript):
                        if isinstance(item.returns.value, ast.Name):
                            return_type = f"{item.returns.value.id}[...]"
                
                methods.append({
                    "name": item.name,
                    "params": params,
                    "returnType": return_type,
                    "docstring": method_docstring,
                    "complexity": calculate_complexity(item),
                    "startLine": item.lineno,
                    "endLine": item.end_lineno if hasattr(item, 'end_lineno') else item.lineno,
                    "isAsync": isinstance(item, ast.AsyncFunctionDef),
                    "isExported": False  # Methods are not directly exported
                })
            elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                # Class property with type annotation
                properties.append({
                    "name": item.target.id,
                    "type": item.annotation.id if isinstance(item.annotation, ast.Name) else "...",
                    "defaultValue": "..." if item.value else None,
                    "isPrivate": item.target.id.startswith('_')
                })
            elif isinstance(item, ast.Assign):
                # Class property without type annotation
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        properties.append({
                            "name": target.id,
                            "type": None,
                            "defaultValue": "...",
                            "isPrivate": target.id.startswith('_')
                        })
        
        # Check if class is exported (at module level)
        is_exported = node.parent == tree
        
        classes.append({
            "name": node.name,
            "methods": methods,
            "properties": properties,
            "superClasses": superclasses,
            "docstring": docstring,
            "startLine": node.lineno,
            "endLine": node.end_lineno if hasattr(node, 'end_lineno') else node.lineno,
            "isExported": is_exported
        })
    
    # Extract dependencies from requirements.txt or setup.py if available
    dependencies = []
    project_root = os.path.dirname(file_path)
    requirements_path = os.path.join(project_root, 'requirements.txt')
    setup_py_path = os.path.join(project_root, 'setup.py')
    
    if os.path.exists(requirements_path):
        with open(requirements_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = re.split(r'[=<>~]', line, 1)
                    name = parts[0].strip()
                    version = parts[1].strip() if len(parts) > 1 else None
                    dependencies.append({
                        "name": name,
                        "version": version,
                        "isDevDependency": False
                    })
    elif os.path.exists(setup_py_path):
        # Simple regex-based extraction from setup.py
        with open(setup_py_path, 'r') as f:
            content = f.read()
            # Look for install_requires or requires
            install_requires = re.search(r'install_requires\\s*=\\s*\\[([^\\]]+)\\]', content)
            if install_requires:
                deps = install_requires.group(1)
                for dep in re.finditer(r'[\'"]([^\'"]*)[\'"](\\s*,)?', deps):
                    dep_str = dep.group(1)
                    parts = re.split(r'[=<>~]', dep_str, 1)
                    name = parts[0].strip()
                    version = parts[1].strip() if len(parts) > 1 else None
                    dependencies.append({
                        "name": name,
                        "version": version,
                        "isDevDependency": False
                    })
    
    return {
        "fileName": os.path.basename(file_path),
        "language": "python",
        "functions": functions,
        "classes": classes,
        "dependencies": dependencies,
        "imports": imports
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = analyze_python_file(file_path)
    print(json.dumps(result, indent=2))
    `;
    
    // Write the Python script to a temporary file
    const tempScriptPath = path.join(process.env.TMPDIR || '/tmp', 'python_analyzer.py');
    await fs.writeFile(tempScriptPath, pythonScript);
    
    try {
      // Execute the Python script
      const result = await this.executePythonScript(tempScriptPath, [filePath]);
      const analysisResult = JSON.parse(result);
      
      // Clean up
      await fs.unlink(tempScriptPath);
      
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing Python file:', error);
      
      // Return a minimal result on error
      return {
        fileName,
        language: 'python',
        functions: [],
        classes: [],
        dependencies: [],
        imports: []
      };
    }
  }

  private async executePythonScript(scriptPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('python', [scriptPath, ...args]);
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (err) => {
        reject(err);
      });
    });
  }
}
