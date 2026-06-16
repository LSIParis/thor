'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncContactsWithZammad } from '@/actions/contacts'

type Result = { pushed: number; imported: number; historical: number; error?: string }

export function SyncZammadContactsButton() {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, start]  = useTransition()

  function handleSync() {
    setResult(null)
    start(async () => {
      const res = await syncContactsWithZammad()
      setResult(res)
    })
  }

  const summary = result && !result.error
    ? [
        result.pushed     > 0 && `↑${result.pushed} → Zammad`,
        result.imported   > 0 && `↓${result.imported} → Thor`,
        result.historical > 0 && `${result.historical} historique${result.historical > 1 ? 's' : ''}`,
        result.pushed === 0 && result.imported === 0 && result.historical === 0 && 'Déjà synchronisé',
      ].filter(Boolean).join(' · ')
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
        Synchronisation Zammad
      </Button>
    </div>
  )
}
