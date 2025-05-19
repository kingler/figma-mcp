#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { HydrogenClient } from './HydrogenClient/HydrogenClient.js';
import type { ComponentType, StylingOption } from './types';

// Load environment variables
config();

// Validate environment variables
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
if (!SHOPIFY_STOREFRONT_TOKEN) {
  console.error("Error: SHOPIFY_STOREFRONT_TOKEN environment variable is required");
  process.exit(1);
}

const MYSHOPIFY_DOMAIN = process.env.MYSHOPIFY_DOMAIN;
if (!MYSHOPIFY_DOMAIN) {
  console.error("Error: MYSHOPIFY_DOMAIN environment variable is required");
  process.exit(1);
}

// Initialize MCP server
const server = new Server({
  name: "github.com/pashpashpash/shopify-mcp-server",
  version: "1.0.0"
});

// Initialize Hydrogen client
const client = new HydrogenClient(MYSHOPIFY_DOMAIN, SHOPIFY_STOREFRONT_TOKEN);

// Register tool handlers
server.setRequestHandler(z.object({
  method: z.literal('create-component'),
  params: z.object({
    name: z.string(),
    type: z.enum(['product', 'collection', 'cart']),
    features: z.array(z.string()),
    styling: z.enum(['tailwind', 'css-modules']),
    outputDir: z.string()
  })
}), async (request) => {
  try {
    const result = await client.createComponent(request.params);

    return {
      content: [
        {
          type: "text",
          text: `Component created successfully:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to create component: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

server.setRequestHandler(z.object({
  method: z.literal('validate-access'),
  params: z.object({})
}), async () => {
  try {
    const isValid = await client.validateStorefrontAccess();
    return {
      content: [
        {
          type: "text",
          text: isValid 
            ? "Successfully validated Storefront API access"
            : "Failed to validate Storefront API access"
        }
      ],
      isError: !isValid
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error validating access: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

server.setRequestHandler(z.object({
  method: z.literal('get-shop-info'),
  params: z.object({})
}), async () => {
  try {
    const shopInfo = await client.getShopInfo();
    return {
      content: [
        {
          type: "text",
          text: `Shop Information:\n${JSON.stringify(shopInfo, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get shop info: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Shopify Hydrogen MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
