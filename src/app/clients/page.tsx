import { getTranslations } from 'next-intl/server'
import { requireAuth, getClientLinkedToUser } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientList } from '@/components/clients/client-list'
import { RmmImportButton } from '@/components/clients/rmm-import-button'
import { SyncZammadButton } from '@/components/clients/sync-zammad-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function ClientsPage() {
  const session = await requireAuth()
  const t = await getTranslations('clients')

  // CLIENT users go directly to their client page
  if (session.user.role === 'CLIENT') {
    const clientId = await getClientLinkedToUser(session.user.id)
    if (clientId) redirect(`/clients/${clientId}`)
    redirect('/dashboard')
  }

  const clients = await prisma.client.findMany({
    where:
      session.user.role === 'ADMIN'
        ? undefined
        : { users: { some: { userId: session.user.id } } },
    orderBy: { name: 'asc' },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        {session.user.role === 'ADMIN' && (
          <div className="flex items-center gap-2">
            <SyncZammadButton />
            <RmmImportButton />
            <Button asChild size="sm">
              <Link href="/clients/new">{t('new')}</Link>
            </Button>
          </div>
        )}
      </div>
      <ClientList clients={clients} />
    </AppLayout>
  )
}
