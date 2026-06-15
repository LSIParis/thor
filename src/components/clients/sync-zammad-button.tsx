'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { syncClientsToZammad } from '@/actions/clients'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Result = { created: number; updated: number; error?: string }

export function SyncZammadButton() {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, start]  = useTransition()

  function handleSync() {
    setResult(null)
    start(async () => {
      const res = await syncClientsToZammad()
      setResult(res)
    })
  }

  return (
    <div className="flex items-center gap-3">
      {result && !result.error && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          {result.created > 0 && `${result.created} créée${result.created !== 1 ? 's' : ''}`}
          {result.created > 0 && result.updated > 0 && ', '}
          {result.updated > 0 && `${result.updated} déjà présente${result.updated !== 1 ? 's' : ''}`}
          {result.created === 0 && result.updated === 0 && 'Aucune modification'}
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
        Synchro Zammad
      </Button>
    </div>
  )
}
