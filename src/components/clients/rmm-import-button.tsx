'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function RmmImportButton() {
  const t = useTranslations('clients')
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function handleImport() {
    setStatus('loading')
    setSummary('')
    try {
      const res = await fetch('/api/rmm/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSummary(data.error ?? 'Erreur RMM')
        setStatus('error')
        return
      }
      setSummary(`+${data.created} · ~${data.updated} · =${data.unchanged}`)
      setStatus('done')
      router.refresh()
    } catch {
      setSummary('Erreur réseau')
      setStatus('error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {summary && (
        <span className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-primary'}`}>
          {summary}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleImport}
        disabled={status === 'loading'}
      >
        <Download size={14} className="mr-1.5" />
        {status === 'loading' ? t('rmmImporting') : t('rmmImport')}
      </Button>
    </div>
  )
}
