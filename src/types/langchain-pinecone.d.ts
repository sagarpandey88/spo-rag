declare module 'langchain/vectorstores/pinecone' {
  export class PineconeStore {
    static fromDocuments(docs: any[], embeddings: any, opts?: any): Promise<PineconeStore>;
    static fromExistingIndex(embeddings: any, opts?: any): Promise<PineconeStore>;
    addDocuments(docs: any[]): Promise<void>;
    asRetriever(k?: number): any;
  }
  export function fromDocuments(docs: any[], embeddings: any, opts?: any): Promise<PineconeStore>;
}
