import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientList } from '@/components/clients/client-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function ClientsPage() {
  const session = await requireAuth()
  const t = await getTranslations('clients')

  const clients = await prisma.client.findMany({
    where:
      session.user.role === 'ADMIN'
        ? undefined
        : { users: { some: { userId: session.user.id } } },
    orderBy: { name: 'asc' },
    include: { _count: { select: { contacts: true, equipment: true, licenses: true } } },
  })

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {session.user.role === 'ADMIN' && (
          <Button asChild>
            <Link href="/clients/new">{t('new')}</Link>
          </Button>
        )}
      </div>
      <ClientList clients={clients} />
    </AppLayout>
  )
}
