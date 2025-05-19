import { jest } from '@jest/globals';
import path from 'path';

// Import the modules we want to test
import FileReader from '../../src/cursor/fileReader';
import * as parsers from '../../src/cursor/parsers';

// Mock dependencies
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
  access: jest.fn()
}));

jest.mock('../../src/cursor/parsers', () => ({
  parseJSON: jest.fn(),
  parseCSV: jest.fn(),
  parseYAML: jest.fn(),
  autoDetectAndParse: jest.fn(),
  parseByExtension: jest.fn()
}));

// Import the mocked fs module
import fs from 'fs/promises';

describe('FileReader', () => {
  // Test file path
  const testFilePath = '/test/path/file.txt';
  const jsonFilePath = '/test/path/file.json';
  const csvFilePath = '/test/path/file.csv';
  const yamlFilePath = '/test/path/file.yaml';
  const unknownFilePath = '/test/path/file.unknown';
  
  // Test file content
  const fileContent = 'This is a test file content';
  const jsonContent = '{"name": "Test", "value": 123}';
  const csvContent = 'name,value\nTest,123';
  const yamlContent = 'name: Test\nvalue: 123';
  
  // Test file stats
  const fileStats = {
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date('2023-01-01')
  };
  
  // Parsed content
  const parsedJson = { name: 'Test', value: 123 };
  const parsedCsv = [{ name: 'Test', value: '123' }];
  const parsedYaml = { name: 'Test', value: 123 };
  
  // FileReader instance
  let fileReader;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default return values for fs mocks
    fs.access.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue(fileStats);
    fs.readFile.mockImplementation((filePath) => {
      if (filePath === jsonFilePath) return Promise.resolve(jsonContent);
      if (filePath === csvFilePath) return Promise.resolve(csvContent);
      if (filePath === yamlFilePath) return Promise.resolve(yamlContent);
      if (filePath === unknownFilePath) return Promise.resolve(fileContent);
      return Promise.resolve(fileContent);
    });
    
    // Setup default behavior for parsers
    parsers.parseJSON.mockReturnValue(parsedJson);
    parsers.parseCSV.mockReturnValue(parsedCsv);
    parsers.parseYAML.mockReturnValue(parsedYaml);
    parsers.autoDetectAndParse.mockReturnValue(parsedJson);
    parsers.parseByExtension.mockImplementation((content, ext) => {
      if (ext === '.json') return parsedJson;
      if (ext === '.csv') return parsedCsv;
      if (ext === '.yaml' || ext === '.yml') return parsedYaml;
      return content;
    });
    
    // Create new FileReader instance
    fileReader = new FileReader();
  });
  
  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(fileReader.options).toEqual({
        encoding: 'utf8',
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedExtensions: null
      });
    });
    
    it('should initialize with custom options', () => {
      const customOptions = {
        encoding: 'ascii',
        maxSize: 5 * 1024 * 1024,
        allowedExtensions: ['.js', '.json']
      };
      
      const reader = new FileReader(customOptions);
      
      expect(reader.options).toEqual(customOptions);
    });
  });
  
  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      fs.access.mockResolvedValue(undefined);
      const result = await fileReader.fileExists(testFilePath);
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(testFilePath);
    });
    
    it('should return false if file does not exist', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.access.mockRejectedValue(error);
      
      const result = await fileReader.fileExists(testFilePath);
      
      expect(result).toBe(false);
      expect(fs.access).toHaveBeenCalledWith(testFilePath);
    });
    
    it('should throw if other error occurs', async () => {
      const error = new Error('Permission denied');
      error.code = 'EPERM';
      fs.access.mockRejectedValue(error);
      
      // Make sure our method properly handles the error
      try {
        await fileReader.fileExists(testFilePath);
        // If we get here, the test failed
        expect(true).toBe(false); // This will fail the test
      } catch (e) {
        expect(e.message).toBe(`Error checking file existence: ${error.message}`);
      }
    });
  });
  
  describe('getFileInfo', () => {
    it('should return file information correctly', async () => {
      const info = await fileReader.getFileInfo(testFilePath);
      
      expect(info).toEqual({
        path: testFilePath,
        size: fileStats.size,
        isFile: true,
        isDirectory: false,
        modifiedTime: fileStats.mtime
      });
      
      expect(fs.stat).toHaveBeenCalledWith(testFilePath);
    });
    
    it('should throw if file not found', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.stat.mockRejectedValue(error);
      
      try {
        await fileReader.getFileInfo(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`File not found: ${testFilePath}`);
      }
    });
    
    it('should throw if other error occurs', async () => {
      const error = new Error('Permission denied');
      error.code = 'EPERM';
      fs.stat.mockRejectedValue(error);
      
      try {
        await fileReader.getFileInfo(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`Error getting file info: ${error.message}`);
      }
    });
  });
  
  describe('readFile', () => {
    it('should reject unsupported file types when allowedExtensions is set', async () => {
      fileReader.options.allowedExtensions = ['.js', '.json'];
      
      try {
        await fileReader.readFile(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`File type not allowed: ${path.extname(testFilePath)}`);
      }
    });
    
    it('should reject files exceeding max size', async () => {
      // Set max size lower than file size
      fileReader.options.maxSize = 500;
      
      try {
        await fileReader.readFile(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`File size exceeds maximum allowed size: ${fileStats.size} > ${fileReader.options.maxSize}`);
      }
    });
    
    it('should read text file content correctly', async () => {
      const result = await fileReader.readFile(testFilePath);
      
      expect(result).toBe(fileContent);
      expect(fs.readFile).toHaveBeenCalledWith(testFilePath, { encoding: fileReader.options.encoding });
    });
    
    it('should parse JSON file content correctly', async () => {
      const result = await fileReader.readFile(jsonFilePath);
      
      expect(result).toEqual(parsedJson);
      expect(fs.readFile).toHaveBeenCalledWith(jsonFilePath, { encoding: fileReader.options.encoding });
      expect(parsers.parseByExtension).toHaveBeenCalledWith(jsonContent, '.json');
    });
    
    it('should parse CSV file content correctly', async () => {
      const result = await fileReader.readFile(csvFilePath);
      
      expect(result).toEqual(parsedCsv);
      expect(fs.readFile).toHaveBeenCalledWith(csvFilePath, { encoding: fileReader.options.encoding });
      expect(parsers.parseByExtension).toHaveBeenCalledWith(csvContent, '.csv');
    });
    
    it('should parse YAML file content correctly', async () => {
      const result = await fileReader.readFile(yamlFilePath);
      
      expect(result).toEqual(parsedYaml);
      expect(fs.readFile).toHaveBeenCalledWith(yamlFilePath, { encoding: fileReader.options.encoding });
      expect(parsers.parseByExtension).toHaveBeenCalledWith(yamlContent, '.yaml');
    });
    
    it('should auto-detect content format for unknown extensions', async () => {
      const result = await fileReader.readFile(unknownFilePath);
      
      expect(result).toEqual(parsedJson); // We're mocking that it detected JSON
      expect(fs.readFile).toHaveBeenCalledWith(unknownFilePath, { encoding: fileReader.options.encoding });
      expect(parsers.autoDetectAndParse).toHaveBeenCalledWith(fileContent);
    });
    
    it('should not parse content if parse option is false', async () => {
      const result = await fileReader.readFile(jsonFilePath, { parse: false });
      
      expect(result).toBe(jsonContent);
      expect(fs.readFile).toHaveBeenCalledWith(jsonFilePath, { encoding: fileReader.options.encoding });
      expect(parsers.parseByExtension).not.toHaveBeenCalled();
    });
    
    it('should throw if parsing fails', async () => {
      const parseError = new Error('Invalid JSON');
      parsers.parseByExtension.mockImplementation(() => {
        throw parseError;
      });
      
      try {
        await fileReader.readFile(jsonFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`Parsing error: ${parseError.message}`);
      }
    });
    
    it('should throw if reading fails', async () => {
      const readError = new Error('Read error');
      fs.readFile.mockRejectedValue(readError);
      
      try {
        await fileReader.readFile(testFilePath);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe(`Error reading file: ${readError.message}`);
      }
    });
    
    it('should use custom encoding if provided', async () => {
      const customEncoding = 'ascii';
      
      await fileReader.readFile(testFilePath, { encoding: customEncoding });
      
      expect(fs.readFile).toHaveBeenCalledWith(testFilePath, { encoding: customEncoding });
    });
  });
}); 