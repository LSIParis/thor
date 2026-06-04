'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, RefreshCw, HardDrive } from 'lucide-react'
import type { NextcloudUser } from '@/app/api/nextcloud/[serverId]/users/route'

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let val = bytes
  let i = 0
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
  return `${val.toFixed(1)} ${units[i]}`
}

interface NextcloudUsersProps {
  serverId: string
  hasCredentials: boolean
}

export function NextcloudUsers({ serverId, hasCredentials }: NextcloudUsersProps) {
  const [users, setUsers] = useState<NextcloudUser[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function load() {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`/api/nextcloud/${serverId}/users`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue')
        setStatus('error')
        return
      }
      setUsers(data.users)
      setStatus('done')
    } catch {
      setError('Erreur réseau')
      setStatus('error')
    }
  }

  if (!hasCredentials) {
    return (
      <p className="text-xs text-muted-foreground italic mt-2">
        Renseigner l'utilisateur et le mot de passe admin pour charger les utilisateurs.
      </p>
    )
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Users size={12} /> Utilisateurs Nextcloud
          {status === 'done' && <span className="text-primary">({users.length})</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={load}
          disabled={status === 'loading'}
        >
          <RefreshCw size={12} className={`mr-1 ${status === 'loading' ? 'animate-spin' : ''}`} />
          {status === 'idle' ? 'Charger' : status === 'loading' ? 'Chargement...' : 'Actualiser'}
        </Button>
      </div>

      {status === 'error' && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {status === 'done' && users.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucun utilisateur trouvé</p>
      )}

      {status === 'done' && users.length > 0 && (
        <table className="w-full text-xs mt-1">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Utilisateur</th>
              <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Email</th>
              <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Quota utilisé</th>
              <th className="text-left text-muted-foreground font-medium py-1.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/40 last:border-0">
                <td className="py-1.5 pr-3">
                  <div className="font-medium">{u.displayName}</div>
                  <div className="text-muted-foreground font-mono">{u.id !== u.displayName ? u.id : ''}</div>
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground">{u.email || '—'}</td>
                <td className="py-1.5 pr-3">
                  {u.quota ? (
                    <span className="flex items-center gap-1">
                      <HardDrive size={11} />
                      {formatBytes(u.quota.used)}
                      {u.quota.total > 0 && (
                        <span className="text-muted-foreground">/ {formatBytes(u.quota.total)}</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-1.5">
                  {u.enabled
                    ? <Badge variant="default" className="text-[10px] h-4 px-1.5">Actif</Badge>
                    : <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Désactivé</Badge>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
