# Giramichi MCP Integration Guide 🔌

> **Model Context Protocol (MCP) Server Setup & Connection Guide**

[Giramichi](README.md) exposes an autonomous project management control plane through a Model Context Protocol (MCP) server running on standard input/output (`stdio`). This allows modern AI coding assistants and development interfaces—such as **Claude Desktop**, **Claude Code**, **OpenCode**, **GitHub Copilot**, **Cursor**, **Windsurf**, **Google Antigravity**, and **Cline**—to create workflows, manage tasks, and update Kanban card statuses programmatically.

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

- **Streamable HTTP Endpoint** (Latest MCP HTTP Spec):
  - URL: `http://localhost:3001/mcp` (or `http://localhost:3002/mcp` when running standalone `npm run mcp:http`)
  - Supports both `GET` (stream) and `POST` (request) modes.

- **SSE Transport Stream Endpoint**:
  - SSE Stream URL: `http://localhost:3001/mcp/sse`
  - Message POST URL: `http://localhost:3001/mcp/messages`

#### Example HTTP Server MCP Configuration (JSON):
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
Or for Streamable HTTP clients:
```json
{
  "mcpServers": {
    "giramichi": {
      "url": "http://localhost:3001/mcp",
      "type": "http"
    }
  }
}
```

---

### 2. Stdio MCP Transport (Local Process Mode)
You can also spawn the MCP server directly as a subprocess using stdio:

- **Option A (Recommended - npm script)**:
  - Command: `npm`
  - Arguments: `["run", "mcp"]`
  - Working Directory (`cwd`): `/absolute/path/to/giramichi`

- **Option B (Direct tsx execution)**:
  - Command: `npx`
  - Arguments: `["-y", "tsx", "/absolute/path/to/giramichi/src/mcp/mcpServer.ts"]`
  - Working Directory (`cwd`): `/absolute/path/to/giramichi`

> ⚠️ **Note**: Always replace `/absolute/path/to/giramichi` with the full absolute file path on your local filesystem (e.g., `/home/username/workspace/giramichi` or `C:\Users\username\workspace\giramichi`).

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
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 2. Claude Code (CLI)

Add Giramichi directly to Claude Code CLI using the `mcp add` command:

```bash
claude mcp add giramichi -- npm run mcp --prefix /path/to/giramichi
```

Or via direct tsx script:

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
      "command": "npm",
      "args": ["run", "mcp"],
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
      "command": "npm",
      "args": ["run", "mcp"],
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
   - **Command**: `npm run mcp` (or full path to npm/npx)
   - **Directory**: `/path/to/giramichi`

#### Via Configuration File (`.cursor/mcp.json` or `~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npm",
      "args": ["run", "mcp"],
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
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 7. Google Antigravity IDE & AGY CLI

Add Giramichi to `.agents/mcp_config.json` in your workspace root or global Antigravity config `~/.gemini/config/mcp_config.json`:

#### Option A: Direct Remote SSE / HTTP Mode (`serverUrl`):
```json
{
  "mcpServers": {
    "giramichi": {
      "serverUrl": "http://192.168.50.10:3001/mcp/sse"
    }
  }
}
```

#### Option B: Remote SSE Bridge via `mcp-remote` (Recommended for HTTP SSE):
If your IDE encounters network buffering or non-HTTPS SSE stream errors, use `mcp-remote` to bridge remote SSE over local stdio:
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://192.168.50.10:3001/mcp/sse",
        "--allow-http"
      ]
    }
  }
}
```

#### For Stdio Mode (`command` + `args`):
```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/giramichi"
    }
  }
}
```

---

### 8. Cline & Roo Code (VS Code Extensions)

1. Open **Cline Settings** (gear icon in the Cline sidebar panel).
2. Select the **MCP Servers** tab and click **Edit MCP Settings** (opens `cline_mcp_settings.json`).
3. Add the server entry:

```json
{
  "mcpServers": {
    "giramichi": {
      "command": "npm",
      "args": ["run", "mcp"],
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
        "path": "npm",
        "args": ["run", "mcp"],
        "cwd": "/path/to/giramichi"
      }
    }
  }
}
```

---

## 🧰 Available MCP Tools

Once connected, your AI assistant will have access to 8 native Giramichi MCP tools:

| Tool | Description | Key Arguments |
| :--- | :--- | :--- |
| `giramichi_create_workflow` | Create a custom workflow lifecycle with status columns and set it active. | `name`, `description`, `statuses` (array of `{ id, name, color, order, description }`) |
| `giramichi_set_active_workflow` | Switch active workflow by ID. | `workflow_id` |
| `giramichi_create_task` | Create a task card on the Kanban board. | `title`, `description`, `status_id`, `priority` (`low`/`medium`/`high`/`urgent`), `tags` |
| `giramichi_batch_create_tasks` | Atomically create multiple task cards at once. | `tasks` (array of task objects) |
| `giramichi_move_task` | Move a task to a new status stage and record decision rationale. | `task_id`, `new_status_id`, `reason` |
| `giramichi_update_task` | Edit title, description, priority, or tags of an existing task. | `task_id`, `title`, `description`, `priority`, `tags` |
| `giramichi_get_board` | Retrieve current active workflow, all status columns, tasks, and recent activity logs. | *(none)* |
| `giramichi_get_activity_log` | Retrieve AI transition audit log history. | `limit` (default: 50) |

---

## 🧪 Testing & Verification

### Using MCP Inspector

You can test and inspect the MCP server interactive tool UI using the official Model Context Protocol Inspector:

```bash
npx @modelcontextprotocol/inspector npm run mcp
```

Or directly via `tsx`:

```bash
npx @modelcontextprotocol/inspector npx tsx src/mcp/mcpServer.ts
```

This starts a web-based inspector UI (typically at `http://localhost:5173`) where you can test invoking `giramichi_get_board`, `giramichi_create_task`, and `giramichi_move_task`.

---

## 🔍 Troubleshooting

- **`failed to connect (session ID: ): session not found`**:
  - **Cause**: Mismatch between `type` transport setting (`sse` vs `http`) and the configured URL path.
  - **Fix for `type: "sse"`**: Ensure `/sse` is appended to the URL (e.g. `http://<host>:<port>/mcp/sse`). If you point an `sse` client to `/mcp`, it hits the Streamable HTTP handler instead of the SSE listener and fails to acquire a session ID.
  - **Fix for `type: "http"`**: Point to `http://<host>:<port>/mcp`.
  - **Verification**: Test the SSE endpoint with `curl -v http://<host>:<port>/mcp/sse`. You should see `event: endpoint` and `data: /mcp/messages?sessionId=<UUID>`.
- **Node/npm Not Found in GUI Clients**: Some GUI applications (like Claude Desktop or Cursor on macOS/Linux) do not inherit shell environment `$PATH` settings. If the server fails to connect, specify full paths to node/npm (e.g. `/usr/local/bin/npm` or `/home/user/.nvm/versions/node/v20.x.x/bin/npm`).
- **Stdio Corruption**: Do not add `console.log` statements to `mcpServer.ts` or imported files, as standard output is strictly reserved for MCP JSON-RPC protocol communication. Use `console.error` for internal server logging.
- **Database Permissions**: Ensure the `data/` directory is writable by the process running the MCP server.
