'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Contact, Monitor, Globe, Cloud, Phone, Search } from 'lucide-react'
import type { Client } from '@prisma/client'

interface ClientWithCounts extends Client {
  _count: {
    contacts: number
    equipment: number
    dnsZones: number
    nextcloudServices: number
    voipServices: number
  }
}

const PALETTE = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]

function avatarColor(name: string) {
  const n = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[n % PALETTE.length]
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  if (value === 0) return null
  return (
    <span title={`${value} ${label}`} className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon size={11} />
      <span className="tabular-nums">{value}</span>
    </span>
  )
}

export function ClientList({ clients }: { clients: ClientWithCounts[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase().trim()))
    : clients

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-sm">Aucun client</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un client…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {/* Card grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(client => {
            const totalItems =
              client._count.contacts +
              client._count.equipment +
              client._count.dnsZones +
              client._count.nextcloudServices +
              client._count.voipServices

            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="group flex flex-col bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                {/* Avatar + identity */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(client.name)}`}>
                    {initials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">
                      {client.name}
                    </p>
                    {client.phone && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.phone}</p>
                    )}
                    {!client.phone && client.email && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.email}</p>
                    )}
                  </div>
                </div>

                {/* Stats footer */}
                {totalItems > 0 && (
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border flex-wrap">
                    <StatPill icon={Contact} value={client._count.contacts}          label="contacts" />
                    <StatPill icon={Monitor} value={client._count.equipment}         label="équipements" />
                    <StatPill icon={Globe}   value={client._count.dnsZones}          label="zones DNS" />
                    <StatPill icon={Cloud}   value={client._count.nextcloudServices} label="Nextcloud" />
                    <StatPill icon={Phone}   value={client._count.voipServices}      label="VoIP" />
                  </div>
                )}
                {totalItems === 0 && (
                  <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground/50">Aucune donnée</p>
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucun client ne correspond à «&nbsp;{query}&nbsp;»
        </p>
      )}
    </div>
  )
}
