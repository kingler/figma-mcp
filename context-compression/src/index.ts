#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { syllable } from 'syllable';
import * as LZString from 'lz-string';

class CompressionService {
  private keywordPattern = /\b(function|class|const|let|var|if|else|for|while|return|async|await|import|export)\b/g;

  compressText(text: string, options: any = {}): string {
    // Default compression level (0.0-1.0 where 1.0 is max compression)
    const compressionLevel = options.compressionLevel || 0.5;

    if (options.removeVowels) {
      // At high compression levels, remove more characters
      if (compressionLevel > 0.7) {
        return text.replace(/[aeiou]/gi, '').replace(/\s+/g, ' ');
      }
      return text.replace(/[aeiou]/gi, '');
    }

    const words = text.split(/(\s+)/);
    const compressed = words.map(part => {
      if (part.trim().length === 0) return part;
      if (options.preserveKeywords && part.match(this.keywordPattern)) {
        return part;
      }

      // Adjust syllable threshold based on compression level
      const syllableThreshold = Math.max(1, Math.floor(4 - compressionLevel * 3));
      const syllableCount = syllable(part);
      
      if (syllableCount > syllableThreshold) {
        const firstChar = part[0];
        const lastPart = part.slice(-2);
        return `${firstChar}${syllableCount}${lastPart}`;
      }
      return part;
    }).join('');
    
    // Apply LZString compression if requested
    if (options.useLZString) {
      const encodedOriginal = LZString.compressToBase64(text);
      return `${compressed}___${encodedOriginal}`;
    }
    
    return compressed;
  }

  decompressText(text: string, options: any = {}): string {
    // Check if this is an LZString compressed text
    const parts = text.split('___');
    if (parts.length === 2) {
      const decompressed = LZString.decompressFromBase64(parts[1]);
      if (decompressed) return decompressed;
    }
    
    // If not LZString compressed, try to reverse vowel removal (basic heuristic)
    if (options.removeVowels) {
      return text.replace(/([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/gi, '$1a$2');
    }
    
    return text;
  }

  analyzeCompression(original: string, compressed: string): any {
    const originalLength = original.length;
    const compressedLength = compressed.length;
    const compressionRatio = compressedLength / originalLength;
    const spaceSavings = 1 - compressionRatio;
    
    // Calculate token-based metrics (approximation)
    const originalTokens = original.split(/\s+/).length;
    const compressedTokens = compressed.split(/\s+/).length;
    const tokenRatio = compressedTokens / originalTokens;
    
    // Estimate readability change
    const originalWords = original.split(/\s+/);
    const compressedWords = compressed.split(/\s+/);
    const avgOriginalWordLength = originalWords.reduce((sum, word) => sum + word.length, 0) / originalWords.length;
    const avgCompressedWordLength = compressedWords.reduce((sum, word) => sum + word.length, 0) / compressedWords.length;
    
    return {
      originalLength,
      compressedLength,
      compressionRatio,
      spaceSavings: (spaceSavings * 100).toFixed(2) + '%',
      originalTokens,
      compressedTokens,
      tokenRatio,
      tokenSavings: ((1 - tokenRatio) * 100).toFixed(2) + '%',
      readabilityMetrics: {
        avgOriginalWordLength,
        avgCompressedWordLength,
      }
    };
  }
}

class CompressionServer {
  private server: Server;
  private service: CompressionService;

  constructor() {
    this.service = new CompressionService();
    this.server = new Server(
      {
        name: 'context-compression',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            compress_context: {
              name: 'compress_context',
              description: 'Compress text while preserving meaning',
              inputSchema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  options: {
                    type: 'object',
                    properties: {
                      preserveKeywords: { type: 'boolean' },
                      removeVowels: { type: 'boolean' },
                      compressionLevel: { type: 'number' },
                      useLZString: { type: 'boolean' }
                    },
                  },
                },
                required: ['text'],
              },
            },
            decompress_context: {
              name: 'decompress_context',
              description: 'Decompress text',
              inputSchema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  options: {
                    type: 'object',
                    properties: {
                      removeVowels: { type: 'boolean' }
                    },
                  },
                },
                required: ['text'],
              },
            },
            analyze_compression: {
              name: 'analyze_compression',
              description: 'Analyze compression results',
              inputSchema: {
                type: 'object',
                properties: {
                  original: { type: 'string' },
                  compressed: { type: 'string' },
                },
                required: ['original', 'compressed'],
              },
            },
          },
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.request = async (request) => {
      try {
        switch (request.method) {
          case 'initialize':
            console.error('Received initialize request with params:', JSON.stringify(request.params, null, 2));
            
            // Send initialized notification after initialize
            setTimeout(() => {
              console.error('Sending initialized notification');
              (this.server as any).notification({
                method: 'notifications/initialized'
              });
            }, 100);
            
            const response = {
              protocolVersion: '0.6.0',
              serverInfo: {
                name: 'context-compression',
                version: '0.1.0'
              },
              capabilities: {
                tools: (this.server as any).options.capabilities.tools
              }
            };
            
            console.error('Sending initialize response:', JSON.stringify(response, null, 2));
            return response;
            
          case 'tools/list':
            console.error('Received tools/list request');
            const tools = Object.values((this.server as any).options.capabilities.tools);
            console.error('Responding with tools:', JSON.stringify(tools, null, 2));
            return {
              tools
            };

          case 'tools/call': {
            const { name, arguments: args } = request.params as any;
            console.error(`Received tools/call request for tool "${name}" with args:`, JSON.stringify(args, null, 2));

            switch (name) {
              case 'compress_context': {
                const result = this.service.compressText(args.text, args.options);
                console.error('Compressed result:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                return {
                  content: [{
                    type: 'text',
                    text: result,
                  }],
                };
              }
              
              case 'decompress_context': {
                const result = this.service.decompressText(args.text, args.options || {});
                console.error('Decompressed result:', result.substring(0, 50) + (result.length > 50 ? '...' : ''));
                return {
                  content: [{
                    type: 'text',
                    text: result,
                  }],
                };
              }

              case 'analyze_compression':
                return {
                  content: [{
                    type: 'text',
                    text: JSON.stringify(
                      this.service.analyzeCompression(args.original, args.compressed),
                      null,
                      2
                    ),
                  }],
                };

              default:
                throw new McpError(
                  ErrorCode.MethodNotFound,
                  `Unknown tool: ${name}`
                );
            }
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown method: ${request.method}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Context Compression MCP server running on stdio');
  }
}

const server = new CompressionServer();
server.run().catch(console.error);
