import { notFound } from 'next/navigation'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { ClientHeader } from '@/components/clients/client-header'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()

  const accessible = await canAccessClient(session.user.id, session.user.role, id)
  if (!accessible) notFound()

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contacts: true,
      equipment: { include: { assignedTo: true } },
      dnsZones: { include: { records: true } },
      sslCertificates: true,
      hostings: true,
      nextcloudServices: { include: { servers: true } },
      voipServices: {
        include: { equipment: true, trunks: true, extensions: true },
      },
      personnelMovements: true,
    },
  })
  if (!client) notFound()

  const isAdmin = session.user.role === 'ADMIN'
  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'TECH'
  const hasRmmLink = client.tacticalRmmId !== null

  const dnsTotal = client.dnsZones.length + client.sslCertificates.length + client.hostings.length

  const headerClient = {
    id:            client.id,
    name:          client.name,
    phone:         client.phone,
    email:         client.email,
    address:       client.address,
    hasM365:       client.hasM365,
    cometUsername: client.cometUsername,
    noSync:        client.noSync,
    _counts: {
      contacts:  client.contacts.length,
      equipment: client.equipment.length,
      dnsTotal,
      nextcloud: client.nextcloudServices.length,
      voip:      client.voipServices.length,
      movements: client.personnelMovements.length,
    },
  }

  return (
    <>
      <ClientHeader client={headerClient} isAdmin={isAdmin} />
      <ClientDetailTabs
        clientId={id}
        contacts={client.contacts}
        equipment={client.equipment}
        nextcloudServices={client.nextcloudServices}
        voipServices={client.voipServices}
        dnsZones={client.dnsZones}
        sslCerts={client.sslCertificates}
        hostings={client.hostings}
        movements={client.personnelMovements}
        canEdit={canEdit}
        hasRmmLink={hasRmmLink}
      />
    </>
  )
}
