'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncM365TenantAccounts } from '@/actions/m365'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export function SyncTenantButton({ tenantDbId }: { tenantDbId: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [msg, setMsg]       = useState('')
  const [isPending, start]  = useTransition()
  const router              = useRouter()

  function handleSync() {
    setStatus('idle')
    setMsg('')
    start(async () => {
      try {
        const { synced } = await syncM365TenantAccounts(tenantDbId)
        setMsg(`${synced} compte${synced !== 1 ? 's' : ''} synchronisé${synced !== 1 ? 's' : ''}`)
        setStatus('ok')
        router.refresh()
        setTimeout(() => setStatus('idle'), 4000)
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Erreur inconnue')
        setStatus('err')
      }
    })
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Synchroniser les comptes depuis Microsoft Graph"
      >
        <RefreshCw size={12} className={isPending ? 'animate-spin' : ''} />
        {isPending ? 'Sync…' : 'Synchroniser'}
      </button>

      {status === 'ok' && (
        <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
          <CheckCircle2 size={11} /> {msg}
        </span>
      )}
      {status === 'err' && (
        <span className="inline-flex items-center gap-1 text-xs text-destructive max-w-xs">
          <AlertCircle size={11} className="shrink-0" /> {msg}
        </span>
      )}
    </div>
  )
}
