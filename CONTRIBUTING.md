# Contributing to Giramichi (煌道)

Thank you for your interest in contributing to Giramichi! Giramichi is an AI-first project management platform designed to replace manual issue tracking with an autonomous AI execution model, letting humans supervise progress in real-time via a read-only React dashboard.

We welcome contributions from **both human developers and AI coding assistants**. 

This document provides guidelines, environment setup instructions, and coding standards to help you get started.

---

## 📑 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Local Development Setup](#-local-development-setup)
3. [Project Structure](#-project-structure)
4. [Coding Standards](#-coding-standards)
5. [Database Adapters](#-database-adapters)
6. [MCP Tool Development](#-mcp-tool-development)
7. [Testing Guidelines](#-testing-guidelines)
8. [AI Coding Agent Rules](#-ai-coding-agent-rules)
9. [Submitting a Pull Request](#-submitting-a-pull-request)

---

## 🤝 Code of Conduct

We are committed to fostering a welcoming and respectful community. By participating in this project, you agree to abide by our [Code of Conduct](file:///home/rfocosi/workspace/giramichi/CODE_OF_CONDUCT.md). Please review it to understand our community standards, acceptable behavior, and enforcement guidelines.

---

## 💻 Local Development Setup

### Prerequisites

- **Node.js**: v18.x or higher (v20+ recommended)
- **npm**: v9.x or higher

### Installation & Forking Workflow

To contribute to Giramichi, you must first fork the repository on GitHub to your own account.

1. **Fork the Repository:**
   - Click the **Fork** button at the top right of the [Giramichi GitHub Repository](https://github.com/rfocosi/giramichi).
   - Alternatively, use the GitHub CLI:
     ```bash
     gh repo fork rfocosi/giramichi
     ```

2. **Clone Your Fork:**
   Clone your newly created fork locally (replace `YOUR-USERNAME` with your GitHub username):
   ```bash
   git clone https://github.com/YOUR-USERNAME/giramichi.git
   cd giramichi
   ```

3. **Configure Upstream Remote:**
   Keep your fork in sync by tracking the original repository as `upstream`:
   ```bash
   git remote add upstream https://github.com/rfocosi/giramichi.git
   git fetch upstream
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Modify the `.env` file according to your local requirements (e.g., configuring database connections or authentication modes).

### Running Giramichi Locally

To develop, you will typically run the Express backend API and the Vite frontend dashboard in separate terminal sessions:

1. **Start the Backend API & HTTP/SSE MCP Server:**
   ```bash
   npm run server
   ```
   Runs Express on `http://localhost:3001` (incorporating dashboard endpoints, Server-Sent Events, and `/mcp` endpoints).

2. **Start the Frontend Dashboard (with HMR):**
   ```bash
   npm run dev
   ```
   Launches the Vite Dev Server (usually on `http://localhost:5173`). Open the browser to see the real-time Glassmorphism UI.

3. **Run Standalone MCP Server (Stdio):**
   ```bash
   npm run mcp
   ```
   Useful for testing local command-line client integrations (e.g., Claude Desktop, Claude Code, Cline, Zed).

---

## 📂 Project Structure

A quick map of the directories where development occurs:
* `src/db/`: Database layer. Implements pluggable adapters (`sqliteAdapter.ts`, `postgresAdapter.ts`, etc.).
* `src/frontend/`: React 19 Vite Dashboard (components, assets, and design system styling).
* `src/mcp/`: Model Context Protocol server implementations (Stdio and HTTP/SSE transport) and the tool definitions.
* `src/server/`: Express REST endpoints, Server-Sent Events (SSE) broadcaster, and reports/telemetry aggregation engines.
* `tests/`: Automated test suite containing Playwright tests grouped by unit, api, e2e, and mcp.

---

## 🛠️ Coding Standards

- **TypeScript:** Giramichi is written entirely in TypeScript. Ensure your code has complete, strict typing.
- **ES Modules:** The project uses native ES Modules.
  - When importing files locally, you **must append the `.js` extension** (e.g. `import { db } from '../db/index.js';`).
- **Real-Time Consistency:** All mutations affecting sessions or tasks must trigger a state change notify on the database adapter so that dashboard events are broadcasted instantly to clients via Server-Sent Events (SSE).

---

## 🗄️ Database Adapters

Giramichi supports multiple SQL databases out of the box. All database adapters must implement the `IDatabaseAdapter` interface found in [`src/db/types.ts`](file:///home/rfocosi/workspace/giramichi/src/db/types.ts).

### Adding or Modifying Adapters:
1. Implement the adapter in `src/db/adapters/` (e.g., `sqliteAdapter.ts`, `postgresAdapter.ts`, etc.).
2. Ensure you handle relational schema requirements, transaction safety, and query differences across engines.
3. Register your adapter in the database factory located in [`src/db/index.ts`](file:///home/rfocosi/workspace/giramichi/src/db/index.ts).
4. Run integration tests against your target database to confirm interface compliance.

---

## 🔌 MCP Tool Development

Model Context Protocol (MCP) tools allow AI assistants to interact programmatically with Giramichi. 

- **Tool Schemas & Handlers:** Defined in [`src/mcp/tools.ts`](file:///home/rfocosi/workspace/giramichi/src/mcp/tools.ts).
- If you add or modify tools, ensure the `inputSchema` is completely typed, strict, and contains clear `description` strings to guide the LLM's invocation logic.
- Ensure any task creations, modifications, or transitions call database adapters properly to trigger real-time SSE broadcasts.

---

## 🧪 Testing Guidelines

We use **Playwright** as our universal test runner for everything from unit tests to end-to-end frontend interfaces.

### Running Tests

* **Run all tests:**
  ```bash
  npm run test:all
  ```
* **Run unit tests only:**
  ```bash
  npm run test:unit
  ```
* **Run REST API tests only:**
  ```bash
  npm run test:api
  ```
* **Run MCP server tool tests only:**
  ```bash
  npm run test:mcp
  ```
* **Run End-to-End (E2E) UI tests only:**
  ```bash
  npm run test:e2e
  ```

### Rules for Writing Tests
- All test scripts use a isolated test database to avoid data pollution: `DB_FILE=giramichi-test.db`.
- Clean up any test artifacts or database files created during tests.
- When testing UI components or page logic, prefer using Playwright's locator strategies rather than brittle XPath identifiers.

---

## 🤖 AI Coding Agent Rules

If you are an **AI Coding Agent** (e.g., Claude, Cursor, Antigravity) contributing code or planning tasks in this project:

1. **Giramichi Auto-Triggering:** Whenever the user mentions the word `"plan"` or `"planning"`, you must use Giramichi MCP tools (`giramichi_create_session`, `giramichi_batch_create_tasks`, etc.) to structure, track, and move task cards. Refer to [`.agents/AGENTS.md`](file:///home/rfocosi/workspace/giramichi/.agents/AGENTS.md) for execution details.
2. **Include Telemetry Metrics:** When creating or moving tasks, make sure to pass the `metrics` payload (`model`, `prompt_tokens`, `completion_tokens`, `duration_ms`, `cost_usd`) to enable report logging and KPI ribbon updates.
3. **Respect Code Style:** Maintain comments and docstrings. Do not remove safety warnings or existing comments unless explicitly requested.

---

## 🚀 Submitting a Pull Request

Giramichi follows the standard GitHub Fork & Pull Request workflow.

1. **Sync Your Local Repository:**
   Ensure your local `main` branch is fully synchronized with the upstream repository:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. **Create a Feature Branch:**
   Create a descriptive branch for your feature or bug fix:
   ```bash
   git checkout -b feature/cool-new-adapter
   ```

3. **Develop & Commit:**
   Make your changes and commit them with clear, descriptive commit messages.

4. **Verify Quality:**
   Run the entire test suite locally to verify all checks pass:
   ```bash
   npm run test:all
   ```

5. **Push to Your Fork:**
   Push your branch to your `origin` remote (your GitHub fork):
   ```bash
   git push origin feature/cool-new-adapter
   ```

6. **Open a Pull Request:**
   Go to the [Giramichi GitHub Repository](https://github.com/rfocosi/giramichi). You should see a prompt to open a Pull Request from your pushed branch.
   - Write a clear, descriptive title and description.
   - Summarize what changed and why, linking to any relevant issues.
   - Include screenshots or screen recordings if there are UI/UX changes.
