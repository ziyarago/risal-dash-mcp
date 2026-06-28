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
import { fetchManifest, manifestToTools, callTool, DEMO_MANIFEST } from './lib.mjs';

const BASE = process.env.RISAL_ESP_URL || 'http://192.168.4.1';
const TOKEN = process.env.RISAL_MCP_TOKEN || '';

// Try the live device; if it's unreachable, start in DEMO mode so the server still advertises
// tools (registry introspection / trying it out without hardware). Bounded so it fails fast.
let manifest, demo = false;
try {
  manifest = await fetchManifest(BASE, TOKEN, (u) => fetch(u, { signal: AbortSignal.timeout(4000) }));
} catch (err) {
  demo = true;
  manifest = DEMO_MANIFEST;
  console.error(`risal-dash-mcp: device at ${BASE} not reachable (${err.message}); starting in DEMO mode. Set RISAL_ESP_URL/RISAL_MCP_TOKEN to a live RisalDash device.`);
}
const tools = manifestToTools(manifest);
const byName = new Map(tools.map((t) => [t.name, t]));

const server = new Server(
  { name: `risal-dash:${manifest.device || 'device'}`, version: '0.1.1' },
  { capabilities: { tools: {} } },
);

// Strip the internal _op/_key/_type before advertising.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ _op, _key, _type, ...pub }) => pub),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = byName.get(req.params.name);
  if (!tool) throw new Error(`unknown tool: ${req.params.name}`);
  if (demo) {
    return { content: [{ type: 'text', text: `(demo mode — no device) ${tool.name}: connect a real RisalDash device via RISAL_ESP_URL to ${tool._op === 'read' ? 'read' : 'set'} ${tool._key}.` }] };
  }
  const out = await callTool(BASE, tool, req.params.arguments || {}, fetch);
  return { content: [{ type: 'text', text: String(out) }] };
});

await server.connect(new StdioServerTransport());
console.error(`risal-dash-mcp: ${tools.length} tools${demo ? ' (demo)' : ''} from ${BASE}`);
