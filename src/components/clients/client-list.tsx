'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Contact, Monitor, Key, LayoutGrid, Cloud } from 'lucide-react'
import type { Client } from '@prisma/client'

interface ClientWithCounts extends Client {
  _count: { contacts: number; equipment: number; licenses: number; m365Tenants: number; nextcloudServices: number }
}

interface ClientListProps {
  clients: ClientWithCounts[]
}

function Stat({ icon: Icon, value, title, active = true }: {
  icon: React.ElementType
  value: number
  title: string
  active?: boolean
}) {
  return (
    <div
      title={`${value} ${title}`}
      className={`flex items-center gap-1 text-xs tabular-nums ${
        active && value > 0 ? 'text-foreground' : 'text-muted-foreground/50'
      }`}
    >
      <Icon size={13} className={active && value > 0 ? 'text-primary' : ''} />
      <span>{value}</span>
    </div>
  )
}

export function ClientList({ clients }: ClientListProps) {
  const t = useTranslations('clients')

  if (clients.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noResults')}</p>
  }

  return (
    <div className="space-y-1.5">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/clients/${client.id}`}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
        >
          <span className="font-medium text-sm">{client.name}</span>
          <div className="flex items-center gap-4">
            <Stat icon={Contact}    value={client._count.contacts}          title="contacts" />
            <Stat icon={Monitor}    value={client._count.equipment}         title="équipements" />
            <Stat icon={Key}        value={client._count.licenses}          title="licences" />
            <Stat icon={LayoutGrid} value={client._count.m365Tenants}       title="tenants M365" />
            <Stat icon={Cloud}      value={client._count.nextcloudServices} title="services Nextcloud" />
          </div>
        </Link>
      ))}
    </div>
  )
}
