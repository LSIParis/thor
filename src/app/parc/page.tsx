import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import { ParcList } from '@/components/parc/parc-list'
import { RmmAgentsImportButton } from '@/components/equipment/rmm-agents-import-button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const EQ_SELECT = {
  id: true, type: true, operatingSystem: true, brand: true, model: true,
  serialNumber: true, ipAddress: true, ipType: true, rmmAgentId: true,
  notes: true, purchaseDate: true, warrantyDuration: true,
  site:       { select: { id: true, name: true } },
  assignedTo: { select: { firstName: true, lastName: true, role: true } },
} as const

const EQ_ORDER = [
  { type: 'asc' as const },
  { brand: 'asc' as const },
  { model: 'asc' as const },
]

export default async function ParcPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId  = session.user.id
  const role    = session.user.role
  const isAdmin = role === 'ADMIN'
  const accessFilter = isAdmin ? {} : { users: { some: { userId } } }

  // ── Vue filtrée : un seul client ──────────────────────────────────────────
  if (selectedClientId) {
    const clientAccess = isAdmin
      ? { id: selectedClientId }
      : { id: selectedClientId, users: { some: { userId } } }

    const client = await prisma.client.findFirst({
      where: clientAccess,
      select: {
        id: true, name: true, tacticalRmmId: true,
        equipment: { select: EQ_SELECT, orderBy: EQ_ORDER },
      },
    })

    const equipment = client?.equipment ?? []
    const total = equipment.length

    // Group by type for section headers
    const byType = equipment.reduce<Record<string, typeof equipment>>((acc, item) => {
      ;(acc[item.type] ??= []).push(item)
      return acc
    }, {})

    return (
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parc</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {client?.name} — {total} équipement{total !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {client?.tacticalRmmId && (
                <RmmAgentsImportButton clientId={selectedClientId} />
              )}
              <Link
                href={`/clients/${selectedClientId}/equipment/new`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <Plus size={13} /> Ajouter
              </Link>
            </div>
          )}
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun équipement enregistré.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byType)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([type, items]) => (
                <div key={type}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {type} <span className="font-normal normal-case">({items.length})</span>
                  </h2>
                  <ParcList equipment={items} clientId={selectedClientId} isAdmin={isAdmin} />
                </div>
              ))
            }
          </div>
        )}
      </AppLayout>
    )
  }

  // ── Vue globale : tous les clients ────────────────────────────────────────
  const clients = await prisma.client.findMany({
    where: { ...accessFilter, equipment: { some: {} } },
    select: {
      id: true, name: true,
      equipment: { select: EQ_SELECT, orderBy: EQ_ORDER },
    },
    orderBy: { name: 'asc' },
  })

  const total = clients.reduce((a, c) => a + c.equipment.length, 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parc</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} équipement{total !== 1 ? 's' : ''} · {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun équipement enregistré.</p>
      ) : (
        <div className="space-y-8">
          {clients.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <h2 className="text-sm font-semibold">{c.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {c.equipment.length} équipement{c.equipment.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ParcList equipment={c.equipment} clientId={c.id} isAdmin={isAdmin} />
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
