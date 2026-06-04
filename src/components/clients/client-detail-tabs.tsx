'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { ContactList } from '@/components/contacts/contact-list'
import { EquipmentList } from '@/components/equipment/equipment-list'
import { M365Panel } from '@/components/m365/m365-panel'
import { NextcloudPanel } from '@/components/nextcloud/nextcloud-panel'
import { VoipPanel } from '@/components/voip/voip-panel'
import { DnsPanel } from '@/components/dns/dns-panel'
import type {
  Contact, Equipment,
  M365Tenant, M365Domain, M365Account,
  NextcloudService, NextcloudServer,
  VoipService, VoipEquipment, VoipTrunk, VoipExtension,
  DnsZone, DnsRecord, SslCertificate, Hosting,
} from '@prisma/client'

type TenantWithRelations = M365Tenant & { domains: M365Domain[]; accounts: M365Account[] }
type ServiceWithServers = NextcloudService & { servers: NextcloudServer[] }
type VoipServiceWithChildren = VoipService & {
  equipment: VoipEquipment[]; trunks: VoipTrunk[]; extensions: VoipExtension[]
}
type EquipmentWithContact = Equipment & { assignedTo: Contact | null }
type ZoneWithRecords = DnsZone & { records: DnsRecord[] }

interface ClientDetailTabsProps {
  clientId: string
  contacts: Contact[]
  equipment: EquipmentWithContact[]
  m365Tenants: TenantWithRelations[]
  nextcloudServices: ServiceWithServers[]
  voipServices: VoipServiceWithChildren[]
  dnsZones: ZoneWithRecords[]
  sslCerts: SslCertificate[]
  hostings: Hosting[]
  canEdit: boolean
}

export function ClientDetailTabs({
  clientId, contacts, equipment,
  m365Tenants, nextcloudServices, voipServices,
  dnsZones, sslCerts, hostings,
  canEdit,
}: ClientDetailTabsProps) {
  const t = useTranslations('clients')
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'contacts'

  const dnsTotal = dnsZones.length + sslCerts.length + hostings.length

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="contacts">{t('contacts')} ({contacts.length})</TabsTrigger>
        <TabsTrigger value="equipment">{t('equipment')} ({equipment.length})</TabsTrigger>
        <TabsTrigger value="dns">DNS, Certifs & Hébergement ({dnsTotal})</TabsTrigger>
        <TabsTrigger value="m365">Microsoft 365 ({m365Tenants.length})</TabsTrigger>
        <TabsTrigger value="nextcloud">Nextcloud ({nextcloudServices.length})</TabsTrigger>
        <TabsTrigger value="voip">VoIP ({voipServices.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="contacts" className="mt-4">
        <ContactList contacts={contacts} clientId={clientId} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="equipment" className="mt-4">
        <EquipmentList equipment={equipment} clientId={clientId} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="dns" className="mt-4">
        <DnsPanel
          clientId={clientId}
          zones={dnsZones}
          certs={sslCerts}
          hostings={hostings}
          canEdit={canEdit}
        />
      </TabsContent>
      <TabsContent value="m365" className="mt-4">
        <M365Panel clientId={clientId} tenants={m365Tenants} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="nextcloud" className="mt-4">
        <NextcloudPanel clientId={clientId} services={nextcloudServices} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="voip" className="mt-4">
        <VoipPanel clientId={clientId} services={voipServices} canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  )
}
