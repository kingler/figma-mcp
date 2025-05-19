import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SERVER_NAME: z.string().default('neo-orchestrator-server'),
  SERVER_VERSION: z.string().default('0.1.0'),
});

// Normalize config values (ensure lowercase) before parsing
const normalizedConfig = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL?.toLowerCase(),
  SERVER_NAME: process.env.SERVER_NAME,
  SERVER_VERSION: process.env.SERVER_VERSION,
};

// Parse and validate configuration
const config = ConfigSchema.parse(normalizedConfig);

export default config; 