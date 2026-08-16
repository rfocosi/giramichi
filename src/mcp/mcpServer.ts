import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, handleToolCall } from './tools.js';

import pkg from '../../package.json';

export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'giramichi-mcp-server',
      version: pkg.version || '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await handleToolCall(name, args || {});
  });

  return server;
}

async function runMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Giramichi MCP Server] Connected over Stdio');
}

// Only run automatically if executed directly as entrypoint
if (process.argv[1] && (process.argv[1].endsWith('mcpServer.ts') || process.argv[1].endsWith('mcpServer.js'))) {
  runMCPServer().catch((err) => {
    console.error('[Giramichi MCP Server Error]', err);
    process.exit(1);
  });
}

