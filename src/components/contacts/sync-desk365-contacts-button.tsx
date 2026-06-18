'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncVisibleContactsToDesk365 } from '@/actions/contacts'

type Result = { created: number; skipped: number; error?: string }

export function SyncDesk365ContactsButton() {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, start]  = useTransition()

  function handleSync() {
    setResult(null)
    start(async () => {
      try {
        const res = await syncVisibleContactsToDesk365()
        setResult(res)
      } catch (e) {
        setResult({ created: 0, skipped: 0, error: e instanceof Error ? e.message : 'Erreur serveur' })
      }
    })
  }

  const summary = result && !result.error
    ? result.created > 0
      ? `+${result.created} contact${result.created !== 1 ? 's' : ''} créé${result.created !== 1 ? 's' : ''}`
      : 'Déjà synchronisé'
    : null

  return (
    <div className="flex items-center gap-3">
      {summary && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          {summary}
        </span>
      )}
      {result?.error && (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle size={13} />
          {result.error}
        </span>
      )}
      <Button size="sm" variant="outline" onClick={handleSync} disabled={isPending}>
        {isPending
          ? <Loader2 size={14} className="mr-1.5 animate-spin" />
          : <RefreshCw size={14} className="mr-1.5" />}
        Synchro Desk365
      </Button>
    </div>
  )
}
