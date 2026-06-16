'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { importSitesFromRmm } from '@/actions/sites'

type Result = { created: number; skipped: number; error?: string }

export function ImportRmmSitesButton({ clientId }: { clientId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<Result | null>(null)

  async function handleClick() {
    setState('loading')
    setResult(null)
    const res = await importSitesFromRmm(clientId)
    setResult(res)
    setState('done')
    setTimeout(() => setState('idle'), 5000)
  }

  if (state === 'done' && result) {
    if (result.error) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertCircle size={13} /> {result.error}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">
        <CheckCircle size={13} /> {result.created} créé{result.created !== 1 ? 's' : ''}, {result.skipped} existant{result.skipped !== 1 ? 's' : ''}
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {state === 'loading'
        ? <Loader2 size={13} className="animate-spin" />
        : <Download size={13} />
      }
      Importer depuis RMM
    </button>
  )
}
