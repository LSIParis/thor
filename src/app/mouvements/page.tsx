import { requireAuth, getAccessibleClients } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { MovementsTableView } from '@/components/movements/movements-table-view'

export default async function MouvementsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const { id: userId, role } = session.user

  const allAccessibleClients = await getAccessibleClients(userId, role)
  const accessibleClients = selectedClientId
    ? allAccessibleClients.filter((c) => c.id === selectedClientId)
    : allAccessibleClients
  const clientIds = accessibleClients.map((c) => c.id)

  const movements = await prisma.personnelMovement.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { date: 'desc' },
    include: { client: { select: { id: true, name: true } } },
  })

  const canEdit = role === 'ADMIN' || role === 'TECH'

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">Entrées / Sorties du personnel</h1>

      {accessibleClients.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun client accessible.</p>
      ) : (
        <MovementsTableView
          movements={movements}
          clients={accessibleClients}
          canEdit={canEdit}
          isClient={role === 'CLIENT'}
        />
      )}
    </AppLayout>
  )
}
