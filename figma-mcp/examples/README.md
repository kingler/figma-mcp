# Figma MCP Usage Examples

This directory contains examples of how to use the Figma MCP tools in real-world applications.

## Design Token Extractor

The `design-token-extractor.js` script demonstrates how to use the Figma MCP tools to extract design tokens from a Figma file and save them as CSS variables or a JSON configuration file.

### Usage

1. Set your Figma API key:
   ```bash
   export FIGMA_API_KEY=your_api_key_here
   ```

2. Set your Figma file key (the identifier in the Figma file URL):
   ```bash
   export FIGMA_FILE_KEY=your_file_key_here
   ```

3. Run the script:
   ```bash
   node design-token-extractor.js
   ```

4. The script will extract design tokens from your Figma file and save them as:
   - `output/design-tokens.css` - CSS variables
   - `output/design-tokens.json` - JSON configuration

## React Component Example

The `react-component.jsx` file demonstrates how to use the extracted design tokens in a React application.

### Integration Steps

1. Extract design tokens from your Figma file using the Design Token Extractor.
2. Import the generated CSS file in your React application:
   ```jsx
   import './design-tokens.css';
   ```
3. Use the design tokens as CSS variables in your component styles.

## Testing the Figma MCP Server

You can also use the `test-client.js` script in the main directory to test the Figma MCP server and its tools:

```bash
node test-client.js
```

This will start the Figma MCP server in stdio mode and test each tool with example parameters.

## Available Tools

The Figma MCP server provides several tools for interacting with Figma files:

1. **test** - Test the Figma MCP connection
2. **get-file** - Get information about a Figma file
3. **get-components** - List all components in a Figma file
4. **get-design-tokens** - Extract design tokens from a Figma file

## Using in Your Own Applications

To use the Figma MCP tools in your own applications:

1. Spawn the Figma MCP server process with stdio mode:
   ```javascript
   const child = spawn('node', [
     'path/to/figma-mcp/bin/cli.js',
     '--stdio',
     '--figma-api-key', 'your_api_key'
   ]);
   ```

2. Send requests to the server by writing JSON to the child process's stdin:
   ```javascript
   child.stdin.write(JSON.stringify({
     function: 'figma-mcp.get-design-tokens',
     args: { 
       fileKey: 'your_file_key',
       format: 'css'
     }
   }) + '\n');
   ```

3. Receive responses by reading from the child process's stdout:
   ```javascript
   child.stdout.on('data', (data) => {
     const response = JSON.parse(data.toString());
     // Process the response
   });
   ```

For more details, see the `design-token-extractor.js` example. 