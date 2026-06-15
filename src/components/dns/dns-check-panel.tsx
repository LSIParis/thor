'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckResultCard } from './check-result-card'
import { RefreshCw, Search } from 'lucide-react'
import type { CheckPayload } from '@/lib/dns/types'

export function DnsCheckPanel({ initialDomain }: { initialDomain?: string }) {
  const [domain, setDomain]           = useState(initialDomain ?? '')
  const [dkimSelector, setDkimSelector] = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<CheckPayload | null>(null)
  const [showDkimInput, setShowDkimInput] = useState(false)
  const [error, setError]             = useState('')

  async function runCheck(d: string, selectors?: string[]) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dns/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, dkimSelectors: selectors }),
      })
      if (!res.ok) {
        setError('Erreur lors de la vérification. Vérifiez le nom de domaine.')
        setLoading(false)
        return null
      }
      const data = await res.json() as CheckPayload
      setLoading(false)
      return data
    } catch {
      setError('Erreur réseau.')
      setLoading(false)
      return null
    }
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setShowDkimInput(false)
    setDkimSelector('')
    const data = await runCheck(domain)
    if (!data) return
    setResult(data)
    if (!data.dkim.anyFound) setShowDkimInput(true)
  }

  async function handleDkimManual(e: React.FormEvent) {
    e.preventDefault()
    if (!dkimSelector || !result) return
    const data = await runCheck(domain, [dkimSelector])
    if (!data) return
    setResult(data)
    setShowDkimInput(!data.dkim.anyFound)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCheck} className="flex gap-2">
        <Input
          type="text"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="exemple.com"
          required
          className="flex-1 font-mono text-sm"
        />
        <Button type="submit" disabled={loading}>
          {loading
            ? <><RefreshCw size={14} className="mr-1.5 animate-spin" />Vérification…</>
            : <><Search size={14} className="mr-1.5" />Vérifier</>}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-4">
          <CheckResultCard payload={result} />

          {showDkimInput && (
            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                Aucun sélecteur DKIM standard trouvé. Saisissez le sélecteur configuré chez votre fournisseur.
              </p>
              <form onSubmit={handleDkimManual} className="flex gap-2">
                <Input
                  type="text"
                  value={dkimSelector}
                  onChange={e => setDkimSelector(e.target.value)}
                  placeholder="ex: mail, s1, k1…"
                  required
                  className="flex-1 font-mono text-sm"
                />
                <Button type="submit" variant="outline" disabled={loading}>
                  Tester
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Lightweight button used per-row in the zone table
export function ZoneCheckButton({ domain }: { domain: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckPayload | null>(null)
  const [error, setError] = useState('')

  async function handleCheck() {
    if (open) { setOpen(false); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dns/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); setLoading(false); return }
      setResult(data)
      setOpen(true)
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCheck} disabled={loading}>
        <RefreshCw size={11} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
        {loading ? '…' : open ? 'Masquer' : 'Vérifier'}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {open && result && (
        <div className="mt-3 p-4 border border-border rounded-lg bg-card">
          <CheckResultCard payload={result} />
        </div>
      )}
    </div>
  )
}
