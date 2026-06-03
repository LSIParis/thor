'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { Client } from '@prisma/client'

interface ClientWithCounts extends Client {
  _count: { contacts: number; equipment: number; licenses: number }
}

interface ClientListProps {
  clients: ClientWithCounts[]
}

export function ClientList({ clients }: ClientListProps) {
  const t = useTranslations('clients')

  if (clients.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noResults')}</p>
  }

  return (
    <div className="space-y-2">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/clients/${client.id}`}
          className="block p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{client.name}</span>
            <div className="flex gap-2">
              <Badge variant="secondary">{client._count.contacts} contacts</Badge>
              <Badge variant="secondary">{client._count.equipment} équip.</Badge>
              <Badge variant="secondary">{client._count.licenses} lic.</Badge>
            </div>
          </div>
          {client.phone && (
            <p className="text-muted-foreground text-sm mt-1">{client.phone}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
