FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "No build script found"

# Make the server executable
RUN chmod +x dist/servers/mcp-neo4j-memory/main.js

# Command to run the server
CMD ["node", "dist/servers/mcp-neo4j-memory/main.js"]
