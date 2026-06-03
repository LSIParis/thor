'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function ImportPanel() {
  const t = useTranslations('admin')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ created: number; updated: number; unchanged: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleImport() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch('/api/rmm/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Unknown error')
        setStatus('error')
        return
      }
      setResult(data)
      setStatus('done')
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <Button onClick={handleImport} disabled={status === 'loading'}>
        {status === 'loading' ? t('importing') : t('importClients')}
      </Button>
      {status === 'done' && result && (
        <div className="p-4 rounded-lg bg-card border border-primary/30 text-sm">
          <span className="text-primary font-medium">{result.created}</span> créés ·{' '}
          <span className="text-primary font-medium">{result.updated}</span> mis à jour ·{' '}
          <span className="text-muted-foreground">{result.unchanged}</span> inchangés
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
