'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, ChevronDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncVisibleContactsToDesk365 } from '@/actions/contacts'

type ToDelete = { name: string; email: string; company: string }
type Result = { created: number; skipped: number; toDelete: ToDelete[]; error?: string }

export function SyncDesk365ContactsButton() {
  const [result, setResult]  = useState<Result | null>(null)
  const [open, setOpen]      = useState(false)
  const [isPending, start]   = useTransition()

  function handleSync() {
    setResult(null)
    setOpen(false)
    start(async () => {
      try {
        const res = await syncVisibleContactsToDesk365()
        setResult(res)
      } catch (e) {
        setResult({ created: 0, skipped: 0, toDelete: [], error: e instanceof Error ? e.message : 'Erreur serveur' })
      }
    })
  }

  const summary = result && !result.error
    ? result.created > 0
      ? `+${result.created} contact${result.created !== 1 ? 's' : ''} créé${result.created !== 1 ? 's' : ''}`
      : 'Déjà synchronisé'
    : null

  return (
    <div className="flex flex-col items-end gap-1.5">
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

      {result && result.toDelete.length > 0 && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
          >
            <Trash2 size={11} />
            {result.toDelete.length} contact{result.toDelete.length > 1 ? 's' : ''} à supprimer manuellement dans Desk365
            <ChevronDown size={11} className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          </button>

          {open && (
            <div className="mt-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2 text-left max-h-48 overflow-y-auto">
              {result.toDelete.map(c => (
                <div key={c.email} className="py-0.5 text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground"> — {c.email}</span>
                  <span className="text-muted-foreground/70"> ({c.company})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
