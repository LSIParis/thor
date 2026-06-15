'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { syncContactsFromM365 } from '@/actions/contacts'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Result = { created: number; updated: number; skipped: number; error?: string }

export function SyncM365Button({ clientId }: { clientId: string }) {
  const [result, setResult]    = useState<Result | null>(null)
  const [isPending, start]     = useTransition()
  const router                 = useRouter()

  function handleSync() {
    setResult(null)
    start(async () => {
      const res = await syncContactsFromM365(clientId)
      setResult(res)
      if (!res.error) router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      {result && !result.error && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          {result.created} créé{result.created !== 1 ? 's' : ''}
          {result.updated > 0 && `, ${result.updated} mis à jour`}
          {result.skipped > 0 && `, ${result.skipped} ignoré${result.skipped !== 1 ? 's' : ''}`}
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
        Synchroniser M365
      </Button>
    </div>
  )
}
