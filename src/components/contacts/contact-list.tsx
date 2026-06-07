'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteContact, importContactsFromDesk365 } from '@/actions/contacts'
import { Pencil, Download } from 'lucide-react'
import type { Contact } from '@prisma/client'

interface ContactListProps {
  contacts: Contact[]
  clientId: string
  canEdit: boolean
}

export function ContactList({ contacts, clientId, canEdit }: ContactListProps) {
  const t = useTranslations('contacts')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; error?: string } | null>(null)

  async function handleImport() {
    setImporting(true)
    setImportResult(null)
    const result = await importContactsFromDesk365(clientId)
    setImportResult(result ?? null)
    setImporting(false)
  }

  return (
    <div className="space-y-2">
      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/clients/${clientId}/contacts/new`}>{t('new')}</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImport}
            disabled={importing}
          >
            <Download size={14} className="mr-1.5" />
            {importing ? 'Import en cours…' : 'Importer depuis Desk365'}
          </Button>
          {importResult && (
            <span className={`text-xs ${importResult.error ? 'text-destructive' : 'text-emerald-600'}`}>
              {importResult.error
                ? importResult.error
                : `${importResult.created} créé${importResult.created !== 1 ? 's' : ''}, ${importResult.updated} mis à jour`}
            </span>
          )}
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
                {contact.email}{contact.phone && ` · ${contact.phone}`}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link href={`/clients/${clientId}/contacts/${contact.id}/edit`}>
                    <Pencil size={14} />
                  </Link>
                </Button>
                <form action={deleteWithIds}>
                  <Button variant="ghost" size="sm" type="submit" className="text-destructive">
                    {t('delete')}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
