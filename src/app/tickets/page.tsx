import { requireAuth } from '@/lib/access'

export default async function TicketsPage() {
  await requireAuth()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Tickets</h1>
      <p className="text-muted-foreground">Page en cours de construction.</p>
    </div>
  )
}
