import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { deleteClient } from '@/actions/clients'

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()
  const t = await getTranslations('clients')

  const accessible = await canAccessClient(session.user.id, session.user.role, id)
  if (!accessible) notFound()

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { lastName: 'asc' } },
      equipment: { orderBy: { type: 'asc' } },
      licenses: { orderBy: { name: 'asc' } },
    },
  })
  if (!client) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const deleteWithId = deleteClient.bind(null, id)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
          {client.email && <p className="text-muted-foreground text-sm">{client.email}</p>}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/clients/${id}/edit`}>{t('edit')}</Link>
            </Button>
            <form action={deleteWithId}>
              <Button variant="destructive" type="submit">{t('delete')}</Button>
            </form>
          </div>
        )}
      </div>
      <ClientDetailTabs
        clientId={id}
        contacts={client.contacts}
        equipment={client.equipment}
        licenses={client.licenses}
        canEdit={isAdmin}
      />
    </AppLayout>
  )
}
