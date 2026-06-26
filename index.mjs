#!/usr/bin/env node
// RisalDash MCP bridge — exposes a RisalDash device's widgets as MCP tools over stdio,
// so an AI agent (Claude, etc.) can read sensors and drive controls.
//
//   RISAL_ESP_URL=http://192.168.4.1 RISAL_MCP_TOKEN=risal_pat_... npx risal-dash-mcp
//
// The device must be started with dash.enableMCP("<token>").
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { fetchManifest, manifestToTools, callTool } from './lib.mjs';

const BASE = process.env.RISAL_ESP_URL || 'http://192.168.4.1';
const TOKEN = process.env.RISAL_MCP_TOKEN || '';

const manifest = await fetchManifest(BASE, TOKEN);
const tools = manifestToTools(manifest);
const byName = new Map(tools.map((t) => [t.name, t]));

const server = new Server(
  { name: `risal-dash:${manifest.device || 'device'}`, version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// Strip the internal _op/_key/_type before advertising.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ _op, _key, _type, ...pub }) => pub),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = byName.get(req.params.name);
  if (!tool) throw new Error(`unknown tool: ${req.params.name}`);
  const out = await callTool(BASE, tool, req.params.arguments || {}, fetch);
  return { content: [{ type: 'text', text: String(out) }] };
});

await server.connect(new StdioServerTransport());
console.error(`risal-dash-mcp: ${tools.length} tools from ${BASE}`);
