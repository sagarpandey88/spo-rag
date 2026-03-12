export interface QueryRequest {
  query: string
  topK?: number
}

export interface SourceDocument {
  filename: string
  url: string
  content: string
  score: number
}

export interface QueryResponse {
  answer: string
  sources: SourceDocument[]
}

export interface IndexStats {
  totalDocuments: number
  totalChunks: number
  lastUpdated: string
  indexSize: number
}

export interface CrawlStatus {
  inProgress: boolean
}

export interface CrawlTriggerResponse {
  status: string
  message: string
}
