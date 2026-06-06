import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteUser } from '@/actions/users'

export default async function UsersPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { clients: { include: { client: true } } },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('users')}</h1>
        <Button asChild>
          <Link href="/admin/users/new">{t('newUser')}</Link>
        </Button>
      </div>
      <div className="space-y-2">
        {users.map((user) => {
          const deleteWithId = deleteUser.bind(null, user.id)
          return (
            <div key={user.id} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">{user.email}</div>
                  {(user.role === 'TECH' || user.role === 'CLIENT') && user.clients.length > 0 && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {user.clients.map((uc) => uc.client.name).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {(user.role === 'TECH' || user.role === 'CLIENT') && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>{t('assignedClients')}</Link>
                    </Button>
                  )}
                  <form action={deleteWithId}>
                    <Button variant="destructive" size="sm" type="submit">
                      Supprimer
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
