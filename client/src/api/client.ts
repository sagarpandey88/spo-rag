import type {
  QueryResponse,
  IndexStats,
  CrawlStatus,
  CrawlTriggerResponse,
} from '@/types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' })) as { message?: string }
    throw new Error(body.message ?? `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function queryDocuments(query: string, topK?: number): Promise<QueryResponse> {
  return request<QueryResponse>('/api/query', {
    method: 'POST',
    body: JSON.stringify({ query, topK }),
  })
}

export function getStats(): Promise<IndexStats> {
  return request<IndexStats>('/api/query/stats')
}

export function triggerCrawl(): Promise<CrawlTriggerResponse> {
  return request<CrawlTriggerResponse>('/api/crawler/trigger', { method: 'POST' })
}

export function getCrawlStatus(): Promise<CrawlStatus> {
  return request<CrawlStatus>('/api/crawler/status')
}
