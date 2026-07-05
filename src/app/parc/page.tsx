import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import { ParcList } from '@/components/parc/parc-list'
import { RmmAgentsImportButton } from '@/components/equipment/rmm-agents-import-button'
import { SyncAllRmmButton } from '@/components/parc/sync-all-rmm-button'
import { AssociateEquipmentDialog } from '@/components/parc/associate-equipment-dialog'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { Plus, Monitor } from 'lucide-react'

const EQ_SELECT = {
  id: true, type: true, operatingSystem: true, brand: true, model: true,
  serialNumber: true, ipAddress: true, ipType: true, rmmAgentId: true,
  notes: true, noSync: true, purchaseDate: true, warrantyDuration: true,
  assignedToId: true,
  site:       { select: { id: true, name: true } },
  assignedTo: { select: { firstName: true, lastName: true, role: true } },
} as const

const EQ_ORDER = [
  { type: 'asc' as const },
  { brand: 'asc' as const },
  { model: 'asc' as const },
]

// Cache par clientId — 30 secondes, invalidé par revalidatePath('/parc')
const getClientEquipment = unstable_cache(
  async (clientId: string) =>
    prisma.client.findFirst({
      where: { id: clientId },
      select: {
        id: true, name: true, tacticalRmmId: true,
        equipment: { select: EQ_SELECT, orderBy: EQ_ORDER },
      },
    }),
  ['parc-client-equipment'],
  { revalidate: 30, tags: ['parc'] },
)

// Vue globale — query légère : noms + comptages seulement
const getClientsSummary = unstable_cache(
  async (userId: string, isAdmin: boolean) =>
    prisma.client.findMany({
      where: isAdmin
        ? { equipment: { some: {} } }
        : { users: { some: { userId } }, equipment: { some: {} } },
      select: {
        id: true,
        name: true,
        tacticalRmmId: true,
        _count: { select: { equipment: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ['parc-clients-summary'],
  { revalidate: 30, tags: ['parc'] },
)

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

  // ── Vue filtrée : un seul client ──────────────────────────────────────────
  if (selectedClientId) {
    // Vérification d'accès (non-cachée, sécurité)
    if (!isAdmin) {
      const access = await prisma.userClient.findUnique({
        where: { userId_clientId: { userId, clientId: selectedClientId } },
      })
      if (!access) return null
    }

    const client = await getClientEquipment(selectedClientId)
    const equipment = client?.equipment ?? []
    const total = equipment.length

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
              {equipment.length > 0 && (
                <AssociateEquipmentDialog clientId={selectedClientId} equipment={equipment} />
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

  // ── Vue globale : liste légère (comptages uniquement) ─────────────────────
  const clients = await getClientsSummary(userId, isAdmin)
  const totalEquipment = clients.reduce((a, c) => a + c._count.equipment, 0)
  const rmmClientIds = clients.filter((c) => c.tacticalRmmId).map((c) => c.id)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parc</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalEquipment} équipement{totalEquipment !== 1 ? 's' : ''} · {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && rmmClientIds.length > 0 && (
          <SyncAllRmmButton clientIds={rmmClientIds} />
        )}
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun équipement enregistré.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/parc?client=${c.id}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors group"
            >
              <div className="flex-shrink-0 p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                <Monitor size={15} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c._count.equipment} équipement{c._count.equipment !== 1 ? 's' : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
