import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { assignClientToUser, unassignClientFromUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function UserAssignmentPage({ params }: Props) {
  const { id } = await params
  await requireAdmin()
  const t = await getTranslations('admin')

  const [user, allClients] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { clients: { include: { client: true } } },
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!user) notFound()

  const assignedClientIds = new Set(user.clients.map((uc) => uc.clientId))
  const unassigned = allClients.filter((c) => !assignedClientIds.has(c.id))
  const assignWithUserId = assignClientToUser.bind(null, id)

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">{user.name}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('assignedClients')}</p>
        <div className="space-y-2 mb-6">
          {user.clients.map(({ client }) => {
            const unassignWithIds = unassignClientFromUser.bind(null, id, client.id)
            return (
              <div key={client.id} className="flex items-center justify-between p-3 rounded bg-card border border-border">
                <span className="text-sm">{client.name}</span>
                <form action={unassignWithIds}>
                  <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                    Retirer
                  </Button>
                </form>
              </div>
            )
          })}
          {user.clients.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucun client assigné</p>
          )}
        </div>
        {unassigned.length > 0 && (
          <form action={assignWithUserId} className="flex gap-2">
            <select
              name="clientId"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button type="submit">Assigner</Button>
          </form>
        )}
        <div className="mt-6">
          <Button variant="ghost" asChild>
            <Link href="/admin/users">← Retour</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
