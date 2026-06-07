'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { loadSyncData, autoReconcile } from '@/actions/sync'
import { X, Link2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import type { SyncData } from '@/actions/sync'

interface Props {
  onClose: () => void
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function ReconcileDialog({ onClose }: Props) {
  const [data, setData] = useState<SyncData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<{ linked: number; created: number } | null>(null)
  const [, startTransition] = useTransition()

  if (!data && !loading) {
    setLoading(true)
    loadSyncData().then((d) => { setData(d); setLoading(false) })
  }

  function handleReconcile() {
    startTransition(async () => {
      const result = await autoReconcile()
      setReconcileResult(result)
      const fresh = await loadSyncData()
      setData(fresh)
    })
  }

  const rmmLinked = new Set(data?.localClients.map((c) => c.tacticalRmmId).filter(Boolean))
  const desk365Linked = new Set(data?.localClients.map((c) => c.desk365Company).filter(Boolean))

  const rmmUnlinked = data?.rmmClients.filter((c) => !rmmLinked.has(c.id)) ?? []
  const desk365Unlinked = data?.desk365Companies.filter((c) => !desk365Linked.has(c.name)) ?? []

  // Auto-match preview: RMM ↔ Desk365 by normalized name
  const autoMatches: { rmmName: string; desk365Name: string }[] = []
  if (data) {
    for (const rmm of rmmUnlinked) {
      const match = desk365Unlinked.find((d) => normalize(d.name) === normalize(rmm.name))
      if (match) autoMatches.push({ rmmName: rmm.name, desk365Name: match.name })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Réconciliation des sources</h2>
            <p className="text-xs text-muted-foreground">TacticalRMM · Desk365 · Base locale</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-12">
              Chargement des données…
            </p>
          )}

          {data && !loading && (
            <>
              {data.rmmError && (
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-4 p-3 rounded bg-amber-500/10">
                  <AlertCircle size={14} />
                  {data.rmmError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* TacticalRMM */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    TacticalRMM ({data.rmmClients.length})
                  </h3>
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                    {data.rmmClients.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun client RMM</p>
                    )}
                    {data.rmmClients.map((c) => {
                      const isLinked = rmmLinked.has(c.id)
                      const local = data.localClients.find((l) => l.tacticalRmmId === c.id)
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-sm py-0.5">
                          {isLinked
                            ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            : <Circle size={13} className="text-muted-foreground shrink-0" />}
                          <span className={isLinked ? '' : 'text-muted-foreground'}>{c.name}</span>
                          {local && (
                            <span className="text-xs text-muted-foreground">→ {local.name}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Desk365 */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Desk365 ({data.desk365Companies.length})
                  </h3>
                  <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                    {data.desk365Companies.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucune société Desk365</p>
                    )}
                    {data.desk365Companies.map((c) => {
                      const isLinked = desk365Linked.has(c.name)
                      const local = data.localClients.find((l) => l.desk365Company === c.name)
                      return (
                        <div key={c.name} className="flex items-center gap-2 text-sm py-0.5">
                          {isLinked
                            ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            : <Circle size={13} className="text-muted-foreground shrink-0" />}
                          <span className={isLinked ? '' : 'text-muted-foreground'}>{c.name}</span>
                          {local && (
                            <span className="text-xs text-muted-foreground">→ {local.name}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-lg">{data.localClients.length}</div>
                  <div className="text-xs text-muted-foreground">Clients locaux</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-emerald-600">{rmmLinked.size}</div>
                  <div className="text-xs text-muted-foreground">Liés à RMM</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-blue-600">{desk365Linked.size}</div>
                  <div className="text-xs text-muted-foreground">Liés à Desk365</div>
                </div>
              </div>

              {(rmmUnlinked.length > 0 || desk365Unlinked.length > 0) && (
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  {rmmUnlinked.length} RMM non liés · {desk365Unlinked.length} Desk365 non liés
                  {autoMatches.length > 0 && ` · ${autoMatches.length} correspondance${autoMatches.length > 1 ? 's' : ''} automatique${autoMatches.length > 1 ? 's' : ''} détectée${autoMatches.length > 1 ? 's' : ''}`}
                </div>
              )}

              {reconcileResult && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 size={14} />
                  {reconcileResult.linked} lien{reconcileResult.linked > 1 ? 's' : ''} créé{reconcileResult.linked > 1 ? 's' : ''}
                  {reconcileResult.created > 0 && `, ${reconcileResult.created} client${reconcileResult.created > 1 ? 's' : ''} ajouté${reconcileResult.created > 1 ? 's' : ''}`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleReconcile} disabled={loading || !data}>
            <Link2 size={14} className="mr-1.5" />
            Rapprocher automatiquement
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  )
}
