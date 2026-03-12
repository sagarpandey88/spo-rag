import { ExternalLink } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { SourceDocument } from '@/types'

interface Props {
  sources: SourceDocument[]
}

export function SourcesAccordion({ sources }: Props) {
  return (
    <div className="w-full">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="sources" className="border rounded-lg px-3 border-b-0">
          <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
            {sources.length} Source{sources.length !== 1 ? 's' : ''}
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-2">
              {sources.map((source, idx) => (
                <div
                  key={idx}
                  className="rounded-md border bg-background p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {source.filename}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {(source.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {source.content}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
