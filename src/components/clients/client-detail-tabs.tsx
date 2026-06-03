'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { ContactList } from '@/components/contacts/contact-list'
import { EquipmentList } from '@/components/equipment/equipment-list'
import { LicenseList } from '@/components/licenses/license-list'
import type { Contact, Equipment, License } from '@prisma/client'

interface ClientDetailTabsProps {
  clientId: string
  contacts: Contact[]
  equipment: Equipment[]
  licenses: License[]
  canEdit: boolean
}

export function ClientDetailTabs({
  clientId, contacts, equipment, licenses, canEdit,
}: ClientDetailTabsProps) {
  const t = useTranslations('clients')

  return (
    <Tabs defaultValue="contacts">
      <TabsList>
        <TabsTrigger value="contacts">
          {t('contacts')} ({contacts.length})
        </TabsTrigger>
        <TabsTrigger value="equipment">
          {t('equipment')} ({equipment.length})
        </TabsTrigger>
        <TabsTrigger value="licences">
          {t('licences')} ({licenses.length})
        </TabsTrigger>
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
    </Tabs>
  )
}
