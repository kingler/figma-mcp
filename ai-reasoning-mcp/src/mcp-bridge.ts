import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bridge to communicate with other MCP services
 * This is a simple implementation that uses child_process to invoke other MCPs
 * In a production environment, you would use a proper MCP client library
 */
export class MCPBridge {
  /**
   * Call the crawl4AI MCP to crawl URLs and get content
   */
  static async crawlUrls(urls: string[]): Promise<{
    content: string;
    citations: { [key: string]: string };
  }> {
    try {
      console.log('[MCPBridge] Calling crawl4AI MCP to crawl URLs:', urls);
      
      const result = await MCPBridge.callMCPTool('crawl4ai', 'crawl_urls', {
        urls: urls
      });
      
      return {
        content: result?.markdown || result?.content || '',
        citations: result?.citations || {}
      };
    } catch (error) {
      console.error('[MCPBridge] Error calling crawl4AI MCP:', error);
      throw error;
    }
  }
  
  /**
   * Call the web_search MCP to perform a web search
   */
  static async webSearch(query: string): Promise<{
    snippets: string[];
    urls: string[];
  }> {
    try {
      console.log('[MCPBridge] Calling web_search MCP with query:', query);
      
      const result = await MCPBridge.callMCPTool('web_search', 'web_search', {
        search_term: query
      });
      
      // Extract URLs and snippets from search results
      const urls: string[] = [];
      const snippets: string[] = [];
      
      if (result && Array.isArray(result.results)) {
        result.results.forEach((item: any) => {
          if (item.url) urls.push(item.url);
          if (item.snippet) snippets.push(item.snippet);
        });
      }
      
      return { urls, snippets };
    } catch (error) {
      console.error('[MCPBridge] Error calling web_search MCP:', error);
      return { urls: [], snippets: [] };
    }
  }
  
  /**
   * Generic method to call any MCP tool
   */
  private static async callMCPTool(
    mcpName: string,
    toolName: string,
    params: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Construct the MCP command based on configuration
        const cmd = process.env.NODE_ENV === 'development' 
          ? 'node' // Development environment
          : process.platform === 'win32'
            ? 'cmd.exe'
            : 'sh';
            
        const args = process.env.NODE_ENV === 'development'
          ? ['-e', `console.log(JSON.stringify({result: {success: true, data: "Mock data for ${mcpName}/${toolName}"}}))`]
          : process.platform === 'win32'
            ? ['/c', 'echo', `{"result": {"success": true, "data": "Mock data for ${mcpName}/${toolName}"}}`]
            : ['-c', 'echo', `{"result": {"success": true, "data": "Mock data for ${mcpName}/${toolName}"}}`];
        
        // In a real implementation, construct proper MCP request
        // We're returning mock data for now
        
        // Create a unique request ID
        const requestId = uuidv4();
        
        // Log the command
        console.log(`[MCPBridge] Executing MCP call: ${mcpName}.${toolName} with request ID ${requestId}`);
        
        // Execute the MCP command
        const child = spawn(cmd, args);
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code !== 0) {
            console.error(`[MCPBridge] MCP call failed with code ${code}: ${stderr}`);
            reject(new Error(`MCP call failed with code ${code}: ${stderr}`));
            return;
          }
          
          try {
            // Parse and extract the result
            const result = JSON.parse(stdout);
            
            // Mock different results based on the MCP and tool
            if (mcpName === 'crawl4ai' && toolName === 'crawl_urls') {
              // Mock response for crawl4ai
              const mockResponse = {
                markdown: `# Content from URLs\n\nThis is extracted content from ${params.urls.join(', ')}.\n\n## Key Concepts\n\n- Concept A: Description of concept A\n- Concept B: Related to concept A\n- Concept C: Another important domain concept\n\n## Relationships\n\n- Concept A is a type of parent concept\n- Concept B is related to Concept C\n- Concept A has property X`,
                citations: params.urls.reduce((acc: any, url: string) => {
                  acc[url] = `Citation for ${url}`;
                  return acc;
                }, {})
              };
              resolve(mockResponse);
            } else if (mcpName === 'web_search' && toolName === 'web_search') {
              // Mock response for web_search
              const mockUrls = [
                `https://example.com/search/${encodeURIComponent(params.search_term)}/1`,
                `https://example.com/search/${encodeURIComponent(params.search_term)}/2`,
                `https://example.com/search/${encodeURIComponent(params.search_term)}/3`
              ];
              
              const mockResponse = {
                results: mockUrls.map((url, i) => ({
                  url,
                  title: `Result ${i+1} for ${params.search_term}`,
                  snippet: `This is a snippet from result ${i+1} about ${params.search_term}.`
                }))
              };
              resolve(mockResponse);
            } else {
              // Default mock response
              resolve(result);
            }
          } catch (error) {
            console.error('[MCPBridge] Error parsing MCP response:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          console.error('[MCPBridge] Error executing MCP command:', error);
          reject(error);
        });
        
      } catch (error) {
        console.error('[MCPBridge] Unexpected error calling MCP tool:', error);
        reject(error);
      }
    });
  }
} 