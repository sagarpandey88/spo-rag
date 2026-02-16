import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ProcessedDocument, DocumentChunk, ChunkMetadata } from '../shared/types';
import { config } from '../shared/config';
import { logger } from '../shared/logger';

export class Indexer {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.embeddingModel,
      ...(config.openai.baseURL && { baseURL: config.openai.baseURL }),
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.faiss.chunkSize,
      chunkOverlap: config.faiss.chunkOverlap,
    });
  }

  async createIndex(documents: ProcessedDocument[]): Promise<FaissStore> {
    try {
      logger.info(`Creating FAISS index for ${documents.length} documents`);

      // Split documents into chunks
      const allChunks: Document[] = [];
      
      for (const doc of documents) {
        const chunks = await this.chunkDocument(doc);
        doc.chunks = chunks;

        // Convert to Langchain Document format
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

      // Create FAISS index
      const vectorStore = await FaissStore.fromDocuments(
        allChunks,
        this.embeddings
      );

      logger.info('FAISS index created successfully');
      return vectorStore;
    } catch (error) {
      logger.error('Failed to create FAISS index', { error });
      throw error;
    }
  }

  private async chunkDocument(doc: ProcessedDocument): Promise<DocumentChunk[]> {
    try {
      const textChunks = await this.textSplitter.splitText(doc.content);
      const totalChunks = textChunks.length;

      const chunks: DocumentChunk[] = textChunks.map((content, index) => {
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
    vectorStore: FaissStore,
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
