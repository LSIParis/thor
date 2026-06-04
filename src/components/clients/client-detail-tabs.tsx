'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { ContactList } from '@/components/contacts/contact-list'
import { EquipmentList } from '@/components/equipment/equipment-list'
import { LicenseList } from '@/components/licenses/license-list'
import { M365Panel } from '@/components/m365/m365-panel'
import { NextcloudPanel } from '@/components/nextcloud/nextcloud-panel'
import { VoipPanel } from '@/components/voip/voip-panel'
import type {
  Contact, Equipment, License,
  M365Tenant, M365Domain, M365Account,
  NextcloudService, NextcloudServer,
  VoipService, VoipEquipment, VoipTrunk, VoipExtension,
} from '@prisma/client'

type TenantWithRelations = M365Tenant & { domains: M365Domain[]; accounts: M365Account[] }
type ServiceWithServers = NextcloudService & { servers: NextcloudServer[] }
type VoipServiceWithChildren = VoipService & {
  equipment: VoipEquipment[]; trunks: VoipTrunk[]; extensions: VoipExtension[]
}

interface ClientDetailTabsProps {
  clientId: string
  contacts: Contact[]
  equipment: Equipment[]
  licenses: License[]
  m365Tenants: TenantWithRelations[]
  nextcloudServices: ServiceWithServers[]
  voipServices: VoipServiceWithChildren[]
  canEdit: boolean
}

export function ClientDetailTabs({
  clientId, contacts, equipment, licenses,
  m365Tenants, nextcloudServices, voipServices, canEdit,
}: ClientDetailTabsProps) {
  const t = useTranslations('clients')
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'contacts'

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="contacts">{t('contacts')} ({contacts.length})</TabsTrigger>
        <TabsTrigger value="equipment">{t('equipment')} ({equipment.length})</TabsTrigger>
        <TabsTrigger value="licences">{t('licences')} ({licenses.length})</TabsTrigger>
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
      <TabsContent value="licences" className="mt-4">
        <LicenseList licenses={licenses} clientId={clientId} canEdit={canEdit} />
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
