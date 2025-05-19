#!/bin/bash

# Script to fix build issues with MCP servers
echo "Starting MCP server build fixes..."

# Fix state-mcp-server
echo "Fixing state-mcp-server..."
cd /Users/kinglerbercy/MCP/state-mcp-server
npm install
npm run build

# Fix mcp-server-firecrawl
echo "Fixing mcp-server-firecrawl..."
cd /Users/kinglerbercy/MCP/mcp-server-firecrawl
npm install
npm run build

# Fix supabase-mcp-server
echo "Fixing supabase-mcp-server..."
cd /Users/kinglerbercy/MCP/supabase-mcp-server
pip install -r requirements.txt

# Fix ES Module import issues
echo "Fixing module import issues..."

# Fix supabase-server ES Module issues
cd /Users/kinglerbercy/MCP/supabase-server
sed -i '' 's/import { Client } from '\''pg'\'';/import pkg from '\''pg'\''; const { Client } = pkg;/' src/database.js

# Fix qdrant-server ES Module issues
cd /Users/kinglerbercy/MCP/qdrant-server
sed -i '' 's/"type": "commonjs"/"type": "module"/' package.json

# Fix analysis-mcp-server ES Module issues
cd /Users/kinglerbercy/MCP/analysis-mcp-server
sed -i '' 's/import { Client } from '\''pg'\'';/import pkg from '\''pg'\''; const { Client } = pkg;/' src/DBAnalyzer.js

# Generate .env templates for servers requiring API keys
echo "Creating environment variable templates..."

# SendGrid template
cat > /Users/kinglerbercy/MCP/sendgrid-mcp/.env << EOL
# SendGrid API Key - Replace with your actual key
SENDGRID_API_KEY=your_sendgrid_api_key_here
EOL

# Shopify template (if not already present)
cat > /Users/kinglerbercy/MCP/shopify-mcp-server/.env << EOL
# Shopify API credentials - Replace with your actual values
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here
MYSHOPIFY_DOMAIN=your-store.myshopify.com
EOL

echo "All fixes completed!"
echo "Remember to:"
echo "1. Replace API keys in .env files with actual values"
echo "2. Run the test framework to verify fixes" 