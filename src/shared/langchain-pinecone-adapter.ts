import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { config } from './config';
import { logger } from './logger';

type PineconeIndex = any;

export class PineconeStore {
  private pineconeIndex: PineconeIndex;
  private embeddings: any;
  private textKey: string;

  constructor(opts: { pineconeIndex: PineconeIndex; embeddings: any; textKey?: string }) {
    this.pineconeIndex = opts.pineconeIndex;
    this.embeddings = opts.embeddings;
    this.textKey = opts.textKey ?? 'pageContent';
  }

  static async fromDocuments(docs: any[], embeddings: any, opts: any = {}): Promise<PineconeStore> {
    let index: PineconeIndex | undefined = opts?.pineconeIndex;

    if (!index) {
      const pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });
      index = pinecone.Index({ name: config.pinecone.indexName });
    }

    const store = new PineconeStore({ pineconeIndex: index, embeddings, textKey: opts?.textKey });
    await store.addDocuments(docs);
    return store;
  }

  static async fromExistingIndex(embeddings: any, opts: any = {}): Promise<PineconeStore> {
    let index: PineconeIndex | undefined = opts?.pineconeIndex;

    if (!index) {
      const pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });
      index = pinecone.Index({ name: config.pinecone.indexName });
    }

    return new PineconeStore({ pineconeIndex: index, embeddings, textKey: opts?.textKey });
  }

  async addDocuments(docs: any[]): Promise<void> {
    if (!docs || docs.length === 0) return;

    try {
      // Extract texts and compute embeddings in batches
      const texts: string[] = docs.map((d: any) => d.pageContent ?? d.text ?? '');

      const embeddings = await this.embeddings.embedDocuments(texts);

      const records = embeddings.map((values: number[], i: number) => {
        const meta = docs[i].metadata ?? {};
        const idPrefix = (meta && meta.documentId) ? `${meta.documentId}-${meta.chunkIndex ?? i}` : `${Date.now()}-${i}`;
        const metadata = { ...meta, [this.textKey]: texts[i] };

        return {
          id: idPrefix,
          values,
          metadata,
        };
      });

      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await this.pineconeIndex.upsert({ records: batch });
      }
    } catch (err) {
      logger.error('Failed to add documents to Pinecone index', { err });
      throw err;
    }
  }

  asRetriever(k = 4) {
    const self = this;

    return {
      async getRelevantDocuments(query: string) {
        const qEmbedding = await self.embeddings.embedQuery(query);
        const resp = await self.pineconeIndex.query({ vector: qEmbedding, topK: k, includeMetadata: true });
        const matches = resp?.matches ?? resp?.results ?? [];

        return (matches || []).map((m: any) => {
          const metadata = m.metadata ?? {};
          const pageContent = metadata[self.textKey] ?? metadata.pageContent ?? '';
          return new Document({ pageContent, metadata });
        });
      },
    };
  }
}

export default PineconeStore;
