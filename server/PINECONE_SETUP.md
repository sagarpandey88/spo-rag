Pinecone setup for spo-rag

This project now uses Pinecone for vector storage. Follow these steps to create and configure a Pinecone index and run the crawler to populate it.

1) Create a Pinecone account
- Go to https://app.pinecone.io/ and sign up or sign in.

2) Create an Index
- In the Pinecone console, create a new index.
- Recommended settings for SBERT (`Xenova/all-MiniLM-L6-v2`):
  - Name: `sporag` (or any name you prefer)
  - Dimension: `384` (the SBERT model used produces 384-dimensional embeddings)
  - Metric: `cosine` (recommended for semantic search)

3) Get API key and environment
- In the Pinecone console, create or copy an API key.
- Note the environment/region value shown in the console (e.g. `us-west1-gcp`).

4) Configure environment variables
- Create a `.env` file (or update your existing one) with the following values:

PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=sporag
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

- See `.env.example` for reference.

5) Install dependencies and build

```bash
npm install
npm run build
```

6) Run the crawler to index documents
- Ensure your other environment variables (Azure, SharePoint, OpenAI) are configured.
- Run the crawler to process and index documents into Pinecone:

```bash
npm run crawler
```

7) Verify
- The server will connect to Pinecone on startup. Start the API:

```bash
npm run api
```

- Use the API endpoints (`/api/query`) to run queries. The index stats endpoint `/api/query/stats` will show index metadata once populated.

Notes
- If you need to create an index programmatically, you can use the Pinecone controller API or the web console.
- Dimension must match the embedding model output. If you change the embedding model, update the index dimension accordingly.
- Pinecone is a managed service — you do not need to run a local vector database container.
