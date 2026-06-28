// Pure bridge logic — maps a RisalDash device manifest to MCP tools and proxies
// tool calls to the device's REST API. Kept free of the MCP SDK so it is unit-testable.

// Sample manifest used when no live device is reachable, so the server still starts and
// advertises tools (e.g. for registry introspection / trying it out without hardware).
export const DEMO_MANIFEST = {
  device: 'demo-greenhouse',
  tools: [
    { name: 'get_temperature', op: 'read', key: 'Temperature', type: 'number' },
    { name: 'get_humidity', op: 'read', key: 'Humidity', type: 'number' },
    { name: 'set_pump', op: 'write', key: 'Pump', type: 'boolean' },
    { name: 'set_target', op: 'write', key: 'Target', type: 'number' },
  ],
};

// Map GET /api/mcp/manifest -> MCP tool descriptors (read tools take no args; write
// tools take a single `value`). The op/key/type fields are retained for dispatch.
export function manifestToTools(manifest) {
  const device = manifest.device || 'device';
  return (manifest.tools || []).map((t) => {
    const jsType = t.type === 'number' ? 'number' : t.type === 'boolean' ? 'boolean' : 'string';
    const inputSchema =
      t.op === 'read'
        ? { type: 'object', properties: {}, additionalProperties: false }
        : { type: 'object', properties: { value: { type: jsType } }, required: ['value'] };
    return {
      name: t.name,
      description: (t.op === 'read' ? `Read ${t.key}` : `Set ${t.key}`) + ` on ${device}`,
      inputSchema,
      _op: t.op,
      _key: t.key,
      _type: t.type,
    };
  });
}

export async function fetchManifest(baseUrl, token, fetchImpl = fetch) {
  const u = new URL('/api/mcp/manifest', baseUrl);
  if (token) u.searchParams.set('token', token);
  const r = await fetchImpl(u);
  if (!r.ok) throw new Error(`manifest request failed: ${r.status}`);
  return r.json();
}

// Dispatch one tool: read -> GET /api/state[key]; write -> GET /api/set?key=value.
export async function callTool(baseUrl, tool, args = {}, fetchImpl = fetch) {
  if (tool._op === 'read') {
    const r = await fetchImpl(new URL('/api/state', baseUrl));
    if (!r.ok) throw new Error(`state request failed: ${r.status}`);
    const state = await r.json();
    return state[tool._key];
  }
  const u = new URL('/api/set', baseUrl);
  u.searchParams.set(tool._key, String(args.value));
  const r = await fetchImpl(u);
  if (!r.ok) throw new Error(`set request failed: ${r.status}`);
  return 'ok';
}
