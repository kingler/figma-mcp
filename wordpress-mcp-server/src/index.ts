#!/usr/bin/env node
import { Server, StdioServerTransport } from '@modelcontextprotocol/sdk';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Rest of the file remains the same...
