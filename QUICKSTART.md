# Quick Start Guide

This guide will help you get the SharePoint RAG solution up and running quickly.

## Step 1: Azure AD Setup (15 minutes)

1. **Create App Registration**:
   ```
   Azure Portal → Azure AD → App registrations → New registration
   Name: "SharePoint RAG"
   ```

2. **Add API Permissions**:
   ```
   API permissions → Add permission → SharePoint → Application permissions
   Add: Sites.Read.All
   Grant admin consent ✓
   ```

3. **Generate Certificate**:
   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   cat key.pem cert.pem > certificate.pem
   openssl x509 -in cert.pem -fingerprint -noout | sed 's/://g' | cut -d'=' -f2
   ```

4. **Upload Certificate**:
   ```
   Certificates & secrets → Upload certificate → cert.pem
   Copy the thumbprint
   ```

5. **Collect Values**:
   - Tenant ID: Azure AD → Overview
   - Client ID: App registrations → Application ID
   - Thumbprint: From step 4

## Step 2: Install & Configure (5 minutes)

```bash
# Clone and install
git clone <repo-url>
cd spo-rag
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your values
```

Required `.env` values:
```env
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CERTIFICATE_PATH=/path/to/certificate.pem
AZURE_THUMBPRINT=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

SHAREPOINT_SITE_URL=https://tenant.sharepoint.com/sites/site
SHAREPOINT_LIBRARY_NAME=Documents

OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Run Crawler (Depends on document count)

```bash
# Build the project
npm run build

# Run crawler to index documents
npm run crawler
```

Expected output:
```
[INFO] Starting SharePoint crawler
[INFO] Found 45 documents to process
[INFO] Processing: Document1.pdf
[INFO] Successfully processed: Document1.pdf
...
[INFO] Created 523 chunks from 45 documents
[INFO] FAISS index saved successfully
[INFO] Crawl completed - documentsProcessed: 45, duration: 145.32s
```

## Step 4: Start API (< 1 minute)

```bash
# Start the API server
npm run api
```

Expected output:
```
[INFO] FAISS index loaded successfully
[INFO] Server running on http://0.0.0.0:3000
[INFO] API endpoints:
  POST http://0.0.0.0:3000/api/query - Submit RAG queries
  GET  http://0.0.0.0:3000/health - Health check
```

## Step 5: Test Queries

### Health Check
```bash
curl http://localhost:3000/health
```

### Submit a Query
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main topics discussed in the documents?",
    "topK": 3
  }'
```

Expected response:
```json
{
  "answer": "Based on the documents, the main topics include...",
  "sources": [
    {
      "filename": "Policy.pdf",
      "url": "https://sharepoint.com/...",
      "content": "Relevant excerpt from the document...",
      "score": 0.87
    }
  ]
}
```

### Get Index Stats
```bash
curl http://localhost:3000/api/query/stats
```

### Trigger Manual Crawl
```bash
curl -X POST http://localhost:3000/api/crawler/trigger
```

## Docker Quick Start

If you prefer Docker:

```bash
# Build the image
docker-compose build

# Run crawler once
docker-compose --profile crawler up crawler

# Start API service
docker-compose up -d api

# Check logs
docker-compose logs -f api

# Test the API
curl http://localhost:3000/health
```

## Troubleshooting

### Issue: "AADSTS700016: Application not found"
**Solution**: Double-check Tenant ID and Client ID in `.env`

### Issue: "Access denied" from SharePoint
**Solution**: 
1. Verify API permissions are granted
2. Check admin consent was provided
3. Wait 5-10 minutes for permissions to propagate

### Issue: "Certificate error"
**Solution**: Ensure certificate.pem contains both private and public keys:
```bash
grep -c "BEGIN" certificate.pem  # Should output: 2
```

### Issue: "Index not found"
**Solution**: Run the crawler first:
```bash
npm run crawler
```

### Issue: "OpenAI API error"
**Solution**: 
1. Verify API key is valid
2. Check you have available credits
3. Ensure model name is correct (gpt-4-turbo-preview or gpt-3.5-turbo)

## Next Steps

1. **Schedule Crawler**: Set up a cron job for regular indexing
2. **Monitor Logs**: Check `./logs/combined.log` for activity
3. **Customize Chunks**: Adjust `CHUNK_SIZE` and `CHUNK_OVERLAP` in `.env`
4. **Scale**: Deploy behind a load balancer for production use

## Useful Commands

```bash
# View logs
tail -f logs/combined.log

# Check index size
du -sh data/faiss-index

# Rebuild index
rm -rf data/faiss-index && npm run crawler

# Run in development mode (auto-reload)
npm run dev

# Check TypeScript errors
npx tsc --noEmit
```

## Support

For issues or questions:
1. Check logs in `./logs/`
2. Review error messages carefully
3. Consult the main README.md
4. Create an issue with log excerpts
