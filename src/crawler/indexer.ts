import { PineconeClient } from '@pinecone-database/pinecone';
import { PineconeStore } from '../shared/langchain-pinecone-adapter';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ProcessedDocument, DocumentChunk, ChunkMetadata } from '../shared/types';
import { config } from '../shared/config';
import { createSbertEmbeddings } from '../shared/embeddings';
import { logger } from '../shared/logger';

export class Indexer {
  private embeddings: any;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = createSbertEmbeddings();

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.pinecone.chunkSize,
      chunkOverlap: config.pinecone.chunkOverlap,
    });
  }

  async createIndex(documents: ProcessedDocument[]): Promise<any> {
    try {
      logger.info(`Creating Pinecone index for ${documents.length} documents`);

      const allChunks: Document[] = [];

      for (const doc of documents) {
        const chunks = await this.chunkDocument(doc);
        doc.chunks = chunks;

        for (const chunk of chunks) {
          allChunks.push(
            new Document({
              pageContent: chunk.content,
              metadata: chunk.metadata,
            })
          );
        }
      }

      logger.info(`Created ${allChunks.length} chunks from ${documents.length} documents`);

      // Initialise Pinecone client and index
      const pinecone = new PineconeClient();
      await pinecone.init({ apiKey: config.pinecone.apiKey, environment: config.pinecone.environment });
      const index = pinecone.Index(config.pinecone.indexName);

      // Full re-index: delete all existing vectors in the index
      try {
        // Use the generated API method name `_delete` (TypeScript types expose `_delete`)
        if (typeof (index as any)._delete === 'function') {
          await (index as any)._delete({ deleteAll: true, namespace: '' });
        } else if (typeof (index as any).delete === 'function') {
          await (index as any).delete({ deleteAll: true, namespace: '' });
        }
      } catch (err) {
        logger.warn('Failed to clear Pinecone index before reindex', { err });
      }

      // Insert new chunks via LangChain PineconeStore
      const vectorStore = await PineconeStore.fromDocuments(allChunks, this.embeddings as any, {
        pineconeIndex: index,
        textKey: 'pageContent',
      } as any);

      logger.info('Pinecone index created successfully');
      return vectorStore;
    } catch (error) {
      logger.error('Failed to create Pinecone index', { error });
      throw error;
    }
  }

  private async chunkDocument(doc: ProcessedDocument): Promise<DocumentChunk[]> {
    try {
      const textChunks = await this.textSplitter.splitText(doc.content);
      const totalChunks = textChunks.length;

      const chunks: DocumentChunk[] = textChunks.map((content: string, index: number) => {
        const metadata: ChunkMetadata = {
          documentId: doc.metadata.id,
          filename: doc.metadata.filename,
          url: doc.metadata.url,
          chunkIndex: index,
          totalChunks,
        };

        return {
          content,
          metadata,
        };
      });

      logger.debug(`Split ${doc.metadata.filename} into ${chunks.length} chunks`);
      return chunks;
    } catch (error) {
      logger.error(`Failed to chunk document: ${doc.metadata.filename}`, { error });
      throw error;
    }
  }

  async addDocuments(
    vectorStore: any,
    documents: ProcessedDocument[]
  ): Promise<void> {
    try {
      logger.info(`Adding ${documents.length} documents to existing index`);

      const allChunks: Document[] = [];

      for (const doc of documents) {
        const chunks = await this.chunkDocument(doc);
        doc.chunks = chunks;

        for (const chunk of chunks) {
          allChunks.push(
            new Document({
              pageContent: chunk.content,
              metadata: chunk.metadata,
            })
          );
        }
      }

      await vectorStore.addDocuments(allChunks);
      logger.info(`Added ${allChunks.length} chunks to index`);
    } catch (error) {
      logger.error('Failed to add documents to index', { error });
      throw error;
    }
  }
}
