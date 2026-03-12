export interface DocumentMetadata {
  id: string;
  filename: string;
  url: string;
  path: string;
  modified: Date;
  size: number;
  contentType: string;
  library: string;
}

export interface ProcessedDocument {
  metadata: DocumentMetadata;
  content: string;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  documentId: string;
  filename: string;
  url: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface QueryRequest {
  query: string;
  topK?: number;
}

export interface QueryResponse {
  answer: string;
  sources: SourceDocument[];
}

export interface SourceDocument {
  filename: string;
  url: string;
  content: string;
  score: number;
}

export interface CrawlResult {
  documentsProcessed: number;
  documentsSkipped: number;
  errors: CrawlError[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface CrawlError {
  filename: string;
  error: string;
  timestamp: Date;
}

export interface IndexStats {
  totalDocuments: number;
  totalChunks: number;
  lastUpdated: Date;
  indexSize: number;
}
