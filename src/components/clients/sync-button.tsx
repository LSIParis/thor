'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { importContactsFromDesk365 } from '@/actions/contacts'
import { RefreshCw } from 'lucide-react'

interface Props {
  clientId: string
}

export function SyncButton({ clientId }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    const r = await importContactsFromDesk365(clientId)
    if (r?.error) {
      setResult(`⚠ ${r.error}`)
    } else if (r) {
      setResult(`✓ ${r.created} créé${r.created !== 1 ? 's' : ''}, ${r.updated} mis à jour`)
    }
    setLoading(false)
    setTimeout(() => setResult(null), 5000)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleSync} disabled={loading}>
        <RefreshCw size={15} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Synchronisation…' : 'Synchroniser'}
      </Button>
      {result && (
        <span className={`text-xs ${result.startsWith('⚠') ? 'text-destructive' : 'text-emerald-600'}`}>
          {result}
        </span>
      )}
    </div>
  )
}
