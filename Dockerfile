# ==============================================================================
# Unified Multi-Stage Dockerfile for Giramichi
# Supports build targets: server, frontend, mcp
# Default target: server
# ==============================================================================

# ------------------------------------------------------------------------------
# Base Node Build Phase
# ------------------------------------------------------------------------------
FROM node:20-alpine AS node-builder

RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Target: Server (Express API, SSE, Embedded SQLite)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS server

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/src ./src
COPY --from=node-builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3001
VOLUME ["/app/data"]

CMD ["npm", "run", "server"]

# ------------------------------------------------------------------------------
# Target: Frontend (React 19 + Vite Static Web Server)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS frontend

COPY --from=node-builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ------------------------------------------------------------------------------
# Target: MCP Server (Standalone HTTP MCP Server)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS mcp

WORKDIR /app
ENV NODE_ENV=production
ENV MCP_HTTP_PORT=3002

COPY package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/src ./src
COPY --from=node-builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3002
VOLUME ["/app/data"]

CMD ["npm", "run", "mcp:http"]
