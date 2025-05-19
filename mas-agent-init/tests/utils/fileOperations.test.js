/**
 * Tests for the file operations utility module
 */
import { jest } from '@jest/globals';
import path from 'path';
import { 
  readFile, 
  writeFile, 
  appendFile, 
  createDirectory, 
  listFiles, 
  parseCodeFile 
} from '../../src/utils/fileOperations.js';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn()
}));

// Mock minimatch
jest.mock('minimatch', () => jest.fn());

// Import modules
import fs from 'fs/promises';
import minimatch from 'minimatch';

describe('File Operations Utilities', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default minimatch behavior
    minimatch.mockReturnValue(true);

    // Setup fs mock implementation
    fs.access.mockResolvedValue(undefined);
    fs.readFile.mockResolvedValue('file content');
    fs.writeFile.mockResolvedValue(undefined);
    fs.appendFile.mockResolvedValue(undefined);
    fs.mkdir.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([
      { 
        name: 'file1.txt', 
        isFile: () => true,
        isDirectory: () => false
      },
      {
        name: 'file2.js',
        isFile: () => true,
        isDirectory: () => false
      },
      {
        name: 'subdir',
        isFile: () => false,
        isDirectory: () => true
      }
    ]);
  });

  // readFile tests
  describe('readFile', () => {
    it('should read a file with default encoding', async () => {
      const filePath = 'test.txt';
      
      const content = await readFile(filePath);
      
      expect(content).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith(filePath, { encoding: 'utf8' });
    });
    
    it('should read a file with custom encoding', async () => {
      const filePath = 'test.txt';
      const encoding = 'ascii';
      
      const content = await readFile(filePath, { encoding });
      
      expect(content).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith(filePath, { encoding });
    });
    
    it('should throw an error if read fails', async () => {
      const filePath = 'test.txt';
      const errorMessage = 'File not found';
      fs.readFile.mockRejectedValue(new Error(errorMessage));
      
      await expect(readFile(filePath)).rejects.toThrow(
        `Failed to read file ${filePath}: ${errorMessage}`
      );
    });
  });

  // writeFile tests
  describe('writeFile', () => {
    it('should write content to a file', async () => {
      const filePath = 'test.txt';
      const content = 'file content';
      
      await writeFile(filePath, content);
      
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, { encoding: 'utf8' });
    });
    
    it('should create directory if it does not exist', async () => {
      const dirPath = 'dir';
      const filePath = path.join(dirPath, 'test.txt');
      const content = 'file content';
      
      // First call to access throws ENOENT, second succeeds
      fs.access.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
               .mockResolvedValueOnce(undefined);
      
      await writeFile(filePath, content);
      
      expect(fs.access).toHaveBeenCalledWith(dirPath);
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, { encoding: 'utf8' });
    });
    
    it('should throw an error if write fails', async () => {
      const filePath = 'test.txt';
      const content = 'file content';
      const errorMessage = 'Permission denied';
      
      fs.writeFile.mockRejectedValue(new Error(errorMessage));
      
      await expect(writeFile(filePath, content)).rejects.toThrow(
        `Failed to write file ${filePath}: ${errorMessage}`
      );
    });
  });

  // appendFile tests
  describe('appendFile', () => {
    it('should append content to a file', async () => {
      const filePath = 'test.txt';
      const content = 'appended content';
      
      await appendFile(filePath, content);
      
      expect(fs.appendFile).toHaveBeenCalledWith(filePath, content, { encoding: 'utf8' });
    });
    
    it('should throw an error if append fails', async () => {
      const filePath = 'test.txt';
      const content = 'appended content';
      const errorMessage = 'Permission denied';
      
      fs.appendFile.mockRejectedValue(new Error(errorMessage));
      
      await expect(appendFile(filePath, content)).rejects.toThrow(
        `Failed to append to file ${filePath}: ${errorMessage}`
      );
    });
  });

  // createDirectory tests
  describe('createDirectory', () => {
    it('should create a directory if it does not exist', async () => {
      const dirPath = 'dir';
      
      // Make fs.access throw to simulate non-existent directory
      fs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      await createDirectory(dirPath);
      
      expect(fs.access).toHaveBeenCalledWith(dirPath);
      expect(fs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });
    
    it('should not create a directory if it already exists', async () => {
      const dirPath = 'dir';
      
      // Make fs.access resolve to simulate existing directory
      fs.access.mockResolvedValue(undefined);
      
      await createDirectory(dirPath);
      
      expect(fs.access).toHaveBeenCalledWith(dirPath);
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
    
    it('should throw an error if directory creation fails', async () => {
      const dirPath = 'dir';
      const errorMessage = 'Permission denied';
      
      // Make fs.access throw to simulate non-existent directory
      fs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      
      // Make fs.mkdir throw to simulate creation failure
      fs.mkdir.mockRejectedValue(new Error(errorMessage));
      
      await expect(createDirectory(dirPath)).rejects.toThrow(
        `Failed to create directory ${dirPath}: ${errorMessage}`
      );
    });
  });

  // listFiles tests
  describe('listFiles', () => {
    it('should list files in a directory', async () => {
      const dirPath = 'dir';
      
      const files = await listFiles(dirPath);
      
      expect(fs.readdir).toHaveBeenCalledWith(dirPath, { withFileTypes: true });
      expect(files).toEqual([
        path.join(dirPath, 'file1.txt'),
        path.join(dirPath, 'file2.js')
      ]);
    });
    
    it('should list files recursively if specified', async () => {
      const dirPath = 'dir';
      const subdirPath = path.join(dirPath, 'subdir');
      
      // Mock recursive call return value
      const mockListFiles = jest.fn().mockResolvedValue([
        path.join(subdirPath, 'file3.js')
      ]);
      
      // Create a temporary backup and override with our mock
      const originalListFiles = listFiles;
      global.listFiles = mockListFiles;
      
      const files = await originalListFiles(dirPath, { recursive: true });
      
      // Restore original implementation
      global.listFiles = originalListFiles;
      
      expect(fs.readdir).toHaveBeenCalledWith(dirPath, { withFileTypes: true });
      expect(mockListFiles).toHaveBeenCalledWith(
        subdirPath, { recursive: true, pattern: '*' }
      );
      
      expect(files).toEqual([
        path.join(dirPath, 'file1.txt'),
        path.join(dirPath, 'file2.js'),
        path.join(subdirPath, 'file3.js')
      ]);
    });
    
    it('should filter files by pattern', async () => {
      const dirPath = 'dir';
      const pattern = '*.js';
      
      // Setup minimatch to return true only for .js files
      minimatch.mockImplementation((filename, pat) => {
        return filename.endsWith('.js');
      });
      
      const files = await listFiles(dirPath, { pattern });
      
      expect(fs.readdir).toHaveBeenCalledWith(dirPath, { withFileTypes: true });
      expect(minimatch).toHaveBeenCalledWith('file1.txt', pattern);
      expect(minimatch).toHaveBeenCalledWith('file2.js', pattern);
      expect(files).toEqual([path.join(dirPath, 'file2.js')]);
    });
    
    it('should throw an error if listing fails', async () => {
      const dirPath = 'dir';
      const errorMessage = 'EACCES: permission denied';
      
      fs.readdir.mockRejectedValue(new Error(errorMessage));
      
      await expect(listFiles(dirPath)).rejects.toThrow(
        `Failed to list files in ${dirPath}: ${errorMessage}`
      );
    });
  });

  // parseCodeFile tests
  describe('parseCodeFile', () => {
    it('should parse a code file with language detection', async () => {
      const filePath = 'file.js';
      const content = 'function test() { return true; }';
      
      // Mock the readFile function (but don't use jest.spyOn since it's the same module)
      const originalReadFile = readFile;
      
      // Create a mock implementation
      const mockReadFile = jest.fn().mockResolvedValue(content);
      
      // Replace the real function with our mock
      global.readFile = mockReadFile;
      
      const result = await parseCodeFile(filePath);
      
      // Restore the original function
      global.readFile = originalReadFile;
      
      expect(mockReadFile).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({
        content,
        language: 'javascript',
        extension: 'js'
      });
    });
    
    it('should handle unknown extensions as plaintext', async () => {
      const filePath = 'file.xyz';
      const content = 'Unknown content type';
      
      // Mock the readFile function
      const originalReadFile = readFile;
      const mockReadFile = jest.fn().mockResolvedValue(content);
      global.readFile = mockReadFile;
      
      const result = await parseCodeFile(filePath);
      
      // Restore the original function
      global.readFile = originalReadFile;
      
      expect(mockReadFile).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({
        content,
        language: 'plaintext',
        extension: 'xyz'
      });
    });
    
    it('should throw an error if file parsing fails', async () => {
      const filePath = 'file.js';
      const errorMessage = 'File not found';
      
      // Mock the readFile function to throw
      const originalReadFile = readFile;
      const mockReadFile = jest.fn().mockRejectedValue(new Error(errorMessage));
      global.readFile = mockReadFile;
      
      await expect(parseCodeFile(filePath)).rejects.toThrow(
        `Failed to parse code file ${filePath}: ${errorMessage}`
      );
      
      // Restore the original function
      global.readFile = originalReadFile;
    });
  });
}); 