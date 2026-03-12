import { useNavigate } from 'react-router-dom'
import { FileSearch, MessageSquare, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    Icon: FileSearch,
    title: 'Smart Document Search',
    description:
      'Semantic search across all your SharePoint documents using vector embeddings — finds meaning, not just keywords.',
  },
  {
    Icon: MessageSquare,
    title: 'Conversational Q&A',
    description:
      'Ask questions in natural language and get precise answers with cited source documents you can verify.',
  },
  {
    Icon: Settings,
    title: 'Easy Administration',
    description:
      'Monitor index health, view document statistics, and trigger re-crawls from a simple admin interface.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="w-full bg-gradient-to-b from-muted/50 to-background py-24 px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Powered by RAG · OpenAI · Pinecone
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            SharePoint Document Intelligence
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Ask questions about your SharePoint documents and get accurate, AI-generated answers
            backed by real sources. No more digging through folders.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/chat')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl py-20 px-4">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Everything you need</h2>
          <p className="mt-2 text-muted-foreground">
            Built for teams that rely on SharePoint as their knowledge base.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(({ Icon, title, description }) => (
            <Card key={title} className="text-center">
              <CardHeader className="items-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="w-full border-t bg-muted/30 py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            {[
              { step: '1', title: 'Crawl', desc: 'The crawler scans your SharePoint library and extracts text from PDF and Word documents.' },
              { step: '2', title: 'Index', desc: 'Documents are chunked, embedded with SBERT, and stored in a Pinecone vector index for fast retrieval.' },
              { step: '3', title: 'Ask', desc: 'Your question is embedded and matched against the index. An LLM generates an answer with cited sources.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {step}
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full border-t py-16 px-4 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-bold">Ready to explore your documents?</h2>
          <p className="text-muted-foreground">
            Start chatting with your document knowledge base right now.
          </p>
          <Button size="lg" onClick={() => navigate('/chat')}>
            Start Chatting
          </Button>
        </div>
      </section>
    </div>
  )
}
