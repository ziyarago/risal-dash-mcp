// Offline tests for the bridge logic (no device, no MCP SDK needed): node test.mjs
import assert from 'node:assert';
import { manifestToTools, fetchManifest, callTool } from './lib.mjs';

const manifest = {
  device: 'greenhouse',
  tools: [
    { name: 'get_temp', op: 'read', key: 'temp', type: 'number' },
    { name: 'set_pump', op: 'write', key: 'pump', type: 'boolean' },
  ],
};

const tools = manifestToTools(manifest);
assert.equal(tools.length, 2);
assert.equal(tools[0].inputSchema.additionalProperties, false); // read takes no args
assert.deepEqual(tools[1].inputSchema.required, ['value']); // write requires value
assert.equal(tools[1].inputSchema.properties.value.type, 'boolean');
assert.match(tools[0].description, /greenhouse/);

// Mock fetch standing in for the ESP REST API.
const mockFetch = async (u) => {
  const s = u.toString();
  if (s.includes('/api/mcp/manifest')) return { ok: true, json: async () => manifest };
  if (s.includes('/api/state')) return { ok: true, json: async () => ({ temp: 24.3, pump: false }) };
  if (s.includes('/api/set')) {
    assert.ok(s.includes('pump=true'), 'set should encode key=value in the query');
    return { ok: true };
  }
  return { ok: false, status: 404 };
};

assert.equal(await fetchManifest('http://x', 'tok', mockFetch).then((m) => m.device), 'greenhouse');
assert.equal(await callTool('http://x', tools[0], {}, mockFetch), 24.3);
assert.equal(await callTool('http://x', tools[1], { value: true }, mockFetch), 'ok');

console.log('OK: bridge tests passed');
