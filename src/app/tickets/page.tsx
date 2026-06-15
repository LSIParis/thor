import { requireAuth } from '@/lib/access'
import { ExternalLink } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'

export default async function TicketsPage() {
  await requireAuth()
  const zammadUrl = process.env.ZAMMAD_URL ?? ''

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <p className="text-muted-foreground">
          La gestion des tickets est assurée via Zammad.
        </p>
        {zammadUrl && (
          <a
            href={zammadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <ExternalLink size={16} />
            Ouvrir Zammad
          </a>
        )}
      </div>
    </AppLayout>
  )
}
