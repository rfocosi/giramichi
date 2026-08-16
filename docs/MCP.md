# Giramichi MCP Integration Guide 🔌

> **Model Context Protocol (MCP) Server Setup & Connection Guide**

[Giramichi](../README.md) exposes an autonomous project management control plane through a Model Context Protocol (MCP) server. It supports **Stdio**, **SSE**, and **Streamable HTTP** transports, allowing modern AI coding assistants—such as **Claude Desktop**, **Claude Code**, **OpenCode**, **GitHub Copilot**, **Cursor**, **Windsurf**, **Google Antigravity**, and **Cline**—to create workflows, manage tasks, and update Kanban card statuses programmatically.

---

## 📋 Prerequisites

Before connecting your AI interface to the Giramichi MCP server, ensure you have:

1. **Node.js**: v18.x or higher installed.
2. **Dependencies Installed**: Run `npm install` inside your local Giramichi repository directory.

```bash
cd /path/to/giramichi
npm install
```

3. **Database Setup**: Giramichi automatically initializes SQLite database storage at `./data/giramichi.db` upon server start.

---

## ⚡ Connection Transports Overview

Giramichi supports both **Stdio** and **HTTP** transports for MCP integration:

### 1. HTTP MCP Transport (Remote / Local Server Mode)
When running the Giramichi server (`npm run server` or `npm run mcp:http`), Giramichi exposes HTTP MCP endpoints:

- **Streamable HTTP Endpoint** (MCP 2024-11-05 spec — recommended for remote connections):
  - URL: `http://localhost:3001/mcp`
  - Requires `POST` with `Accept: application/json, text/event-stream` header.
  - Returns `mcp-session-id` header — use it in subsequent requests.

- **SSE Transport Endpoint** (Legacy compatibility):
  - SSE Stream URL: `http://localhost:3001/mcp/sse` (`GET` only)
  - Message POST URL: `http://localhost:3001/mcp/messages?sessionId=<UUID>`

> ⚠️ **Important**: The `/mcp/sse` SSE endpoint only accepts `GET` requests. To post messages to an SSE session, use `/mcp/messages?sessionId=<UUID>`. Do not POST to `/mcp/sse`.

#### Example: Streamable HTTP configuration
```json
{
  "mcpServers": {
    "giramichi": {
      "serverUrl": "http://localhost:3001/mcp"
    }
  }
}
```

#### Example: SSE configuration
```json
{
  "mcpServers": {
    "giramichi": {
      "url": "http://localhost:3001/mcp/sse",
      "type": "sse"
    }
  }
}
```

---

### 2. Stdio MCP Transport (Local Process Mode)
You can also spawn the MCP server directly as a subprocess using stdio:

- **Option A (Recommended - direct tsx execution, avoids npm stdout pollution)**:
  - Command: `npx`
  - Arguments: `["-y", "tsx", "/absolute/path/to/giramichi/src/mcp/mcpServer.ts"]`
  - Working Directory (`cwd`): `/absolute/path/to/giramichi`

- **Option B (npm script)**:
  - Command: `npm`
  - Arguments: `["run", "mcp"]`
  - Working Directory (`cwd`): `/absolute/path/to/giramichi`

- **Option C (Docker Container Mode - Isolated execution via Dockerfile.mcp-stdio)**:
  - Build Image: `docker build -t giramichi-mcp-stdio -f Dockerfile.mcp-stdio .`
  - Command: `docker`
  - Arguments: `["run", "-i", "--rm", "-v", "/absolute/path/to/giramichi/data:/app/data", "giramichi-mcp-stdio"]`

> ⚠️ **Note**: Always replace `/absolute/path/to/giramichi` with the full absolute file path on your local filesystem (e.g., `/home/username/workspace/giramichi` or `C:\Users\username\workspace\giramichi`).

> ⚠️ **Stdio Corruption**: Never use `console.log` in any file imported by `mcpServer.ts`. Standard output is strictly reserved for MCP JSON-RPC messages. Use `console.error` for all diagnostic logging. `Dockerfile.mcp-stdio` directly invokes `tsx` to prevent `npm` stdout lifecycle messages from corrupting JSON-RPC frames.

---

## 🛠️ Configuration by Development Interface

### 1. Claude Desktop

#### Configuration File Locations:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### `claude_desktop_config.json`
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 2. Claude Code (CLI)

Add Giramichi directly to Claude Code CLI using the `mcp add` command:

```bash
claude mcp add giramichi -- npx -y tsx /path/to/giramichi/src/mcp/mcpServer.ts
```

Check active servers using:
```bash
claude mcp list
```

---

### 3. OpenCode (OpenCode Interpreter)

Add Giramichi to your OpenCode configuration in `.opencode/mcp.json` or global configuration `~/.config/opencode/mcp.json`:

```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 4. GitHub Copilot (VS Code / Agent Mode)

To enable Giramichi MCP tools in VS Code for GitHub Copilot Agent mode, create or edit `.vscode/mcp.json` in your workspace or set it in VS Code settings:

#### `.vscode/mcp.json`
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 5. Cursor IDE

#### Via Cursor Settings UI:
1. Navigate to **Cursor Settings** ➔ **Features** ➔ **MCP**.
2. Click **+ Add new MCP server**.
3. Fill in the details:
   - **Name**: `giramichi`
   - **Type**: `stdio`
   - **Command**: `npx -y tsx /path/to/giramichi/src/mcp/mcpServer.ts`
   - **Directory**: `/path/to/giramichi`

#### Via Configuration File (`.cursor/mcp.json` or `~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 6. Windsurf (Codeium)

Add Giramichi to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 7. Google Antigravity IDE & AGY CLI

Antigravity uses `mcp_config.json` (not `mcp.json`). Add Giramichi to `.agents/mcp_config.json` in your workspace root or global config `~/.gemini/config/mcp_config.json`.

#### Option A: Remote Streamable HTTP (`serverUrl`) — Recommended
Requires the Giramichi HTTP server to be running (e.g. deployed via Docker):
```json
{
  "mcpServers": {
    "giramichi": {
      "serverUrl": "http://<host>:3001/mcp"
    }
  }
}
```

#### Option B: Local Stdio — for local development
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/absolute/path/to/giramichi/src/mcp/mcpServer.ts"
      ],
      "cwd": "/absolute/path/to/giramichi"
    }
  }
}
```

> 💡 **Note**: Antigravity's `serverUrl` uses the **Streamable HTTP** transport. Always point it to `/mcp` (not `/mcp/sse`). The `/mcp` endpoint handles the full MCP handshake (`initialize` → `notifications/initialized` → tool calls) correctly.

---

### 8. Cline & Roo Code (VS Code Extensions)

1. Open **Cline Settings** (gear icon in the Cline sidebar panel).
2. Select the **MCP Servers** tab and click **Edit MCP Settings** (opens `cline_mcp_settings.json`).
3. Add the server entry:

```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 9. Zed Editor

Edit `~/.config/zed/settings.json` or `.zed/settings.json`:

```json
{
  "context_servers": {
    "giramichi": {
      "command": {
        "path": "npx",
        "args": ["-y", "tsx", "/path/to/giramichi/src/mcp/mcpServer.ts"],
        "cwd": "/path/to/giramichi"
      }
    }
  }
}
```

---

## 🧰 Available MCP Tools

Once connected, your AI assistant will have access to 12 native Giramichi MCP tools:

| Tool | Description | Key Arguments |
| :--- | :--- | :--- |
| `giramichi_create_session` | Create a new agent execution session for organizing tasks and metrics. | `name`, `description`, `agent_id`, `workflow_id` |
| `giramichi_list_sessions` | List active, completed, or archived sessions. | `status` (`active`, `completed`, `archived`) |
| `giramichi_get_session` | Get details, task execution breakdown, next task to implement, and logs for a session. | `session_id` |
| `giramichi_close_session` | Close or archive an active session. | `session_id`, `status` (`completed`, `archived`) |
| `giramichi_create_workflow` | Create a custom workflow lifecycle with status columns and set it active. | `name`, `description`, `statuses` (array of `{ id, name, color, order, description }`) |
| `giramichi_set_active_workflow` | Switch active workflow by ID. | `workflow_id` |
| `giramichi_create_task` | Create a task card on the Kanban board with decimal ordering and session grouping. | `title`, `description`, `status_id`, `priority` (`low`/`medium`/`high`/`urgent`), `order`, `tags`, `session_id`, `metrics` |
| `giramichi_batch_create_tasks` | Atomically create multiple task cards at once with decimal order indices. | `tasks` (array of task objects), `session_id` |
| `giramichi_move_task` | Move a task to a new status stage, record decision rationale, and record telemetry. | `task_id`, `new_status_id`, `reason`, `metrics` |
| `giramichi_update_task` | Edit title, description, priority, order position, tags, or metrics of an existing task. | `task_id`, `title`, `description`, `priority`, `order`, `tags`, `metrics` |
| `giramichi_get_board` | Retrieve current active workflow, status columns, tasks, logs, and next task to implement. | `session_id` (optional filter, default: active session) |
| `giramichi_get_activity_log` | Retrieve AI transition audit log history. | `limit` (default: 50), `session_id` |

### 📊 Telemetry & LLM Observability Payload

When creating, updating, or moving tasks, AI agents can optionally supply execution telemetry via the `metrics` object:

```json
{
  "metrics": {
    "model": "claude-3-5-sonnet-20241022",
    "prompt_tokens": 1250,
    "completion_tokens": 340,
    "cached_tokens": 800,
    "duration_ms": 1420,
    "cost_usd": 0.0089
  }
}
```

> 💡 **Auto-Derivation**: If `metrics` is omitted by an agent, Giramichi's backend automatically infers token consumption from payload sizes and applies the active pricing matrix, ensuring comprehensive observability in the Executive Analytics & Reports dashboard.

---

## 🧪 Testing & Verification

### Using MCP Inspector

You can test and inspect the MCP server interactive tool UI using the official Model Context Protocol Inspector:

```bash
npx @modelcontextprotocol/inspector npx tsx src/mcp/mcpServer.ts
```

This starts a web-based inspector UI (typically at `http://localhost:5173`) where you can test invoking `giramichi_get_board`, `giramichi_create_task`, and `giramichi_move_task`.

### Verifying the HTTP Endpoints

Test the SSE endpoint:
```bash
curl -v http://<host>:3001/mcp/sse
# Expected: event: endpoint  /  data: /mcp/messages?sessionId=<UUID>
```

Test the Streamable HTTP endpoint:
```bash
curl -s -X POST http://<host>:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
# Expected: HTTP 200 with mcp-session-id header and initialize result in body
```

---

## 🔍 Troubleshooting

- **`failed to connect (session ID: ): session not found`**:
  - **Cause**: The MCP client is configured as `type: "sse"` but the URL points to `/mcp` (Streamable HTTP) instead of `/mcp/sse`.
  - **Fix**: Use `/mcp/sse` for SSE clients, or use `/mcp` with `serverUrl` (Streamable HTTP).

- **`sending "notifications/initialized": Bad Request`**:
  - **Cause**: The Streamable HTTP transport session was not properly stored after `initialize`, causing the follow-up notification to find no session.
  - **Fix**: This is a known bug fixed in the current server version. Ensure you are running the latest image.

- **`mcp-remote` `http-first` strategy errors against `/mcp/sse`**:
  - **Cause**: `mcp-remote` tries `POST /mcp/sse` first (Streamable HTTP probe), which returns 404. If the server mistakenly handled it, the transports would be mismatched.
  - **Fix**: Use `--transport sse-only` flag if connecting via `mcp-remote` to the SSE endpoint: `npx -y mcp-remote http://<host>:3001/mcp/sse --allow-http --transport sse-only`.

- **Node/npm Not Found in GUI Clients**: Some GUI applications (like Claude Desktop or Cursor on macOS/Linux) do not inherit shell environment `$PATH` settings. If the server fails to connect, specify full paths to node/npm (e.g. `/usr/local/bin/npx` or `/home/user/.nvm/versions/node/v20.x.x/bin/npx`).

---

## 🐳 Docker Stdio & Dashboard Setup

To run both the **Giramichi Read-Only Dashboard** and the **Stdio MCP Server** concurrently sharing real-time database state:

1. **Start Dashboard & API Backend in Docker**:
   ```bash
   docker compose up -d giramichi-server giramichi-frontend
   ```
   - Dashboard: `http://localhost:3000`
   - Express Server: `http://localhost:3001`

2. **Build the Stdio MCP Docker Image**:
   ```bash
   docker build -t giramichi-mcp-stdio -f Dockerfile.mcp-stdio .
   ```

3. **Configure your AI Client for Docker Stdio**:
   ```json
   {
     "mcpServers": {
       "giramichi": {
         "command": "docker",
         "args": [
           "run",
           "-i",
           "--rm",
           "-v",
           "/absolute/path/to/giramichi/data:/app/data",
           "giramichi-mcp-stdio"
         ]
       }
     }
   }
   ```
   *SQLite's WAL mode allows the Stdio container and the Web Dashboard backend to perform concurrent operations on `./data/giramichi.db` in real time.*


- **Stdio Corruption**: Do not add `console.log` statements to `mcpServer.ts` or any file it imports, as standard output is strictly reserved for MCP JSON-RPC protocol communication. Use `console.error` for internal server logging.

- **Database Permissions**: Ensure the `data/` directory is writable by the process running the MCP server.
