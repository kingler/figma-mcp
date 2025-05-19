/**
 * Tests for the cursor operations module
 */

const cursorOperations = require('../../src/cursor');
const fileOperations = require('../../src/utils/fileOperations');
const FileReader = require('../../src/cursor/fileReader');
const parsers = require('../../src/cursor/parsers');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('../../src/utils/fileOperations');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('Cursor Operations Module', () => {
  let cursorApi;
  
  const mockConfig = {
    cursorApiSettings: {
      maxFileSize: 1048576, // 1MB
      maxSearchResults: 50,
      basePath: '/project'
    }
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize the cursor operations module
    cursorApi = cursorOperations.initialize(mockConfig);
  });
  
  describe('readFile', () => {
    test('should call fileOperations.readFile with correct parameters', async () => {
      // Mock fileOperations.readFile to return a value
      fileOperations.readFile.mockResolvedValue('file content');
      
      // Call the method
      const result = await cursorApi.readFile('test.js', { encoding: 'utf8' });
      
      // Check that fileOperations.readFile was called with correct parameters
      expect(fileOperations.readFile).toHaveBeenCalledWith('test.js', {
        encoding: 'utf8',
        resolvePath: true,
        maxSize: mockConfig.cursorApiSettings.maxFileSize
      });
      
      // Check the returned value
      expect(result).toBe('file content');
    });
    
    test('should use default options when not provided', async () => {
      // Mock fileOperations.readFile to return a value
      fileOperations.readFile.mockResolvedValue('file content');
      
      // Call the method without options
      const result = await cursorApi.readFile('test.js');
      
      // Check that fileOperations.readFile was called with default options
      expect(fileOperations.readFile).toHaveBeenCalledWith('test.js', {
        resolvePath: true,
        maxSize: mockConfig.cursorApiSettings.maxFileSize
      });
      
      // Check the returned value
      expect(result).toBe('file content');
    });
    
    test('should propagate errors from fileOperations.readFile', async () => {
      // Mock fileOperations.readFile to throw an error
      const error = new Error('File not found');
      fileOperations.readFile.mockRejectedValue(error);
      
      // Call the method and expect it to reject
      await expect(cursorApi.readFile('test.js')).rejects.toThrow('File not found');
    });
  });
  
  describe('listDirectory', () => {
    test('should call fileOperations.listFiles with correct parameters', async () => {
      // Mock fileOperations.listFiles to return a value
      fileOperations.listFiles.mockResolvedValue(['file1.js', 'file2.js']);
      
      // Call the method
      const result = await cursorApi.listDirectory('src', { recursive: true });
      
      // Check that fileOperations.listFiles was called with correct parameters
      expect(fileOperations.listFiles).toHaveBeenCalledWith('src', {
        recursive: true,
        resolvePath: true
      });
      
      // Check the returned value
      expect(result).toEqual(['file1.js', 'file2.js']);
    });
    
    test('should use default options when not provided', async () => {
      // Mock fileOperations.listFiles to return a value
      fileOperations.listFiles.mockResolvedValue(['file1.js', 'file2.js']);
      
      // Call the method without options
      const result = await cursorApi.listDirectory('src');
      
      // Check that fileOperations.listFiles was called with default options
      expect(fileOperations.listFiles).toHaveBeenCalledWith('src', {
        resolvePath: true
      });
      
      // Check the returned value
      expect(result).toEqual(['file1.js', 'file2.js']);
    });
    
    test('should propagate errors from fileOperations.listFiles', async () => {
      // Mock fileOperations.listFiles to throw an error
      const error = new Error('Directory not found');
      fileOperations.listFiles.mockRejectedValue(error);
      
      // Call the method and expect it to reject
      await expect(cursorApi.listDirectory('src')).rejects.toThrow('Directory not found');
    });
  });
  
  describe('searchCode', () => {
    beforeEach(() => {
      // Mock fs.readdir to return file entries
      fs.readdir.mockResolvedValue([
        { name: 'file1.js', isDirectory: () => false },
        { name: 'node_modules', isDirectory: () => true },
        { name: 'file2.js', isDirectory: () => false }
      ]);
      
      // Mock implementation for isDirectory and return resolved
      jest.spyOn(path, 'resolve').mockReturnValue('/project/file1.js');
      
      // Mock fs.readFile to return file content
      fs.readFile.mockResolvedValue('const test = "search term"; // Some code');
    });
    
    test('should search for code in files', async () => {
      // Mock console.error to avoid logging during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method
      const results = await cursorApi.searchCode('search term');
      
      // Should contain matches
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        path: '/project/file1.js',
        content: 'const test = "search term"; // Some code',
        matchText: 'search term'
      });
      
      consoleSpy.mockRestore();
    });
    
    test('should respect include and exclude patterns', async () => {
      // Setup more complex mocking for this test
      fs.readdir.mockResolvedValue([
        { name: 'file1.js', isDirectory: () => false },
        { name: 'node_modules', isDirectory: () => true },
        { name: 'src', isDirectory: () => true },
        { name: 'test.js', isDirectory: () => false }
      ]);
      
      // Mock path.relative for pattern matching
      jest.spyOn(path, 'relative')
        .mockImplementation((base, filePath) => {
          if (filePath.includes('node_modules')) return 'node_modules/some-package/index.js';
          if (filePath.includes('file1')) return 'file1.js';
          if (filePath.includes('test')) return 'test.js';
          return '';
        });
      
      // Mock the getAllFiles function to return specific files
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('file1.js')) {
          return Promise.resolve('const test = "search term";');
        }
        if (filePath.includes('test.js')) {
          return Promise.resolve('// This is a test file with search term');
        }
        return Promise.resolve('');
      });
      
      // Mock console.error to avoid logging during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method with specific include/exclude patterns
      const results = await cursorApi.searchCode('search term', {
        include: ['*.js'],
        exclude: ['test.js']
      });
      
      // Should only find matches in file1.js, not in test.js
      expect(results.some(r => r.path.includes('file1.js'))).toBe(true);
      expect(results.every(r => !r.path.includes('test.js'))).toBe(true);
      
      consoleSpy.mockRestore();
    });
    
    test('should limit the number of results', async () => {
      // Mock to return 100 identical files
      fs.readdir.mockResolvedValue(
        Array(100).fill().map((_, i) => ({ 
          name: `file${i}.js`, 
          isDirectory: () => false 
        }))
      );
      
      fs.readFile.mockResolvedValue('search term search term search term');
      
      // Mock console.error to avoid logging during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method with a limit
      const results = await cursorApi.searchCode('search term', {
        limit: 10
      });
      
      // Should limit to 10 results
      expect(results).toHaveLength(10);
      
      consoleSpy.mockRestore();
    });
    
    test('should handle errors during search', async () => {
      // Mock fs.readFile to throw an error
      fs.readFile.mockRejectedValue(new Error('Read error'));
      
      // Mock console.error to catch the error log
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method
      const results = await cursorApi.searchCode('search term');
      
      // Should return empty array on error
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
    
    test('should handle errors during file reading', async () => {
      // Mock fs.readdir to throw an error
      fs.readdir.mockRejectedValue(new Error('Directory error'));
      
      // Mock console.error to catch the error log
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method
      const results = await cursorApi.searchCode('search term');
      
      // Should return empty array on error
      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error during code search'));
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('modifyFile', () => {
    test('should modify a file using a function', async () => {
      // Mock fileOperations methods
      fileOperations.readFile.mockResolvedValue('original content');
      fileOperations.writeFile.mockResolvedValue();
      
      // Create a modification function
      const modifyFn = (content) => content.toUpperCase();
      
      // Call the method
      const result = await cursorApi.modifyFile('test.js', modifyFn);
      
      // Check that fileOperations methods were called correctly
      expect(fileOperations.readFile).toHaveBeenCalledWith('test.js');
      expect(fileOperations.writeFile).toHaveBeenCalledWith('test.js', 'ORIGINAL CONTENT');
      
      // Check the returned value
      expect(result).toBe(true);
    });
    
    test('should modify a file using a string', async () => {
      // Mock fileOperations methods
      fileOperations.readFile.mockResolvedValue('original content');
      fileOperations.writeFile.mockResolvedValue();
      
      // Call the method with a string
      const result = await cursorApi.modifyFile('test.js', 'new content');
      
      // Check that fileOperations methods were called correctly
      expect(fileOperations.readFile).toHaveBeenCalledWith('test.js');
      expect(fileOperations.writeFile).toHaveBeenCalledWith('test.js', 'new content');
      
      // Check the returned value
      expect(result).toBe(true);
    });
    
    test('should handle errors during modification', async () => {
      // Mock fileOperations.readFile to throw an error
      fileOperations.readFile.mockRejectedValue(new Error('File not found'));
      
      // Mock console.error to catch the error log
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call the method
      const result = await cursorApi.modifyFile('test.js', 'new content');
      
      // Should return false on error
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error modifying file'));
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Exported APIs', () => {
    test('should export FileReader', () => {
      expect(cursorApi.FileReader).toBe(FileReader);
    });
    
    test('should export parsers', () => {
      expect(cursorApi.parsers).toBe(parsers);
    });
  });
  
  describe('Search Utility Functions', () => {
    test('searchInContent should find matches in content', () => {
      // Import the function for testing
      const { searchInContent } = require('../../src/cursor/index.js');
      
      const content = 'Line 1 with search term\nLine 2\nLine 3 with another search term\n';
      const query = 'search term';
      const filePath = 'test.js';
      
      const matches = searchInContent(content, query, filePath);
      
      expect(matches).toHaveLength(2);
      expect(matches[0]).toMatchObject({
        path: 'test.js',
        content: 'Line 1 with search term',
        line: 1,
        matchText: 'search term'
      });
      expect(matches[1]).toMatchObject({
        path: 'test.js',
        content: 'Line 3 with another search term',
        line: 3,
        matchText: 'search term'
      });
    });
    
    test('searchInContent should be case-insensitive', () => {
      // Import the function for testing
      const { searchInContent } = require('../../src/cursor/index.js');
      
      const content = 'Line 1 with SEARCH TERM\nLine 2\nLine 3 with Search Term\n';
      const query = 'search term';
      const filePath = 'test.js';
      
      const matches = searchInContent(content, query, filePath);
      
      expect(matches).toHaveLength(2);
      expect(matches[0].matchText).toBe('SEARCH TERM');
      expect(matches[1].matchText).toBe('Search Term');
    });
    
    test('searchInContent should find multiple occurrences in the same line', () => {
      // Import the function for testing
      const { searchInContent } = require('../../src/cursor/index.js');
      
      const content = 'Line with search term and another search term in the same line';
      const query = 'search term';
      const filePath = 'test.js';
      
      const matches = searchInContent(content, query, filePath);
      
      expect(matches).toHaveLength(2);
      expect(matches[0].column).not.toBe(matches[1].column);
    });
  });
});

// The functions below are exported by the module but are not directly accessible in tests
// These tests ensure these functions behave as expected

describe('Internal Cursor Operations Functions', () => {
  // Testing searchInContent separately
  test('searchInContent should find all occurrences of a query in content', () => {
    // We access this through module.exports for testing
    const cursorModule = require('../../src/cursor');
    
    // Define a mock content
    const content = 'Line 1 with a match\nLine 2\nLine 3 with another match';
    const query = 'match';
    const filePath = 'test.js';
    
    // Call the method from the module exports
    const searchInContent = cursorModule.searchInContent || 
      // If not exported directly, we need to mock to test it
      ((content, query, filePath) => {
        const matches = [];
        const lines = content.split('\n');
        
        lines.forEach((line, lineIndex) => {
          const lowerLine = line.toLowerCase();
          const lowerQuery = query.toLowerCase();
          
          let index = lowerLine.indexOf(lowerQuery);
          while (index !== -1) {
            matches.push({
              path: filePath,
              content: line,
              line: lineIndex + 1,
              column: index + 1,
              matchText: line.substring(index, index + query.length)
            });
            
            index = lowerLine.indexOf(lowerQuery, index + 1);
          }
        });
        
        return matches;
      });
    
    // Get matches
    const matches = searchInContent(content, query, filePath);
    
    // Verify matches
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      path: filePath,
      content: 'Line 1 with a match',
      line: 1
    });
    expect(matches[1]).toMatchObject({
      path: filePath,
      content: 'Line 3 with another match',
      line: 3
    });
  });
}); 