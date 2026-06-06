import { getTranslations } from 'next-intl/server'
import { requireAuth, getClientLinkedToUser } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientList } from '@/components/clients/client-list'
import { RmmImportButton } from '@/components/clients/rmm-import-button'
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
    include: { _count: { select: { contacts: true, equipment: true, dnsZones: true, m365Tenants: true, nextcloudServices: true, voipServices: true } } },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {session.user.role === 'ADMIN' && (
          <div className="flex items-center gap-2">
            <RmmImportButton />
            <Button asChild>
              <Link href="/clients/new">{t('new')}</Link>
            </Button>
          </div>
        )}
      </div>
      <ClientList clients={clients} />
    </AppLayout>
  )
}
