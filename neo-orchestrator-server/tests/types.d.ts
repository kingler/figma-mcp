// Type declarations for MCP SDK
declare module '@modelcontextprotocol/sdk/client/index.js' {
  export class Client {
    constructor(info: any, options: any);
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    request(params: any, schema?: any, options?: any): Promise<any>;
  }
}

declare module '@modelcontextprotocol/sdk/client/stdio.js' {
  export class StdioClientTransport {
    constructor(options: any);
    start(): Promise<void>;
    close(): Promise<void>;
    stderr: any;
  }
}

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(info: any, options: any);
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    setRequestHandler(schema: any, handler: any): void;
    onerror: (error: any) => void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
    start(): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const CallToolRequestSchema: any;
  export const ErrorCode: {
    ParseError: number;
    InvalidRequest: number;
    MethodNotFound: number;
    InvalidParams: number;
    InternalError: number;
    ServerError: number;
  };
  export const ListResourcesRequestSchema: any;
  export const ListResourceTemplatesRequestSchema: any;
  export const ListToolsRequestSchema: any;
  export class McpError extends Error {
    constructor(code: number, message: string);
    code: number;
  }
  export const ReadResourceRequestSchema: any;
}

// Augment mocha
declare module 'mocha' {
  interface TestFunction {
    (title: string, fn?: Mocha.Func | Mocha.AsyncFunc): Mocha.Test;
    only(title: string, fn?: Mocha.Func | Mocha.AsyncFunc): Mocha.Test;
    skip(title: string, fn?: Mocha.Func | Mocha.AsyncFunc): Mocha.Test;
    retries(n: number): void;
  }

  global {
    const describe: {
      (title: string, fn: () => void): void;
      only(title: string, fn: () => void): void;
      skip(title: string, fn: () => void): void;
    };
    const it: TestFunction;
    const before: (fn: Mocha.AsyncFunc) => void;
    const after: (fn: Mocha.AsyncFunc) => void;
    const beforeEach: (fn: Mocha.AsyncFunc) => void;
    const afterEach: (fn: Mocha.AsyncFunc) => void;
  }
}