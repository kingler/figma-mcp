import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

describe('Documentation Manager Server', () => {
  it('should initialize and connect without errors', async () => {
    const server = new Server({
      name: 'documentation-manager-server',
      version: '1.0.0',
    });

    const transport = new StdioServerTransport();
    await expect(server.connect(transport)).resolves.not.toThrow();
  });
});