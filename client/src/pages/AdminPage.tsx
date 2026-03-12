import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  Database,
  FileText,
  Clock,
  HardDrive,
  AlertCircle,
  Play,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { getStats, triggerCrawl, getCrawlStatus } from '@/api/client'
import type { IndexStats } from '@/types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminPage() {
  const [stats, setStats] = useState<IndexStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [crawlInProgress, setCrawlInProgress] = useState(false)
  const [crawlMessage, setCrawlMessage] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await getStats()
      setStats(data)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load index stats.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Poll crawl status while running
  useEffect(() => {
    if (!crawlInProgress) return
    const interval = setInterval(() => {
      getCrawlStatus()
        .then((s) => {
          if (!s.inProgress) {
            setCrawlInProgress(false)
            void loadStats()
          }
        })
        .catch(() => {
          // silently ignore polling errors
        })
    }, 2000)
    return () => clearInterval(interval)
  }, [crawlInProgress, loadStats])

  // Initial load
  useEffect(() => {
    void loadStats()
    getCrawlStatus()
      .then((s) => setCrawlInProgress(s.inProgress))
      .catch(() => {})
  }, [loadStats])

  const handleTriggerCrawl = async () => {
    setTriggerError(null)
    setCrawlMessage(null)
    try {
      const res = await triggerCrawl()
      setCrawlMessage(res.message)
      setCrawlInProgress(true)
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger crawl.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-muted-foreground">
          Manage document crawling and monitor the vector index.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Index Stats */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Index Statistics
              </CardTitle>
              <CardDescription className="mt-1">
                Current state of the Pinecone vector index
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void loadStats()}
              disabled={statsLoading}
              title="Refresh stats"
            >
              <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {statsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{statsError}</AlertDescription>
              </Alert>
            ) : statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : stats ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Documents
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {stats.totalDocuments.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    Chunks
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {stats.totalChunks.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Last Updated
                  </dt>
                  <dd className="font-medium">{formatDate(stats.lastUpdated)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" />
                    Index Size
                  </dt>
                  <dd className="font-medium tabular-nums">{formatBytes(stats.indexSize)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No index data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Crawl Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Crawl Controls
            </CardTitle>
            <CardDescription>Trigger and monitor SharePoint document crawling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status row */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm font-medium">Crawl Status</span>
              <Badge variant={crawlInProgress ? 'default' : 'secondary'}>
                {crawlInProgress ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    Running
                  </span>
                ) : (
                  'Idle'
                )}
              </Badge>
            </div>

            {crawlMessage && (
              <Alert>
                <AlertDescription>{crawlMessage}</AlertDescription>
              </Alert>
            )}

            {triggerError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{triggerError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              onClick={() => void handleTriggerCrawl()}
              disabled={crawlInProgress}
            >
              <Play className="mr-2 h-4 w-4" />
              {crawlInProgress ? 'Crawl in Progress…' : 'Trigger Crawl'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Starts a full re-crawl of all SharePoint documents and rebuilds the vector index.
              The status badge updates automatically every 2 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
