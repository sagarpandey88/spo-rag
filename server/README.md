# SharePoint RAG with Node.js, pinecone & Langchain

A TypeScript-based Retrieval-Augmented Generation (RAG) solution that crawls SharePoint documents (PDF/Word), creates pinecone vector indexes using Langchain, and provides a REST API for intelligent document querying.

## Features

- **SharePoint Integration**: Automated document crawling from SharePoint libraries using PnPjs with Azure AD authentication
- **Document Processing**: Extract text from PDF and Word documents
- **Vector Indexing**: Pinecone-based vector store with SBERT embeddings for semantic search
- **RAG API**: Express.js REST API with RetrievalQA chain for intelligent question answering
- **Real-time Updates**: Automatic index reloading when crawler updates the vector store
- **Error Recovery**: Continues processing even when individual documents fail
- **Docker Support**: Containerized deployment with docker-compose

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   SharePoint    │ ───> │     Crawler      │ ───> │  Pinecone Index    │
│    Library      │      │   (Scheduled)    │      │  (Vector Store) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                            │
                                                            │ Load/Watch
                                                            ▼
                         ┌──────────────────┐      ┌─────────────────┐
                         │   REST API       │ <──> │  RAG Chain      │
                         │  (Express.js)    │      │  (Langchain)    │
                         └──────────────────┘      └─────────────────┘
```

## Prerequisites

1. **Node.js**: v18 or higher
2. **Azure AD App Registration**: For SharePoint authentication
3. **OpenAI API Key**: For chat completions
4. **SBERT Model Runtime**: Downloaded automatically via Hugging Face Transformers
5. **Certificate**: PEM certificate for Azure AD authentication

## Azure AD Setup

### 1. Register an Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - Name: `SharePoint RAG Application`
   - Supported account types: Single tenant
   - Click "Register"

### 2. Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission" → SharePoint → Application permissions
3. Add the following permissions:
   - `Sites.Read.All` - Read items in all site collections
4. Click "Grant admin consent"

### 3. Create a Certificate

```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout spo-rag-key.pem -out spo-rag-cert.pem -days 365 -nodes

# Combine into single PEM file
cat spo-rag-key.pem spo-rag-cert.pem > spo-rag-certificate.pem

# Get the thumbprint (needed for config)
openssl x509 -in spo-rag-cert.pem -fingerprint -noout | sed 's/://g' | cut -d'=' -f2
```

### 4. Upload Certificate to Azure AD

1. Go to "Certificates & secrets"
2. Click "Upload certificate"
3. Upload the `spo-rag-cert.pem` file
4. Note the thumbprint (should match the one generated above)

### 5. Collect Configuration Values

- **Tenant ID**: Azure AD → Overview → Tenant ID
- **Client ID**: App registrations → Your app → Application (client) ID
- **Certificate Path**: Path to your `certificate.pem` file
- **Thumbprint**: From certificate upload step

## Installation

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd spo-rag

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Build the project
npm run build
```

### Configuration

Edit `.env` file with your credentials:

## Usage

### Running the Crawler

```bash
# Run once to index all documents
npm run crawler
```

The crawler will:
1. Connect to SharePoint and list all PDF/Word documents
2. Download and process each document
3. Create text chunks with overlap
4. Generate embeddings using SBERT
5. Build and save pinecone index

### Running the API

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run api
```

The API will:
1. Load the index using pinecone index
2. Start watching for index updates
3. Serve REST endpoints on port 3000

### API Endpoints

#### Query Documents
```bash
POST http://localhost:3000/api/query
Content-Type: application/json

{
  "query": "What is the company policy on remote work?",
  "topK": 4
}

Response:
{
  "answer": "Based on the company documents...",
  "sources": [
    {
      "filename": "HR-Policy.pdf",
      "url": "https://sharepoint.com/...",
      "content": "Relevant excerpt...",
      "score": 0.85
    }
  ]
}
```

#### Get Index Statistics
```bash
GET http://localhost:3000/api/query/stats

Response:
{
  "totalDocuments": 45,
  "totalChunks": 523,
  "lastUpdated": "2025-12-17T10:30:00.000Z",
  "indexSize": 2048000
}
```

#### Trigger Manual Crawl
```bash
POST http://localhost:3000/api/crawler/trigger

Response:
{
  "status": "accepted",
  "message": "Crawl started in background"
}
```

#### Check Crawl Status
```bash
GET http://localhost:3000/api/crawler/status

Response:
{
  "inProgress": false
}
```

#### Health Check
```bash
GET http://localhost:3000/health

Response:
{
  "status": "ok",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "indexLoaded": true,
  "stats": { ... }
}
```

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker-compose build

# Run the crawler once
docker-compose --profile crawler up crawler

# Start the API service
docker-compose up -d api
```

### Docker Structure
- **Certificates**: Mount your certificate directory to `/app/certs`
- **Logs**: Logs are persisted to `./logs` directory

### Scheduled Crawling

To run the crawler on a schedule, use cron or a task scheduler:

```bash
# Add to crontab for daily crawl at 2 AM
0 2 * * * cd /path/to/spo-rag && docker-compose --profile crawler up crawler
```

## Project Structure

```
spo-rag/
├── server/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   └── error-handler.ts      # Error handling middleware
│   │   ├── routes/
│   │   │   ├── query.ts              # RAG query endpoints
│   │   │   └── crawler.ts            # Crawler trigger endpoints
│   │   ├── services/
│   │   │   └── index-watcher.ts      # SBERT index file watcher
│   │   └── server.ts                 # Express server setup
│   ├── crawler/
│   │   ├── sharepoint-client.ts      # SharePoint PnPjs client
│   │   ├── document-processor.ts     # PDF/Word text extraction
│   │   ├── indexer.ts                # SBERT indexing with chunking
│   │   └── index.ts                  # Crawler CLI entry point
│   └── shared/
│       ├── config.ts                 # Configuration with validation
│       ├── types.ts                  # TypeScript interfaces
│       ├── logger.ts                 # Winston logger
│       └── vector-store.ts           # Pinecone persistence & locking
├── .env.example                      # Environment template
├── Dockerfile                        # Container definition
├── docker-compose.yml                # Multi-service orchestration
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

## Error Handling

The crawler implements error recovery by default:
- **Document Failures**: Logs errors and continues with remaining documents
- **Partial Success**: Creates index even if some documents fail
- **Error Reporting**: All errors are logged with details in the crawl summary

To change this behavior, modify the error handling in [src/crawler/index.ts](src/crawler/index.ts).

## Further Considerations

### 1. Incremental Updates

The current implementation performs full re-indexing on each crawl. For better performance with large document libraries, consider implementing delta crawling:

- Track document modification dates
- Only reprocess changed documents
- Update Pinecone index incrementally
- Maintain document ID mapping for updates/deletions

### 2. Response Citations

API responses include source document metadata (filename, URL, content excerpts) to support citation and verification of generated answers.




## Troubleshooting

### Authentication Errors

```
Error: AADSTS700016: Application not found
```
- Verify Client ID and Tenant ID are correct
- Ensure app registration exists in correct tenant

### Certificate Issues

```
Error: unable to get local issuer certificate
```
- Verify certificate path is correct
- Ensure certificate has both private and public keys
- Check certificate thumbprint matches Azure AD

### SharePoint Access Denied

```
Error: Access denied. You do not have permission
```
- Verify API permissions are granted and consented
- Check SharePoint site URL is correct
- Ensure service account has access to the library



## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
A RAG app based on SPO
