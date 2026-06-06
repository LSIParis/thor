import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { MovementList } from '@/components/movements/movement-list'
import { getAccessibleClients } from '@/lib/access'

export default async function MouvementsPage() {
  const session = await requireAuth()
  const { id: userId, role } = session.user

  const accessibleClients = await getAccessibleClients(userId, role)
  const clientIds = accessibleClients.map((c) => c.id)

  const movements = await prisma.personnelMovement.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { date: 'desc' },
    include: { client: { select: { id: true, name: true } } },
  })

  const canEdit = role === 'ADMIN' || role === 'TECH'

  // Group by client for display
  const byClient = accessibleClients
    .map((client) => ({
      client,
      movements: movements.filter((m) => m.clientId === client.id),
    }))
    .filter((g) => g.movements.length > 0 || canEdit)

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">Entrées / Sorties du personnel</h1>

      {accessibleClients.length === 0 && (
        <p className="text-muted-foreground text-sm">Aucun client accessible.</p>
      )}

      <div className="space-y-8">
        {accessibleClients.map((client) => {
          const clientMovements = movements.filter((m) => m.clientId === client.id)
          return (
            <div key={client.id}>
              <h2 className="text-base font-medium mb-3 flex items-center gap-2">
                {client.name}
                <span className="text-xs text-muted-foreground font-normal">
                  {clientMovements.length} mouvement{clientMovements.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <MovementList
                movements={clientMovements}
                clientId={client.id}
                canEdit={canEdit}
                isClient={role === 'CLIENT'}
              />
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
