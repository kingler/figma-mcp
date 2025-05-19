#!/usr/bin/env node

/**
 * Generate Atomic Design Library
 * 
 * This script organizes shadcn components into an atomic design library structure,
 * grouping components into atoms, molecules, organisms, and templates.
 * 
 * Usage:
 *   node scripts/generate-atomic-library.js [output-directory]
 * 
 * Example:
 *   node scripts/generate-atomic-library.js components/atomic
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
const DUMP_FILE = path.join(SHADCN_DIR, 'shadcn_dump.json');
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../components/atomic');

// Get command line arguments
const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_DIR;

// Atomic design categories
const atomicMap = {
  atoms: [
    "button", "input", "label", "badge", "avatar", 
    "separator", "typography", "aspect-ratio", "scroll-area",
    "checkbox", "switch", "progress", "skeleton"
  ],
  molecules: [
    "form", "select", "radio-group", "textarea", "tooltip", 
    "dropdown-menu", "context-menu", "toggle", "calendar",
    "slider", "hover-card", "popover", "menubar"
  ],
  organisms: [
    "table", "card", "tabs", "accordion", "alert", 
    "alert-dialog", "dialog", "toast", "navigation-menu", 
    "command", "sheet", "data-table", "date-picker"
  ],
  templates: [
    "collapsible", "chat", "activity-goal", "share",
    "team-members", "payment-method", "stats"
  ]
};

// Create directory structure
console.log(`Creating atomic design directory structure in ${outputDir}...`);

// Create main output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create atomic category directories
Object.keys(atomicMap).forEach(category => {
  const categoryDir = path.join(outputDir, category);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
});

// Create index files for each category
function createIndexFile(category) {
  const indexPath = path.join(outputDir, category, 'index.ts');
  const components = atomicMap[category];
  
  let content = `/**
 * ${category.charAt(0).toUpperCase() + category.slice(1)} Components
 * 
 * This file exports all ${category} components according to atomic design methodology.
 */

`;

  components.forEach(component => {
    content += `export * from './${component}';\n`;
  });

  fs.writeFileSync(indexPath, content);
  console.log(`Created index file for ${category} components`);
}

Object.keys(atomicMap).forEach(createIndexFile);

// Create main index file
const mainIndexPath = path.join(outputDir, 'index.ts');
let mainContent = `/**
 * Atomic Design Component Library
 * 
 * This file exports all components organized by atomic design methodology.
 */

`;

Object.keys(atomicMap).forEach(category => {
  mainContent += `export * as ${category} from './${category}';\n`;
});

fs.writeFileSync(mainIndexPath, mainContent);

// Find examples for each component
if (fs.existsSync(DUMP_FILE)) {
  try {
    const metadata = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf8'));
    
    // For each atomic category
    Object.entries(atomicMap).forEach(([category, components]) => {
      console.log(`\nProcessing ${category}...`);
      
      // For each component in this category
      components.forEach(componentName => {
        // Find metadata for this component
        const componentMeta = metadata.find(meta => 
          meta.name.toLowerCase().includes(componentName)
        );
        
        if (!componentMeta) {
          console.log(`- ${componentName}: No metadata found`);
          return;
        }
        
        // Find the best example for this component
        const examples = componentMeta.docs?.examples || [];
        if (examples.length === 0) {
          console.log(`- ${componentName}: No examples found`);
          return;
        }
        
        // Prefer "demo" example if available
        const demoExample = examples.find(ex => ex.source.includes('demo'));
        const bestExample = demoExample || examples[0];
        
        // Get the example content
        let examplePath = path.join(EXAMPLES_DIR, bestExample.source);
        let isCardExample = false;
        
        if (!fs.existsSync(examplePath)) {
          // Try card examples if not found in regular examples
          examplePath = path.join(EXAMPLES_CARDS_DIR, bestExample.source);
          isCardExample = true;
          
          if (!fs.existsSync(examplePath)) {
            console.log(`- ${componentName}: Example file not found`);
            return;
          }
        }
        
        // Read the example content
        const content = fs.readFileSync(examplePath, 'utf8');
        
        // Fix import paths
        const fixedContent = content
          .replace(/@\/components\//g, '../../ui/')
          .replace(/@\/registry\/default\/ui\//g, '../../ui/');
        
        // Create component file
        const outputPath = path.join(outputDir, category, `${componentName}.tsx`);
        fs.writeFileSync(outputPath, fixedContent);
        
        console.log(`- ${componentName}: Created from ${isCardExample ? 'card ' : ''}example ${bestExample.source}`);
      });
    });
    
    console.log(`\nAtomic design library created successfully in ${outputDir}`);
    console.log(`To use this library, install the required shadcn/ui components with the MCP server.`);
    
  } catch (error) {
    console.error('Error parsing metadata file:', error.message);
  }
} else {
  console.error(`Metadata file not found: ${DUMP_FILE}`);
}

// Make the script executable
try {
  execSync(`chmod +x ${__filename}`);
} catch (error) {
  // Ignore chmod errors on Windows
} 