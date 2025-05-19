#!/usr/bin/env node

/**
 * Import Shadcn Example Utility
 * 
 * This script allows you to easily import example components from the shadcn directory
 * into your project's components directory.
 * 
 * Usage:
 *   node scripts/import-shadcn-example.js <example-name> [target-directory]
 * 
 * Example:
 *   node scripts/import-shadcn-example.js button-demo components/examples
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SHADCN_DIR = path.resolve(__dirname, '../src/shadcn');
const EXAMPLES_DIR = path.join(SHADCN_DIR, 'examples');
const EXAMPLES_CARDS_DIR = path.join(SHADCN_DIR, 'examples_cards');
const DEFAULT_TARGET_DIR = path.resolve(__dirname, '../components/examples');

// Get command line arguments
const exampleName = process.argv[2];
const targetDir = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_TARGET_DIR;

if (!exampleName) {
  console.error('Please provide an example name.');
  console.log('Usage: node scripts/import-shadcn-example.js <example-name> [target-directory]');
  process.exit(1);
}

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  console.log(`Creating target directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Search for the example in both directories
let sourcePath = path.join(EXAMPLES_DIR, `${exampleName}.tsx`);
let isCardExample = false;

if (!fs.existsSync(sourcePath)) {
  // Try card examples if not found in regular examples
  sourcePath = path.join(EXAMPLES_CARDS_DIR, `${exampleName}.tsx`);
  isCardExample = true;
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Example "${exampleName}" not found in either examples or examples_cards directories.`);
    
    // List available examples to help the user
    console.log('\nAvailable examples:');
    const regularExamples = fs.readdirSync(EXAMPLES_DIR)
      .filter(file => file.endsWith('.tsx'))
      .map(file => file.replace('.tsx', ''));
      
    const cardExamples = fs.readdirSync(EXAMPLES_CARDS_DIR)
      .filter(file => file.endsWith('.tsx'))
      .map(file => file.replace('.tsx', ''));
      
    console.log('Regular examples:', regularExamples.join(', '));
    console.log('Card examples:', cardExamples.join(', '));
    
    process.exit(1);
  }
}

// Read the example file
const content = fs.readFileSync(sourcePath, 'utf8');

// Path fixing: Replace @/components with relative paths
const fixedContent = content
  .replace(/@\/components\//g, '../ui/')
  .replace(/@\/registry\/default\/ui\//g, '../ui/');

// Write to target
const targetPath = path.join(targetDir, `${exampleName}.tsx`);
fs.writeFileSync(targetPath, fixedContent);

console.log(`Successfully copied ${isCardExample ? 'card example' : 'example'} "${exampleName}" to ${targetPath}`);
console.log('Remember to install any required shadcn/ui components using the mcp server.');

// Make the script executable
try {
  execSync(`chmod +x ${__filename}`);
} catch (error) {
  // Ignore chmod errors on Windows
} 