'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface Props {
  clientId: string
}

export function RmmAgentsImportButton({ clientId }: Props) {
  const router = useRouter()
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function handleSync() {
    setStatus('loading')
    setSummary('')
    try {
      const res  = await fetch(`/api/rmm/agents/${clientId}`, { method: 'POST' })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        setSummary(`Réponse invalide (${res.status}): ${text.slice(0, 120)}`)
        setStatus('error')
        return
      }
      if (!res.ok) {
        setSummary(data.error ?? `Erreur ${res.status}`)
        setStatus('error')
        return
      }
      const parts = [
        data.created   > 0 ? `+${data.created} créé${data.created > 1 ? 's' : ''}`     : null,
        data.updated   > 0 ? `~${data.updated} mis à jour`                               : null,
        data.deleted   > 0 ? `-${data.deleted} supprimé${data.deleted > 1 ? 's' : ''}`  : null,
        data.unchanged > 0 ? `=${data.unchanged} inchangé${data.unchanged > 1 ? 's' : ''}` : null,
      ].filter(Boolean)
      setSummary(parts.length ? parts.join(' · ') : `${data.total} agent${data.total !== 1 ? 's' : ''} — aucun changement`)
      setStatus('done')
      router.refresh()
    } catch (err: any) {
      setSummary(`Erreur réseau : ${err?.message ?? err}`)
      setStatus('error')
    }
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
        {status === 'loading' ? 'Synchronisation…' : 'Synchroniser depuis RMM'}
      </button>
    </div>
  )
}
