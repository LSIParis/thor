'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface Props {
  clientIds: string[]
}

export function SyncAllRmmButton({ clientIds }: Props) {
  const router = useRouter()
  const [status, setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [summary, setSummary]   = useState('')

  async function handleSync() {
    setStatus('loading')
    setSummary('')
    let created = 0, updated = 0, deleted = 0, unchanged = 0, errors = 0

    for (let i = 0; i < clientIds.length; i++) {
      setProgress(`${i + 1}/${clientIds.length}`)
      try {
        const res  = await fetch(`/api/rmm/agents/${clientIds[i]}`, { method: 'POST' })
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          if (res.ok) {
            created   += data.created   ?? 0
            updated   += data.updated   ?? 0
            deleted   += data.deleted   ?? 0
            unchanged += data.unchanged ?? 0
          } else {
            errors++
          }
        } catch {
          errors++
        }
      } catch {
        errors++
      }
    }

    const parts = [
      created   > 0 ? `+${created} créé${created > 1 ? 's' : ''}`         : null,
      updated   > 0 ? `~${updated} mis à jour`                              : null,
      deleted   > 0 ? `-${deleted} supprimé${deleted > 1 ? 's' : ''}`      : null,
      unchanged > 0 ? `=${unchanged} inchangé${unchanged > 1 ? 's' : ''}` : null,
      errors    > 0 ? `${errors} erreur${errors > 1 ? 's' : ''}`           : null,
    ].filter(Boolean)

    setSummary(parts.length ? parts.join(' · ') : 'Aucun changement')
    setStatus(errors > 0 ? 'error' : 'done')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {summary && (
        <span className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {summary}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        {status === 'loading'
          ? `Synchronisation… (${progress})`
          : 'Synchroniser avec Tactical'}
      </button>
    </div>
  )
}
