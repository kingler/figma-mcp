import { z } from "zod";
import { createClient } from 'redis';

export const redisToolName = "redis";
export const redisToolDescription = "Access and manage Redis databases";

export const RedisToolSchema = z.object({
  action: z.enum([
    "set",
    "get",
    "delete",
    "list"
  ]).describe("Action to perform"),
  key: z.union([
    z.string(),
    z.array(z.string())
  ]).describe("Key or array of keys to operate on"),
  value: z.string().optional().describe("Value to store"),
  expireSeconds: z.number().optional().describe("Optional expiration time in seconds"),
  pattern: z.string().optional().default("*").describe("Pattern to match keys")
});

export async function runRedisTool(args: z.infer<typeof RedisToolSchema>) {
  try {
    // Get Redis URL from command line args or environment
    const redisUrl = process.argv[2] || process.env.REDIS_URL || "redis://localhost:6379";

    // Create client
    const client = createClient({
      url: redisUrl
    });

    // Connect to Redis
    await client.connect();

    try {
      switch (args.action) {
        case "set": {
          if (typeof args.key !== "string") {
            throw new Error("Key must be a string for set action");
          }
          if (!args.value) {
            throw new Error("Value is required for set action");
          }

          if (args.expireSeconds) {
            await client.setEx(args.key, args.expireSeconds, args.value);
          } else {
            await client.set(args.key, args.value);
          }

          return {
            content: [{
              type: "text",
              text: `Successfully set key: ${args.key}`
            }],
            isError: false
          };
        }

        case "get": {
          if (typeof args.key !== "string") {
            throw new Error("Key must be a string for get action");
          }

          const value = await client.get(args.key);
          if (value === null) {
            return {
              content: [{
                type: "text",
                text: `Key not found: ${args.key}`
              }],
              isError: false
            };
          }

          return {
            content: [{
              type: "text",
              text: value
            }],
            isError: false
          };
        }

        case "delete": {
          if (Array.isArray(args.key)) {
            await client.del(args.key);
            return {
              content: [{
                type: "text",
                text: `Successfully deleted ${args.key.length} keys`
              }],
              isError: false
            };
          } else {
            await client.del(args.key);
            return {
              content: [{
                type: "text",
                text: `Successfully deleted key: ${args.key}`
              }],
              isError: false
            };
          }
        }

        case "list": {
          const keys = await client.keys(args.pattern || "*");
          return {
            content: [{
              type: "text",
              text: keys.length > 0 
                ? `Found keys:\n${keys.join('\n')}`
                : "No keys found matching pattern"
            }],
            isError: false
          };
        }

        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } finally {
      await client.quit();
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
} 