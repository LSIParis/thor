'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Props {
  clientId: string
}

export function RmmAgentsImportButton({ clientId }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')

  async function handleImport() {
    setStatus('loading')
    setSummary('')
    try {
      const res = await fetch(`/api/rmm/agents/${clientId}`, { method: 'POST' })
      let data: any
      const text = await res.text()
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
      setSummary(`+${data.created} · ~${data.updated} · =${data.unchanged} (${data.total} agents)`)
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
        {status === 'loading' ? 'Import RMM…' : 'Importer depuis RMM'}
      </Button>
    </div>
  )
}
