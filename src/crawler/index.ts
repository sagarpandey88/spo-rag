#!/usr/bin/env node

import { SharePointClient } from './sharepoint-client';
import { DocumentProcessor } from './document-processor';
import { Indexer } from './indexer';
import { VectorStore } from '../shared/vector-store';
import { logger } from '../shared/logger';
import { CrawlResult, CrawlError, ProcessedDocument, IndexStats } from '../shared/types';

async function main() {
  const startTime = new Date();
  const errors: CrawlError[] = [];
  let documentsProcessed = 0;
  let documentsSkipped = 0;
  const processedDocuments: ProcessedDocument[] = [];

  try {
    logger.info('Starting SharePoint crawler');

    // Initialize SharePoint client
    const spClient = new SharePointClient();
    await spClient.initialize();

    // List all documents
    const documents = await spClient.listDocuments();
    logger.info(`Found ${documents.length} documents to process`);

    // Process each document
    const processor = new DocumentProcessor();

    for (const docMetadata of documents) {
      try {
        logger.info(`Processing: ${docMetadata.filename}`);

        // Download document
        const buffer = await spClient.downloadDocument(docMetadata.path);

        // Process document
        const processedDoc = await processor.processDocument(buffer, docMetadata);
        processedDocuments.push(processedDoc);

        documentsProcessed++;
        logger.info(`Successfully processed: ${docMetadata.filename}`);
      } catch (error) {
        documentsSkipped++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error(`Failed to process: ${docMetadata.filename}`, { error: errorMessage });
        
        errors.push({
          filename: docMetadata.filename,
          error: errorMessage,
          timestamp: new Date(),
        });

        // Continue processing other documents (error recovery strategy)
        continue;
      }
    }

    // Create or update FAISS index
    logger.info('Creating FAISS index');
    const indexer = new Indexer();
    const vectorStore = await indexer.createIndex(processedDocuments);

    // Calculate stats
    const totalChunks = processedDocuments.reduce(
      (sum, doc) => sum + doc.chunks.length,
      0
    );

    const stats: IndexStats = {
      totalDocuments: documentsProcessed,
      totalChunks,
      lastUpdated: new Date(),
      indexSize: 0, // Will be calculated after saving
    };

    // Save index
    logger.info('Saving FAISS index');
    const vectorStoreManager = new VectorStore();
    await vectorStoreManager.save(vectorStore, stats);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // const result: CrawlResult = {
    //   documentsProcessed,
    //   documentsSkipped,
    //   errors,
    //   startTime,
    //   endTime,
    //   duration,
    // };

    logger.info('Crawl completed', {
      documentsProcessed,
      documentsSkipped,
      totalChunks,
      duration: `${(duration / 1000).toFixed(2)}s`,
      errorCount: errors.length,
    });

    if (errors.length > 0) {
      logger.warn('Crawl completed with errors', { errors });
    }

    process.exit(0);
  } catch (error) {
    logger.error('Crawl failed', { error });
    process.exit(1);
  }
}

// Run the crawler
main().catch((error) => {
  logger.error('Unexpected error', { error });
  process.exit(1);
});
