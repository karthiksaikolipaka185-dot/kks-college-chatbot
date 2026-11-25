# KKS College Chatbot — Docker & Nginx Deployment Guide

This guide explains how to containerize, orchestrate, and run the KKS College Chatbot platform locally using Docker, Docker Compose, and Nginx.

---

## 1. Architecture Overview

The containerized stack runs two services on a shared bridge network (`kks-network`):

- **`frontend` (`kks-chatbot-frontend`)**: Multi-stage build compiling the React + Vite application (`VITE_API_URL=/api`) and serving static assets via **Nginx 1.27 Alpine** on host port `3000` (`3000:80`). Nginx also acts as a reverse proxy, forwarding all `/api/*` requests to `http://backend:5000`.
- **`backend` (`kks-chatbot-backend`)**: Multi-stage build compiling the TypeScript Express server (`tsconfig.build.json`) and running on **Node.js 24 Alpine** as the non-root `node` user on internal port `5000` (not exposed directly to the host). Connects to MongoDB Atlas, Groq, Gemini embeddings, and Vapi.

```text
Browser (http://localhost:3000)
   │
   ├──► /           ──► Nginx static assets + React SPA fallback (index.html)
   └──► /api/*      ──► Nginx reverse proxy ──► http://backend:5000/api/*
```

---

## 2. Dockerfiles & Nginx

- **Frontend (`client/KKS-platform/Dockerfile`)**:
  - *Builder stage*: `node:24-alpine`, installs dependencies via `npm ci`, sets `VITE_API_URL=/api`, and runs `npm run build`.
  - *Production stage*: `nginx:1.27-alpine`, copies `nginx.conf` and `/app/dist`, exposes port `80`.
- **Nginx (`client/KKS-platform/nginx.conf`)**:
  - Serves React assets with `try_files $uri $uri/ /index.html;` for client-side routing.
  - Proxies `/api/` to `http://backend:5000` preserving the `/api/` prefix, forwarding standard proxy headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`), and configuring `120s` read/send timeouts for AI responses.
- **Backend (`server/server/Dockerfile`)**:
  - *Builder stage*: `node:24-alpine`, installs dependencies via `npm ci`, compiles `src/` to `dist/` using `npx tsc -p tsconfig.build.json` (preserving `noEmit: true` in `tsconfig.json` for local dev and Vercel).
  - *Production stage*: `node:24-alpine`, installs production dependencies only (`npm ci --omit=dev`), copies `dist/` and `knowledge-base/`, runs as non-root `USER node`, defines a `HEALTHCHECK` against `/api/health`, and starts `node dist/server.js`.

---

## 3. Environment Variables Setup

The `compose.yaml` file injects runtime configuration from `server/server/.env` via `env_file` (never hardcoded or baked into images). Ensure `server/server/.env` contains valid values for:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=<database_name>
VECTOR_INDEX_NAME=<vector_index_name>
JWT_SECRET=<your_jwt_secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
GOOGLE_API_KEY=<your_google_gemini_api_key>
GROQ_API_KEY=<your_groq_api_key>
GROQ_MODEL=openai/gpt-oss-120b
VAPI_API_KEY=<your_vapi_api_key>
VAPI_PHONE_NUMBER_ID=<your_vapi_phone_number_id>
VAPI_ASSISTANT_ID=<your_vapi_assistant_id>
```

---

## 4. Common Docker Compose Commands

- **Validate configuration**:
  ```bash
  docker compose config --quiet
  ```
- **Build images**:
  ```bash
  docker compose build
  ```
- **Start containers in detached mode**:
  ```bash
  docker compose up -d
  ```
- **Check container status & health**:
  ```bash
  docker compose ps
  ```
- **View logs**:
  ```bash
  docker compose logs -f
  docker compose logs backend
  docker compose logs frontend
  ```
- **Stop and remove containers**:
  ```bash
  docker compose down
  ```

---

## 5. Accessing & Verifying the Application

- **Frontend UI**: `http://localhost:3000`
- **API Health Check (via Nginx)**: `http://localhost:3000/api/health`
- **Swagger UI (via Nginx)**: `http://localhost:3000/api/docs/`
- **OpenAPI JSON Spec (via Nginx)**: `http://localhost:3000/api/docs.json`
