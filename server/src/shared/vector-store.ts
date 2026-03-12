import { Index, Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { PineconeStore } from './langchain-pinecone-adapter';
import { EventEmitter } from 'events';
import { config } from './config';
import { createSbertEmbeddings } from './embeddings';
import { logger } from './logger';
import { IndexStats } from './types';

export class VectorStore extends EventEmitter {
  private embeddings: any;
  private vectorStore: any | null = null;
  private pineconeClient: Pinecone | null = null;
  private pineconeIndex: Index<RecordMetadata> | null = null;

  constructor() {
    super();
    this.embeddings = createSbertEmbeddings();
  }

  private async initPineconeClient() {
    const client = new Pinecone({ apiKey: config.pinecone.apiKey });
    return client;
  }

  async load(): Promise<any> {
    try {
      logger.info('Connecting to Pinecone store');
      this.pineconeClient = await this.initPineconeClient();
      this.pineconeIndex = this.pineconeClient.Index({ name: config.pinecone.indexName });

      // Wrap existing index with LangChain PineconeStore
      this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings as any, {
        pineconeIndex: this.pineconeIndex,
        textKey: 'pageContent',
      } as any);

      logger.info('Pinecone store connected successfully');
      return this.vectorStore;
    } catch (error) {
      logger.error('Failed to connect to Pinecone store', { error });
      throw error;
    }
  }

  async save(vectorStore: any, stats: IndexStats): Promise<void> {
    this.vectorStore = vectorStore;
    logger.info('Pinecone index updated', { stats });
    this.emit('indexUpdated', stats);
  }

  getVectorStore(): any {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call load() first.');
    }
    return this.vectorStore;
  }

  async getStats(): Promise<IndexStats | null> {
    try {
      if (!this.pineconeClient) this.pineconeClient = await this.initPineconeClient();
      if (!this.pineconeIndex) this.pineconeIndex = this.pineconeClient.Index({ name: config.pinecone.indexName });

      const pineconeStats = await this.pineconeIndex.describeIndexStats();      
      const totalChunks: number = (pineconeStats.totalRecordCount) ?? 0;
      const dimension: number = (pineconeStats as any)?.dimension ?? 0;
      const documents : number = (pineconeStats as any)?.totalRecordCount ?? 0;

      return {
        totalDocuments: documents,
        totalChunks,
        lastUpdated: new Date(),
        indexSize: totalChunks * dimension * 4, // bytes (float32 per dimension per vector)
      };
    } catch (error) {
      logger.error('Failed to fetch stats from Pinecone', { error });
      return null;
    }
  }

  async indexExists(): Promise<boolean> {
    try {
      if (!this.pineconeClient) this.pineconeClient = await this.initPineconeClient();
      if (!this.pineconeIndex) this.pineconeIndex = this.pineconeClient.Index({ name: config.pinecone.indexName });

      const stats = await this.pineconeIndex.describeIndexStats();
      if (stats && (stats as any).namespaces) {
        for (const ns of Object.values((stats as any).namespaces)) {
          if ((ns as any).vectorCount && (ns as any).vectorCount > 0) return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
