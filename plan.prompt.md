# Plan: SharePoint RAG with Node.js, FAISS & Langchain

Build a TypeScript-based RAG solution with a PnPjs crawler for SharePoint documents (PDF/Word), FAISS vector indexing via Langchain, and an Express.js query API. The crawler runs scheduled or on-demand, automatically reloading the API's FAISS index upon completion.

## Steps

1. **Initialize TypeScript project** with [package.json](package.json) including dependencies (`@pnp/sp`, `@pnp/nodejs`, `@langchain/openai`, `@langchain/community`, `faiss-node`, `express`, `pdf-parse`, `mammoth`, `dotenv`), [tsconfig.json](tsconfig.json) for Node.js target, and [.env.example](.env.example) with Azure AD credentials, SharePoint site/library, and OpenAI API key.

2. **Build SharePoint crawler** with [src/crawler/sharepoint-client.ts](src/crawler/sharepoint-client.ts) using `@pnp/sp` and Azure AD certificate authentication, [src/crawler/document-processor.ts](src/crawler/document-processor.ts) extracting text from PDF/Word files, [src/crawler/indexer.ts](src/crawler/indexer.ts) chunking at 1000 chars with 200 overlap and creating FAISS index with OpenAI embeddings, and [src/crawler/index.ts](src/crawler/index.ts) as CLI entry point.

3. **Implement FAISS persistence** in [src/shared/vector-store.ts](src/shared/vector-store.ts) with atomic index swapping (write to temp location, rename to production), file-based locking to prevent concurrent access, and event emission for index updates.

4. **Create Express.js API** in [src/api/server.ts](src/api/server.ts) loading FAISS on startup, [src/api/routes/query.ts](src/api/routes/query.ts) for RAG queries using `RetrievalQAChain`, [src/api/routes/crawler.ts](src/api/routes/crawler.ts) triggering on-demand crawls, and [src/api/services/index-watcher.ts](src/api/services/index-watcher.ts) monitoring index updates to automatically reload FAISS in-memory.

5. **Add configuration and utilities** in [src/shared/config.ts](src/shared/config.ts) validating environment variables with schemas, [src/shared/types.ts](src/shared/types.ts) for document metadata and query interfaces, [src/shared/logger.ts](src/shared/logger.ts) for structured logging, and error handling middleware in [src/api/middleware/error-handler.ts](src/api/middleware/error-handler.ts).

6. **Configure deployment** with npm scripts (`npm run crawler`, `npm run api`, `npm run dev`), [Dockerfile](Dockerfile) for containerization, [docker-compose.yml](docker-compose.yml) with separate crawler/API services sharing volume for FAISS data, and [README.md](README.md) documenting Azure AD setup requirements and usage.

## Further Considerations

1. **Error recovery**: Should the crawler skip and log failed documents or halt the entire crawl on errors like access denied or unsupported file formats?

2. **Incremental updates**: Initial implementation will do full re-indexing; do you want delta crawling (track modified dates) in the first version or add later?

3. **API response format**: Should responses include source document metadata (filename, URL, page number) alongside the generated answer for citation purposes?
