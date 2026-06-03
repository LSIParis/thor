'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteContact } from '@/actions/contacts'
import type { Contact } from '@prisma/client'

interface ContactListProps {
  contacts: Contact[]
  clientId: string
  canEdit: boolean
}

export function ContactList({ contacts, clientId, canEdit }: ContactListProps) {
  const t = useTranslations('contacts')

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/contacts/new`}>{t('new')}</Link>
          </Button>
        </div>
      )}
      {contacts.length === 0 && (
        <p className="text-muted-foreground text-sm">—</p>
      )}
      {contacts.map((contact) => {
        const deleteWithIds = deleteContact.bind(null, contact.id, clientId)
        return (
          <div key={contact.id} className="p-3 rounded bg-secondary flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">
                {contact.firstName} {contact.lastName}
              </div>
              {contact.role && (
                <div className="text-muted-foreground text-xs">{contact.role}</div>
              )}
              <div className="text-muted-foreground text-xs">
                {contact.email} {contact.phone && `· ${contact.phone}`}
              </div>
            </div>
            {canEdit && (
              <form action={deleteWithIds}>
                <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                  {t('delete')}
                </Button>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}
