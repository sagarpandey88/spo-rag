# SharePoint RAG

A full-stack Retrieval-Augmented Generation (RAG) solution that crawls SharePoint document libraries, indexes the content into a Pinecone vector store, and exposes both a REST API and a React chat interface for intelligent document Q&A.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Azure AD Setup](#azure-ad-setup)
- [Pinecone Setup](#pinecone-setup)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Server](#server)
  - [Client](#client)
  - [Docker](#docker)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)

---

## Overview

SharePoint RAG connects to a SharePoint site using Azure AD certificate-based authentication, downloads PDF and Word documents, generates semantic embeddings with an SBERT model, and stores them in Pinecone. A Langchain RetrievalQA chain powers natural-language queries over those documents through an Express.js REST API. The React frontend provides a chat interface and an admin panel for managing the index.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   SharePoint    │ ───> │     Crawler      │ ───> │    Pinecone      │
│    Library      │      │   (Scheduled)    │      │  (Vector Store)  │
└─────────────────┘      └──────────────────┘      └──────────────────┘
                                                            │
                                                            │ Load / Watch
                                                            ▼
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  React Client   │ <──> │   REST API       │ <──> │   RAG Chain      │
│  (Vite + TS)    │      │  (Express.js)    │      │  (Langchain)     │
└─────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## Project Structure

```
spo-rag/
├── client/                         # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts           # Typed API client (fetch wrapper)
│   │   ├── components/
│   │   │   ├── chat/               # Chat-specific components
│   │   │   ├── layout/             # Navbar and layout components
│   │   │   └── ui/                 # Radix UI / shadcn-style primitives
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Landing page
│   │   │   ├── ChatPage.tsx        # Interactive document chat
│   │   │   └── AdminPage.tsx       # Index stats & crawl management
│   │   └── types.ts                # Shared TypeScript types
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── server/                         # Node.js backend (Express + TypeScript)
    ├── src/
    │   ├── api/
    │   │   ├── server.ts           # Express app entry point
    │   │   ├── middleware/
    │   │   │   └── error-handler.ts
    │   │   ├── routes/
    │   │   │   ├── query.ts        # /api/query endpoints
    │   │   │   └── crawler.ts      # /api/crawler endpoints
    │   │   └── services/
    │   │       └── index-watcher.ts # Reload index on updates
    │   ├── crawler/
    │   │   ├── index.ts            # Crawler entry point
    │   │   ├── sharepoint-client.ts # PnPjs SharePoint auth & listing
    │   │   ├── document-processor.ts # PDF / Word text extraction
    │   │   └── indexer.ts          # Chunk, embed & upsert to Pinecone
    │   └── shared/
    │       ├── config.ts           # Zod-validated env config
    │       ├── embeddings.ts       # SBERT embedding wrapper
    │       ├── vector-store.ts     # Pinecone vector store helpers
    │       ├── langchain-pinecone-adapter.ts
    │       ├── logger.ts           # Winston logger
    │       └── types.ts
    ├── docker-compose.yml
    ├── Dockerfile
    └── package.json
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or higher |
| npm | 9 or higher |
| Azure AD App Registration | — |
| OpenAI or Azure OpenAI API key | — |
| Pinecone account | — |

---

## Azure AD Setup

### 1. Register an Application

1. Go to **Azure Portal → Azure Active Directory → App registrations → New registration**.
2. Set a name (e.g. `SharePoint RAG`) and choose **Single tenant**.
3. Click **Register**.

### 2. Add API Permissions

1. Open **API permissions → Add a permission → SharePoint → Application permissions**.
2. Add `Sites.Read.All`.
3. Click **Grant admin consent**.

### 3. Generate a Certificate

```bash
# Create key + cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Combine into one file expected by the app
cat key.pem cert.pem > certificate.pem

# Get the thumbprint (no colons)
openssl x509 -in cert.pem -fingerprint -noout | sed 's/://g' | cut -d'=' -f2
```

Alternatively, run the included PowerShell helper:

```powershell
# server/scripts/generateSelfSignCert.ps1
```

### 4. Upload the Certificate to Azure AD

1. **Certificates & secrets → Upload certificate** → upload `cert.pem`.
2. Copy the thumbprint shown after upload.

### 5. Collect Values

| Value | Where to find it |
|---|---|
| Tenant ID | Azure AD → Overview |
| Client ID | App registrations → your app → Application (client) ID |
| Certificate path | Local path to `certificate.pem` |
| Thumbprint | Certificates & secrets page |

---

## Pinecone Setup

1. Sign in at <https://app.pinecone.io/> and create a new index with these settings:

   | Setting | Value |
   |---|---|
   | Name | `sporag` (or any name) |
   | Dimension | `384` |
   | Metric | `cosine` |

2. Copy the **API key** and **environment** (e.g. `us-west1-gcp`) from the Pinecone console.

---

## Environment Variables

### Server (`server/.env`)

```env
# Azure AD
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CERTIFICATE_PATH=/path/to/certificate.pem
AZURE_THUMBPRINT=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# SharePoint
SHAREPOINT_SITE_URL=https://tenant.sharepoint.com/sites/yoursite
SHAREPOINT_LIBRARY_NAME=Documents

# Azure OpenAI (use AZURE_OPENAI_API_KEY for both standard and Azure endpoints)
AZURE_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
AZURE_OPENAI_MODEL=gpt-4-turbo-preview
# Azure OpenAI only (optional for standard OpenAI)
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=sporag

# Chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# SBERT model (downloaded automatically)
SBERT_MODEL=Xenova/all-MiniLM-L6-v2

# API server
API_PORT=3000
API_HOST=0.0.0.0

# Logging
LOG_LEVEL=info
```

### Client (`client/.env`)

```env
# URL of the running server API (defaults to http://localhost:3000)
VITE_API_URL=http://localhost:3000
```

---

## Getting Started

### Server

```bash
cd server

# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env
nano .env

# Run the crawler to index SharePoint documents (one-off)
npm run crawler

# Start the API server (development, with auto-reload)
npm run dev

# Start the API server (production)
npm run api
```

> The first crawler run downloads the SBERT model automatically and may take a few minutes.

### Client

```bash
cd client

# Install dependencies
npm install

# Copy environment template (optional — defaults to localhost:3000)
cp .env.example .env

# Start the development server
npm run dev

# Build for production
npm run build
```

The client dev server starts on `http://localhost:5173` by default.

### Docker

Build and run both services with Docker Compose from the `server/` directory:

```bash
cd server

# Run the crawler (one-off)
docker compose --profile crawler up --build crawler

# Start the API server
docker compose up --build api
```

Volumes are mounted for:
- `./certs` → `/app/certs` (read-only) — certificate files
- `./logs` → `/app/logs` — application logs

---

## API Reference

All endpoints are served by the Express server (default: `http://localhost:3000`).

### Health Check

```
GET /health
```

### Query Documents

```
POST /api/query
Content-Type: application/json

{
  "query": "What is the remote work policy?",
  "topK": 4
}
```

**Response**

```json
{
  "answer": "Based on the company documents...",
  "sources": [
    {
      "filename": "HR-Policy.pdf",
      "url": "https://tenant.sharepoint.com/...",
      "content": "Relevant excerpt...",
      "score": 0.85
    }
  ]
}
```

### Get Index Statistics

```
GET /api/query/stats
```

**Response**

```json
{
  "totalDocuments": 45,
  "totalChunks": 523,
  "lastUpdated": "2025-12-17T10:30:00.000Z",
  "indexSize": 2048000
}
```

### Trigger Manual Crawl

```
POST /api/crawler/trigger
```

**Response**

```json
{
  "status": "accepted",
  "message": "Crawl started in background"
}
```

### Get Crawl Status

```
GET /api/crawler/status
```

**Response**

```json
{
  "inProgress": false
}
```

---

## Tech Stack

### Server

| Library | Purpose |
|---|---|
| Express.js | REST API framework |
| Langchain + `@langchain/openai` | RetrievalQA chain & LLM integration |
| `@pinecone-database/pinecone` | Vector store |
| `@huggingface/transformers` | SBERT embeddings (Xenova/all-MiniLM-L6-v2) |
| `@pnp/sp` + `@pnp/nodejs` | SharePoint authentication & file listing |
| `pdf-parse` + `mammoth` | PDF and Word document text extraction |
| Winston | Structured logging |
| Zod | Environment variable validation |
| Docker + Docker Compose | Containerized deployment |

### Client

| Library | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| React Router v7 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Radix UI (shadcn primitives) | Accessible UI components |
| Lucide React | Icon set |
