# risal-dash-mcp

MCP bridge that exposes a [RisalDash](https://dash.risal.io) device's widgets as tools
for an AI agent (Claude Desktop, Claude Code, …). It reads the device's
`GET /api/mcp/manifest`, turns every widget into a `get_*` / `set_*` tool, and proxies
calls to the device's `/api/state` and `/api/set` REST endpoints.

## Prerequisites

Start the firmware with MCP enabled:

```cpp
dash.enableMCP("risal_pat_yourtoken");
```

## Run

```bash
RISAL_ESP_URL=http://192.168.4.1 \
RISAL_MCP_TOKEN=risal_pat_yourtoken \
npx risal-dash-mcp
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "greenhouse": {
      "command": "npx",
      "args": ["risal-dash-mcp"],
      "env": {
        "RISAL_ESP_URL": "http://192.168.4.1",
        "RISAL_MCP_TOKEN": "risal_pat_yourtoken"
      }
    }
  }
}
```

The agent can then *read CPU*, *set Pump to on*, etc. — one tool per widget.

## Develop

```bash
node test.mjs   # offline logic tests (no device required)
```

MIT.
