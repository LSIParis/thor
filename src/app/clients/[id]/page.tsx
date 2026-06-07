import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { ClientStats } from '@/components/clients/client-stats'
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
      equipment: { orderBy: { type: 'asc' }, include: { assignedTo: true } },
      m365Tenants: {
        orderBy: { displayName: 'asc' },
        include: {
          domains: { orderBy: { isDefault: 'desc' } },
          accounts: { orderBy: { displayName: 'asc' } },
        },
      },
      nextcloudServices: {
        orderBy: { name: 'asc' },
        include: { servers: { orderBy: { createdAt: 'asc' } } },
      },
      voipServices: {
        orderBy: { name: 'asc' },
        include: {
          equipment: { orderBy: { type: 'asc' } },
          trunks: { orderBy: { name: 'asc' } },
          extensions: { orderBy: { number: 'asc' } },
        },
      },
      dnsZones: {
        orderBy: { domain: 'asc' },
        include: { records: { orderBy: { type: 'asc' } } },
      },
      sslCertificates: { orderBy: { domain: 'asc' } },
      hostings: { orderBy: { name: 'asc' } },
      registrarConfigs: true,
      personnelMovements: { orderBy: { date: 'desc' } },
    },
  })
  if (!client) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const isClient = session.user.role === 'CLIENT'
  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'TECH'
  const deleteWithId = deleteClient.bind(null, id)

  const now = Date.now()
  const in30Days = now + 30 * 24 * 60 * 60 * 1000
  const m365AccountsCount = client.m365Tenants.reduce((sum, t) => sum + t.accounts.length, 0)
  const nextcloudServersCount = client.nextcloudServices.reduce((sum, s) => sum + s.servers.length, 0)
  const voipExtensionsCount = client.voipServices.reduce((sum, s) => sum + s.extensions.length, 0)
  const certsExpiringSoon = client.sslCertificates.filter(
    (c) => c.expiryDate && c.expiryDate.getTime() >= now && c.expiryDate.getTime() <= in30Days
  ).length
  const domainsExpiringSoon = client.dnsZones.filter(
    (z) => z.expiryDate && z.expiryDate.getTime() >= now && z.expiryDate.getTime() <= in30Days
  ).length

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
      <ClientStats
        contactsCount={client.contacts.length}
        equipmentCount={client.equipment.length}
        dnsZonesCount={client.dnsZones.length}
        sslCertsCount={client.sslCertificates.length}
        hostingsCount={client.hostings.length}
        certsExpiringSoon={certsExpiringSoon}
        domainsExpiringSoon={domainsExpiringSoon}
        m365TenantsCount={client.m365Tenants.length}
        m365AccountsCount={m365AccountsCount}
        nextcloudServicesCount={client.nextcloudServices.length}
        nextcloudServersCount={nextcloudServersCount}
        voipServicesCount={client.voipServices.length}
        voipExtensionsCount={voipExtensionsCount}
      />
      <ClientDetailTabs
        clientId={id}
        contacts={client.contacts}
        equipment={client.equipment}
        m365Tenants={client.m365Tenants}
        nextcloudServices={client.nextcloudServices}
        voipServices={client.voipServices}
        dnsZones={client.dnsZones}
        sslCerts={client.sslCertificates}
        hostings={client.hostings}
        registrarConfigs={client.registrarConfigs}
        movements={client.personnelMovements}
        canEdit={canEdit}
        isClient={isClient}
        hasRmmLink={!!client.tacticalRmmId}
      />
    </AppLayout>
  )
}
