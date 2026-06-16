'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Pencil } from 'lucide-react'
import type { Client } from '@prisma/client'

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

export function ClientList({ clients, isAdmin = false }: { clients: Client[]; isAdmin?: boolean }) {
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

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(client => (
            <div
              key={client.id}
              className="group relative flex flex-col bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all"
            >
              {/* Zone principale cliquable */}
              <Link
                href={`/dashboard?client=${client.id}`}
                className="flex items-start gap-3 p-4 min-w-0"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(client.name)}`}>
                  {initials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors pr-6">
                    {client.name}
                  </p>
                  {client.phone && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.phone}</p>
                  )}
                  {!client.phone && client.email && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.email}</p>
                  )}
                  <div className="mt-1.5">
                    {client.noSync
                      ? <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pas de synchro</span>
                      : <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Synchro</span>
                    }
                  </div>
                </div>
              </Link>

              {/* Bouton édition (admin uniquement) */}
              {isAdmin && (
                <Link
                  href={`/clients/${client.id}/edit`}
                  onClick={e => e.stopPropagation()}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                  title="Modifier"
                >
                  <Pencil size={13} />
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucun client ne correspond à «&nbsp;{query}&nbsp;»
        </p>
      )}
    </div>
  )
}
