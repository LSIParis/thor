import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import { AddSiteDialog } from '@/components/sites/add-site-dialog'
import { SitesView } from '@/components/sites/sites-view'
import { ImportRmmSitesButton } from '@/components/sites/import-rmm-button'

const SITE_SELECT = {
  id: true, name: true, address: true, city: true,
  postalCode: true, country: true, phone: true, email: true,
  digicode1: true, digicode2: true, interphone: true, etage: true,
  heureOuverture: true, heureFermeture: true,
  isHeadquarters: true, isDefault: true, notes: true,
} as const

const SITE_ORDER = [
  { isDefault: 'desc' as const },
  { isHeadquarters: 'desc' as const },
  { name: 'asc' as const },
]

export default async function SitesPage({
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

  const allClients = await prisma.client.findMany({
    where: accessFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // ── Vue filtrée : un seul client ──────────────────────────────────────────
  if (selectedClientId) {
    const clientAccess = isAdmin
      ? { id: selectedClientId }
      : { id: selectedClientId, users: { some: { userId } } }

    const client = await prisma.client.findFirst({
      where: clientAccess,
      select: {
        id: true,
        name: true,
        tacticalRmmId: true,
        sites: { orderBy: SITE_ORDER, select: SITE_SELECT },
      },
    })

    const sites = client?.sites ?? []

    return (
      <AppLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sites</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {client?.name} — {sites.length} site{sites.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {client?.tacticalRmmId && (
                <ImportRmmSitesButton clientId={selectedClientId} />
              )}
              <AddSiteDialog clients={allClients} selectedClientId={selectedClientId} />
            </div>
          )}
        </div>

        <SitesView mode="single" sites={sites} isAdmin={isAdmin} />
      </AppLayout>
    )
  }

  // ── Vue globale : tous les clients, colonne client à gauche ───────────────
  const sites = await prisma.site.findMany({
    where: { client: accessFilter },
    select: { ...SITE_SELECT, client: { select: { id: true, name: true } } },
    orderBy: [{ client: { name: 'asc' } }, ...SITE_ORDER],
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sites</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sites.length} site{sites.length !== 1 ? 's' : ''} · {allClients.length} client{allClients.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <AddSiteDialog clients={allClients} />
        )}
      </div>

      <SitesView mode="all" sites={sites} isAdmin={isAdmin} />
    </AppLayout>
  )
}
