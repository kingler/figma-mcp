#!/usr/bin/env node

/**
 * Search Shadcn Documentation Utility
 * 
 * This script allows you to search the shadcn documentation and examples
 * for specific components or keywords.
 * 
 * Usage:
 *   node scripts/search-shadcn-docs.js <search-term>
 * 
 * Example:
 *   node scripts/search-shadcn-docs.js button
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
const DOCS_DIR = path.join(SHADCN_DIR, 'docs');
const EXAMPLES_DIR = path.join(SHADCN_DIR, 'examples');
const EXAMPLES_CARDS_DIR = path.join(SHADCN_DIR, 'examples_cards');
const DUMP_FILE = path.join(SHADCN_DIR, 'shadcn_dump.json');

// Get command line arguments
const searchTerm = process.argv[2]?.toLowerCase();

if (!searchTerm) {
  console.error('Please provide a search term.');
  console.log('Usage: node scripts/search-shadcn-docs.js <search-term>');
  process.exit(1);
}

console.log(`Searching for "${searchTerm}" in shadcn documentation and examples...`);

// Function to highlight matching text
function highlightMatch(text, term) {
  const regex = new RegExp(term, 'gi');
  return text.replace(regex, match => `\x1b[1;33m${match}\x1b[0m`); // Yellow bold
}

// Search in documentation
const docFiles = fs.readdirSync(DOCS_DIR)
  .filter(file => file.endsWith('.mdx'))
  .filter(file => file.toLowerCase().includes(searchTerm));

if (docFiles.length > 0) {
  console.log('\n\x1b[1;36mMatching Documentation:\x1b[0m');
  docFiles.forEach(file => {
    const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
    const lines = content.split('\n').filter(line => 
      line.toLowerCase().includes(searchTerm)
    ).slice(0, 3); // Show up to 3 matching lines
    
    console.log(`- ${file.replace('.mdx', '')}`);
    if (lines.length > 0) {
      lines.forEach(line => {
        console.log(`  ${highlightMatch(line.trim(), searchTerm)}`);
      });
    }
  });
}

// Search in examples
const exampleFiles = fs.readdirSync(EXAMPLES_DIR)
  .filter(file => file.endsWith('.tsx'))
  .filter(file => file.toLowerCase().includes(searchTerm));

if (exampleFiles.length > 0) {
  console.log('\n\x1b[1;36mMatching Examples:\x1b[0m');
  exampleFiles.forEach(file => {
    console.log(`- ${file.replace('.tsx', '')}`);
  });
}

// Search in card examples
const cardExampleFiles = fs.readdirSync(EXAMPLES_CARDS_DIR)
  .filter(file => file.endsWith('.tsx'))
  .filter(file => file.toLowerCase().includes(searchTerm));

if (cardExampleFiles.length > 0) {
  console.log('\n\x1b[1;36mMatching Card Examples:\x1b[0m');
  cardExampleFiles.forEach(file => {
    console.log(`- ${file.replace('.tsx', '')}`);
  });
}

// Search in component metadata
if (fs.existsSync(DUMP_FILE)) {
  try {
    const metadata = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf8'));
    const matchingComponents = metadata.filter(component => 
      component.name.toLowerCase().includes(searchTerm) || 
      component.description.toLowerCase().includes(searchTerm)
    );
    
    if (matchingComponents.length > 0) {
      console.log('\n\x1b[1;36mMatching Components from Metadata:\x1b[0m');
      matchingComponents.forEach(component => {
        console.log(`- ${component.name}: ${highlightMatch(component.description, searchTerm)}`);
        
        // Show import example
        if (component.docs?.import?.code) {
          console.log(`  Import: ${highlightMatch(component.docs.import.code.split('\n')[0], searchTerm)}`);
        }
        
        // List associated examples
        if (component.docs?.examples?.length > 0) {
          console.log('  Examples:');
          component.docs.examples.slice(0, 3).forEach(example => {
            console.log(`  - ${example.source.replace('.tsx', '')}`);
          });
        }
        
        console.log(''); // Empty line for readability
      });
    }
  } catch (error) {
    console.error('Error parsing metadata file:', error.message);
  }
}

// If no results found
if (docFiles.length === 0 && exampleFiles.length === 0 && 
    cardExampleFiles.length === 0) {
  console.log('\nNo matching files found. Try a different search term.');
}

// Make the script executable
try {
  execSync(`chmod +x ${__filename}`);
} catch (error) {
  // Ignore chmod errors on Windows
} 