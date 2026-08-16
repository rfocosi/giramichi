# Giramichi Deployment & Execution Guide 🚀

> **Step-by-step guide for running Giramichi Server, Frontend Dashboard, and the Optional MCP Server using Docker (`docker run`), Docker Compose, Kubernetes (K8s), and native Node.js.**

All pre-built production container images are published to the GitHub Container Registry (GHCR):
- `ghcr.io/rfocosi/giramichi-server:latest`
- `ghcr.io/rfocosi/giramichi-frontend:latest`
- `ghcr.io/rfocosi/giramichi-mcp:latest` *(Optional standalone HTTP/SSE MCP server)*
- `ghcr.io/rfocosi/giramichi-mcp-stdio:latest` *(Optional standalone Stdio MCP container)*

---

## 📑 Table of Contents

1. [Architecture & Component Overview](#-architecture--component-overview)
2. [Why is the Standalone MCP Server Optional?](#-why-is-the-standalone-mcp-server-optional)
3. [Multi-Database Support (PostgreSQL, MySQL, MSSQL, SQLite)](#-multi-database-support-postgresql-mysql-mssql-sqlite)
4. [Quick Reference: Container Images & Ports](#-quick-reference-container-images--ports)
5. [Method 1: Running with Docker Run (Direct from GHCR)](#-method-1-running-with-docker-run-direct-from-ghcr)
6. [Method 2: Running with Docker Compose](#-method-2-running-with-docker-compose)
7. [Method 3: Running on Kubernetes (K8s)](#-method-3-running-on-kubernetes-k8s)
8. [Method 4: Running Locally via Node.js / npm](#-method-4-running-locally-via-nodejs--npm)
9. [Configuration & Environment Variables](#-configuration--environment-variables)
10. [Health Check & Verification](#-health-check--verification)

---

## 🏛️ Architecture & Component Overview

Giramichi consists of three main components:

```mermaid
flowchart LR
    subgraph Clients["Clients"]
        Browser["Human Oversight\n(Browser / Dashboard)"]
        AIAgent["AI Coding Assistant\n(Claude / Cursor / Antigravity)"]
    end

    subgraph CoreServices["Core Services (Required)"]
        Frontend["giramichi-frontend\n(Nginx + React 19)\nPort 3000 / 80"]
        Server["giramichi-server\n(Express Backend + SSE + Embedded MCP)\nPort 3001"]
        DB[("Database\n(SQLite / Postgres / MySQL / MSSQL)")]
    end

    subgraph OptionalServices["Optional Standalone MCP Services"]
        MCPHttp["giramichi-mcp\n(Dedicated MCP HTTP/SSE)\nPort 3002"]
        MCPStdio["giramichi-mcp-stdio\n(Dedicated Stdio Container)"]
        Redis[("Redis\n(Multi-instance Sync)\nPort 6379")]
    end

    Browser -->|HTTP / SSE| Frontend
    Frontend -->|API / SSE Proxy| Server
    AIAgent -->|Streamable HTTP / SSE /mcp| Server
    AIAgent -.->|Dedicated HTTP :3002| MCPHttp
    AIAgent -.->|CLI Stdio| MCPStdio

    Server --> DB
    MCPHttp --> DB
    MCPHttp -.-> Redis
    MCPStdio --> DB
```

1. **`giramichi-server` (Backend Core)**:
   - Express REST API (`/api/sessions`, `/api/tasks`, `/api/board`, `/api/reports`).
   - Server-Sent Events (SSE) stream (`/api/events`) for pushing live card movements to the dashboard.
   - **Embedded MCP Endpoints**: Hosts `/mcp` (Streamable HTTP) and `/mcp/sse` (SSE transport) directly on port 3001.

2. **`giramichi-frontend` (Read-Only Dashboard)**:
   - React 19 Glassmorphism SPA served via Nginx.
   - Dynamically injects `GIRAMICHI_API_URL` at container startup via runtime `config.js`.
   - Real-time Kanban board, KPI ribbon, AI decision audit stream, and velocity reports.

3. **`giramichi-mcp` / `giramichi-mcp-stdio` (Optional Standalone MCP)**:
   - Standalone microservice container for handling MCP traffic independently from the main API server.

---

## ❓ Why is the Standalone MCP Server Optional?

You **do NOT need** to run `giramichi-mcp` for standard deployments. Here is why:

| Deployment Scenario | Recommended Setup | Is `giramichi-mcp` Needed? |
| :--- | :--- | :---: |
| **Standard Remote Deployment** (AI agents connect over HTTP) | Run `giramichi-server` + `giramichi-frontend`. AI agents point their MCP config to `http://<server-host>:3001/mcp`. | ❌ **No** (Server embeds full MCP protocol support) |
| **Local AI Tools** (Claude Desktop, Cursor, VS Code on host) | Run local `stdio` via `npx -y tsx src/mcp/mcpServer.ts` reading `./data/giramichi.db`. | ❌ **No** (Direct stdio execution) |
| **High-Throughput Multi-Agent Cluster** | Run `giramichi-mcp` connected to `redis` to offload AI tool load from the dashboard API. | ✅ **Yes** (Dedicated scaling) |
| **Containerized Stdio Isolation** | Run `ghcr.io/rfocosi/giramichi-mcp-stdio` via docker CLI in local agent configs. | ✅ **Yes** (Sandboxed Stdio) |

> 💡 **Summary**: `giramichi-server` handles both dashboard traffic and AI MCP connections out of the box on port 3001. Run the separate `giramichi-mcp` container only when you specifically want isolated microservices or horizontal Redis-backed scaling.

---

## 🗄️ Multi-Database Support (PostgreSQL, MySQL, MSSQL, SQLite)

> 🔔 **Important Reminder**: While Giramichi defaults to zero-configuration embedded SQLite, it is **natively compatible with production-grade relational databases**. You can easily switch the database backend by setting the `DB_TYPE` and `DATABASE_URL` (or discrete host/port/user/password) environment variables.

| Database | `DB_TYPE` Values | Driver / Adapter | Use Case |
| :--- | :--- | :--- | :--- |
| **SQLite (Default)** | `sqlite` | `better-sqlite3` (WAL mode) | Local development, single-container instances, embedded desktop workflows. |
| **PostgreSQL** | `postgres`, `postgresql`, `pg` | `pg` (Connection Pooling) | Production multi-instance deployments, high-concurrency cloud clusters (AWS RDS, GCP Cloud SQL, Azure Database). |
| **MySQL / MariaDB** | `mysql`, `mariadb` | `mysql2` | Existing corporate MySQL/MariaDB infrastructure, clustered database environments. |
| **Microsoft SQL Server** | `mssql`, `sqlserver` | `mssql` / `tedious` | Enterprise Windows/Azure SQL Server ecosystems. |

> ⚡ **Zero-Migration Auto-Provisioning**: When starting Giramichi against any supported database engine, the backend automatically initializes and validates the required schema, tables (`workflows`, `statuses`, `tasks`, `sessions`, `activity_logs`), and seed data if the database is blank.

### Database Connection Configurations

#### 🐘 PostgreSQL Configuration
```bash
# Option 1: Connection URL (Recommended)
DB_TYPE=postgres
DATABASE_URL=postgres://giramichi:secret_password@postgres-host:5432/giramichi

# Option 2: Discrete Variables
DB_TYPE=postgres
DB_HOST=postgres-host
DB_PORT=5432
DB_USER=giramichi
DB_PASSWORD=secret_password
DB_NAME=giramichi
DB_SSL=false
```

#### 🐬 MySQL / MariaDB Configuration
```bash
# Option 1: Connection URL
DB_TYPE=mysql
DATABASE_URL=mysql://giramichi:secret_password@mysql-host:3306/giramichi

# Option 2: Discrete Variables
DB_TYPE=mysql
DB_HOST=mysql-host
DB_PORT=3306
DB_USER=giramichi
DB_PASSWORD=secret_password
DB_NAME=giramichi
```

#### 🏢 Microsoft SQL Server Configuration
```bash
# Option 1: Connection URL
DB_TYPE=mssql
DATABASE_URL=mssql://sa:YourStrongPassword123!@mssql-host:1433/giramichi

# Option 2: Discrete Variables
DB_TYPE=mssql
DB_HOST=mssql-host
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_NAME=giramichi
DB_ENCRYPT=false
```

#### 🗃️ SQLite Configuration (Default)
```bash
DB_TYPE=sqlite
DB_DIR=data
DB_FILE=giramichi.db
```

---

## 📦 Quick Reference: Container Images & Ports

| Component | GHCR Image | Internal Port | Default Host Port | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **Server** | `ghcr.io/rfocosi/giramichi-server:latest` | `3001` | `3001` | REST API, SSE, Embedded MCP |
| **Frontend** | `ghcr.io/rfocosi/giramichi-frontend:latest` | `80` | `3000` | Glassmorphism Web Dashboard |
| **MCP (HTTP)** *(Optional)* | `ghcr.io/rfocosi/giramichi-mcp:latest` | `3002` | `3002` | Dedicated MCP HTTP/SSE Service |
| **MCP (Stdio)** *(Optional)* | `ghcr.io/rfocosi/giramichi-mcp-stdio:latest` | Stdio (I/O) | N/A | Subprocess execution for IDEs |

---

## 🐳 Method 1: Running with Docker Run (Direct from GHCR)

You can run the containers directly from GHCR without needing the source repository.

### Step 1: Create a Shared Network and Volume

```bash
# Create bridge network for container-to-container communication
docker network create giramichi-net

# Create named volume for persistent SQLite database storage
docker volume create giramichi-data
```

### Step 2: Run the Server (Backend + Embedded MCP)

#### Option A: Running with Default SQLite
```bash
docker run -d \
  --name giramichi-server \
  --network giramichi-net \
  -p 3001:3001 \
  -v giramichi-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DB_TYPE=sqlite \
  -e SESSION_HISTORY_DISPLAY_PERIOD=3D \
  --restart unless-stopped \
  ghcr.io/rfocosi/giramichi-server:latest
```

#### Option B: Running with PostgreSQL / MySQL / MSSQL (No local volume required)
```bash
docker run -d \
  --name giramichi-server \
  --network giramichi-net \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DB_TYPE=postgres \
  -e DATABASE_URL=postgres://giramichi:secret_password@postgres-host:5432/giramichi \
  -e SESSION_HISTORY_DISPLAY_PERIOD=3D \
  --restart unless-stopped \
  ghcr.io/rfocosi/giramichi-server:latest
```

### Step 3: Run the Frontend Dashboard

Point `GIRAMICHI_API_URL` to the public address where your browser can reach the backend:

```bash
docker run -d \
  --name giramichi-frontend \
  --network giramichi-net \
  -p 3000:80 \
  -e GIRAMICHI_API_URL=http://localhost:3001 \
  --restart unless-stopped \
  ghcr.io/rfocosi/giramichi-frontend:latest
```

*Open `http://localhost:3000` in your browser to view the dashboard!*

---

### Step 4 (Optional): Run the Standalone MCP Server Container

If you want an isolated MCP endpoint on port 3002:

```bash
# Optional: Start Redis if multi-instance session sync is desired
docker run -d \
  --name giramichi-redis \
  --network giramichi-net \
  -p 6379:6379 \
  redis:7-alpine

# Start Standalone MCP HTTP Server
docker run -d \
  --name giramichi-mcp \
  --network giramichi-net \
  -p 3002:3002 \
  -v giramichi-data:/app/data \
  -e NODE_ENV=production \
  -e MCP_HTTP_PORT=3002 \
  -e REDIS_URL=redis://giramichi-redis:6379 \
  --restart unless-stopped \
  ghcr.io/rfocosi/giramichi-mcp:latest
```

---

### Step 5 (Optional): Run Stdio MCP via Container in Claude Desktop / Cursor

To use the containerized stdio image inside `claude_desktop_config.json` or `.cursor/mcp.json`:

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
        "giramichi-data:/app/data",
        "ghcr.io/rfocosi/giramichi-mcp-stdio:latest"
      ]
    }
  }
}
```

---

## 🐙 Method 2: Running with Docker Compose

Docker Compose is the easiest way to orchestrate all services together.

### 1. Minimal Production Stack (Server + Frontend)

Create a `docker-compose.yml`:

```yaml
services:
  giramichi-server:
    image: ghcr.io/rfocosi/giramichi-server:latest
    container_name: giramichi-server
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SESSION_HISTORY_DISPLAY_PERIOD=3D
      - DB_TYPE=sqlite
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  giramichi-frontend:
    image: ghcr.io/rfocosi/giramichi-frontend:latest
    container_name: giramichi-frontend
    environment:
      - GIRAMICHI_API_URL=http://localhost:3001
    ports:
      - "3000:80"
    depends_on:
      - giramichi-server
    restart: unless-stopped
```

Launch the stack:
```bash
docker compose up -d
```

---

### 2. Full Stack (Server + Frontend + Redis + Optional MCP + Keycloak)

For enterprise environments with authentication, Redis session bus, and dedicated MCP instances:

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: giramichi-keycloak
    command: start-dev --import-realm
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
      - KC_HTTP_ENABLED=true
    ports:
      - "8080:8080"
    volumes:
      - ./keycloak/giramichi-realm.json:/opt/keycloak/data/import/giramichi-realm.json
    restart: unless-stopped

  giramichi-server:
    image: ghcr.io/rfocosi/giramichi-server:latest
    container_name: giramichi-server
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SESSION_HISTORY_DISPLAY_PERIOD=3D
      - AUTH_MODE=disabled # Or 'oauth2'
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  giramichi-frontend:
    image: ghcr.io/rfocosi/giramichi-frontend:latest
    container_name: giramichi-frontend
    environment:
      - GIRAMICHI_API_URL=http://localhost:3001
    ports:
      - "3000:80"
    depends_on:
      - giramichi-server
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: giramichi-redis
    ports:
      - "6379:6379"
    restart: unless-stopped

  # Optional Standalone MCP Microservice
  giramichi-mcp:
    image: ghcr.io/rfocosi/giramichi-mcp:latest
    container_name: giramichi-mcp
    environment:
      - NODE_ENV=production
      - MCP_HTTP_PORT=3002
      - REDIS_URL=redis://redis:6379
    ports:
      - "3002:3002"
    volumes:
      - ./data:/app/data
    depends_on:
      - giramichi-server
      - redis
    restart: unless-stopped

---

### 3. Production Stack with PostgreSQL Database

If you prefer running a dedicated PostgreSQL container rather than SQLite:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: giramichi-postgres
    environment:
      POSTGRES_DB: giramichi
      POSTGRES_USER: giramichi
      POSTGRES_PASSWORD: secret_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  giramichi-server:
    image: ghcr.io/rfocosi/giramichi-server:latest
    container_name: giramichi-server
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_TYPE=postgres
      - DATABASE_URL=postgres://giramichi:secret_password@postgres:5432/giramichi
      - SESSION_HISTORY_DISPLAY_PERIOD=3D
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    restart: unless-stopped

  giramichi-frontend:
    image: ghcr.io/rfocosi/giramichi-frontend:latest
    container_name: giramichi-frontend
    environment:
      - GIRAMICHI_API_URL=http://localhost:3001
    ports:
      - "3000:80"
    depends_on:
      - giramichi-server
    restart: unless-stopped

volumes:
  pgdata:
```
```

---

## ☸️ Method 3: Running on Kubernetes (K8s)

Deploy Giramichi to any Kubernetes cluster (Minikube, Kind, GKE, EKS, AKS, or on-prem).

### 1. Namespace & Storage (`01-storage.yaml`)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: giramichi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: giramichi-data-pvc
  namespace: giramichi
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

---

### 2. ConfigMap (`02-configmap.yaml`)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: giramichi-config
  namespace: giramichi
data:
  NODE_ENV: "production"
  PORT: "3001"
  SESSION_HISTORY_DISPLAY_PERIOD: "3D"
  GIRAMICHI_API_URL: "http://giramichi-server.giramichi.svc.cluster.local:3001"
  DB_TYPE: "sqlite"
```

---

### 3. Backend Server Deployment & Service (`03-server.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: giramichi-server
  namespace: giramichi
  labels:
    app: giramichi-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: giramichi-server
  template:
    metadata:
      labels:
        app: giramichi-server
    spec:
      containers:
        - name: server
          image: ghcr.io/rfocosi/giramichi-server:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3001
              name: http
          envFrom:
            - configMapRef:
                name: giramichi-config
          volumeMounts:
            - name: data-volume
              mountPath: /app/data
          livenessProbe:
            httpGet:
              path: /api/sessions
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /api/sessions
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: data-volume
          persistentVolumeClaim:
            claimName: giramichi-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: giramichi-server
  namespace: giramichi
spec:
  type: ClusterIP
  selector:
    app: giramichi-server
  ports:
    - name: http
      port: 3001
      targetPort: 3001
```

---

### 4. Frontend Dashboard Deployment & Service (`04-frontend.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: giramichi-frontend
  namespace: giramichi
  labels:
    app: giramichi-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: giramichi-frontend
  template:
    metadata:
      labels:
        app: giramichi-frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/rfocosi/giramichi-frontend:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
              name: http
          env:
            # Set to external ingress/loadbalancer URL reachable by browser
            - name: GIRAMICHI_API_URL
              value: "http://localhost:3001"
            - name: VITE_DEMO
              value: "false"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: giramichi-frontend
  namespace: giramichi
spec:
  type: ClusterIP
  selector:
    app: giramichi-frontend
  ports:
    - name: http
      port: 80
      targetPort: 80
```

---

### 5. (Optional) Dedicated Standalone MCP Deployment (`05-mcp-optional.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: giramichi-mcp
  namespace: giramichi
  labels:
    app: giramichi-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: giramichi-mcp
  template:
    metadata:
      labels:
        app: giramichi-mcp
    spec:
      containers:
        - name: mcp
          image: ghcr.io/rfocosi/giramichi-mcp:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3002
              name: mcp-http
          env:
            - name: NODE_ENV
              value: "production"
            - name: MCP_HTTP_PORT
              value: "3002"
          volumeMounts:
            - name: data-volume
              mountPath: /app/data
      volumes:
        - name: data-volume
          persistentVolumeClaim:
            claimName: giramichi-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: giramichi-mcp
  namespace: giramichi
spec:
  type: ClusterIP
  selector:
    app: giramichi-mcp
  ports:
    - name: mcp-http
      port: 3002
      targetPort: 3002
```

---

### 6. Ingress Routing (`06-ingress.yaml`)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: giramichi-ingress
  namespace: giramichi
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  rules:
    - host: giramichi.local
      http:
        paths:
          # Route REST API and MCP endpoints to backend server
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: giramichi-server
                port:
                  number: 3001
          - path: /mcp
            pathType: Prefix
            backend:
              service:
                name: giramichi-server
                port:
                  number: 3001
          # Route UI assets to frontend
          - path: /
            pathType: Prefix
            backend:
              service:
                name: giramichi-frontend
                port:
                  number: 80
```

### Applying Manifests:

```bash
kubectl apply -f 01-storage.yaml
kubectl apply -f 02-configmap.yaml
kubectl apply -f 03-server.yaml
kubectl apply -f 04-frontend.yaml
kubectl apply -f 06-ingress.yaml

# Check rollout status
kubectl get pods -n giramichi
kubectl get svc -n giramichi
```

---

## 💻 Method 4: Running Locally via Node.js / npm

For local development or direct source testing:

```bash
# 1. Clone & install
git clone https://github.com/rfocosi/giramichi.git
cd giramichi
npm install

# 2. Terminal 1: Start Backend Server (Port 3001)
npm run server

# 3. Terminal 2: Start Frontend Dev Server (Port 5173)
npm run dev

# 4. (Optional) Terminal 3: Start Standalone MCP Server (Port 3002)
npm run mcp:http
```

---

## ⚙️ Configuration & Environment Variables

All available environment variables are organized below by domain. You can also inspect the template at [.env.example](file:///home/rfocosi/workspace/giramichi/.env.example).

### 1. Core Server & Dashboard API
| Variable | Target Component | Default | Description |
| :--- | :--- | :---: | :--- |
| `PORT` | `server` | `3001` | Express server HTTP port. |
| `NODE_ENV` | `server`, `mcp` | `development` | Node environment (`development` or `production`). |
| `SESSION_HISTORY_DISPLAY_PERIOD` | `server` | `3D` | Active session filter window (`1H`, `3D`, `2W`, `1Y`, or `all`). |

### 2. Frontend UI Dashboard
| Variable | Target Component | Default | Description |
| :--- | :--- | :---: | :--- |
| `GIRAMICHI_API_URL` | `frontend` | *(Empty)* | Backend API URL reachable by the client browser (e.g. `http://localhost:3001`). Injected at container startup. |
| `VITE_DEMO` / `DEMO` | `frontend` | `false` | When `true`, enables mock demo mode in UI. |
| `GIRAMICHI_VERSION` / `VITE_APP_VERSION` | `frontend` | `0.3.0` | Injects application version tag into the dashboard header. |

### 3. Database Backend Options
| Variable | Target Component | Default | Description |
| :--- | :--- | :---: | :--- |
| `DB_TYPE` | `server`, `mcp` | `sqlite` | Database engine (`sqlite`, `postgres` / `postgresql`, `mysql` / `mariadb`, `mssql` / `sqlserver`). |
| `DATABASE_URL` | `server`, `mcp` | *(None)* | Full connection URI (e.g. `postgres://user:pass@host:5432/db`, `mysql://...`, `mssql://...`). Takes precedence over discrete variables. |
| `DB_HOST` | `server`, `mcp` | `localhost` | Hostname/IP for PostgreSQL, MySQL, or MSSQL. |
| `DB_PORT` | `server`, `mcp` | `5432` / `3306` / `1433` | Database connection port. |
| `DB_USER` | `server`, `mcp` | *(None)* | Database username (`postgres`, `root`, `sa`, etc.). |
| `DB_PASSWORD` | `server`, `mcp` | *(None)* | Database password. |
| `DB_NAME` | `server`, `mcp` | `giramichi` | Database database/catalog name. |
| `DB_SSL` | `server`, `mcp` | `false` | Enable SSL encryption for PostgreSQL or MySQL (`true`/`false`). |
| `DB_ENCRYPT` | `server`, `mcp` | `false` | Enable TLS encryption for Microsoft SQL Server / Azure SQL (`true`/`false`). |
| `DB_DIR` | `server`, `mcp` | `data` | Directory for SQLite database file when `DB_TYPE=sqlite`. |
| `DB_FILE` | `server`, `mcp` | `giramichi.db` | Filename for SQLite database when `DB_TYPE=sqlite`. |

### 4. Optional Standalone MCP & Redis Clustering
| Variable | Target Component | Default | Description |
| :--- | :--- | :---: | :--- |
| `MCP_HTTP_PORT` | `mcp` | `3002` | HTTP port for standalone `giramichi-mcp` container. |
| `REDIS_URL` | `server`, `mcp` | *(None)* | Redis connection string (e.g. `redis://localhost:6379`) for multi-instance SSE synchronization. |
| `REDIS_HOST` | `server`, `mcp` | `localhost` | Discrete Redis hostname/IP. |
| `REDIS_PORT` | `server`, `mcp` | `6379` | Discrete Redis port. |
| `REDIS_PASSWORD` | `server`, `mcp` | *(None)* | Discrete Redis password. |

### 5. Authentication & OAuth2 / Keycloak
| Variable | Target Component | Default | Description |
| :--- | :--- | :---: | :--- |
| `AUTH_MODE` | `server` | `disabled` | Authentication mode (`disabled` or `oauth2`). |
| `OAUTH2_ISSUER` | `server` | `http://localhost:8080/realms/giramichi` | OAuth2 / Keycloak realm issuer URL. |
| `OAUTH2_JWKS_URI` | `server` | `${issuer}/protocol/openid-connect/certs` | JWKS endpoint for validating agent Bearer JWT signatures. |
| `OAUTH2_CLIENT_ID` | `server` | `giramichi-agent` | Expected client ID. |
| `OAUTH2_AUDIENCE` | `server` | *(None)* | Optional JWT audience claim validation. |

---

## 🩺 Health Check & Verification

### 1. Verify Backend REST API & Sessions

```bash
curl -s http://localhost:3001/api/sessions | jq .
```
*Expected output: `{"success":true,"sessions":[...],"activeSessionId":"..."}`*

### 2. Verify Streamable HTTP MCP Endpoint

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-probe","version":"1.0"}}}'
```
*Expected output: HTTP 200 with `mcp-session-id` header and JSON-RPC initialization result.*

### 3. Verify Real-time SSE Stream

```bash
curl -N http://localhost:3001/api/events
```
*Expected output: `data: {"event":"CONNECTED","message":"Realtime Giramichi SSE Stream Established"}`*

### 4. Verify Frontend Dashboard

Navigate to `http://localhost:3000` (or `http://localhost:5173` if running `npm run dev`). The Kanban board and KPI Analytics ribbon should load immediately.
