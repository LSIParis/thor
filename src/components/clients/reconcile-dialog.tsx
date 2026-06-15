'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { loadSyncData, autoReconcile, reconcileClients, createClientInRmm, renameClientInRmm, deleteClientFromRmm } from '@/actions/sync'
import { deleteClient } from '@/actions/clients'
import { X, Link2, Save, CheckCircle2, AlertCircle, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { SyncData } from '@/actions/sync'

interface Props {
  onClose: () => void
}

type LinkMap = Record<string, { rmmId: string | null }>

export function ReconcileDialog({ onClose }: Props) {
  const [data, setData] = useState<SyncData | null>(null)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<LinkMap>({})
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null)
  const [, startTransition] = useTransition()

  async function refreshData() {
    const fresh = await loadSyncData()
    setData(fresh)
    const updated: LinkMap = {}
    fresh.localClients.forEach((c) => {
      updated[c.id] = { rmmId: c.tacticalRmmId }
    })
    setLinks(updated)
  }

  useEffect(() => {
    refreshData().then(() => setLoading(false))
  }, [])

  function setRmm(localId: string, rmmId: string | null) {
    setLinks((prev) => ({ ...prev, [localId]: { rmmId } }))
  }

  async function handleCreateRmm(localClientId: string, name: string) {
    setCreating(`${localClientId}-rmm`)
    setNotice(null)
    const res = await createClientInRmm(localClientId, name)
    if (res.error) {
      setNotice({ ok: false, msg: res.error })
    } else {
      await refreshData()
    }
    setCreating(null)
  }

  async function handleDelete(localClientId: string) {
    setCreating(`${localClientId}-delete`)
    setNotice(null)
    await deleteClient(localClientId)
    setConfirmDelete(null)
    await refreshData()
    setCreating(null)
  }

  async function handleDeleteRmm(localClientId: string, rmmId: string) {
    setCreating(`${localClientId}-rmm-delete`)
    setNotice(null)
    const res = await deleteClientFromRmm(localClientId, rmmId)
    if (res.error) setNotice({ ok: false, msg: res.error })
    setConfirmDelete(null)
    await refreshData()
    setCreating(null)
  }

  async function handleRenameRmm(localClientId: string, rmmId: string, newName: string) {
    setCreating(`${localClientId}-rmm-rename`)
    setNotice(null)
    const res = await renameClientInRmm(localClientId, rmmId, newName)
    if (res.error) {
      setNotice({ ok: false, msg: res.error })
    } else {
      await refreshData()
    }
    setCreating(null)
  }

  async function handleSave() {
    setSaving(true)
    setNotice(null)
    const payload = Object.entries(links).map(([localClientId, v]) => ({
      localClientId,
      rmmId: v.rmmId,
    }))
    await reconcileClients(payload)
    await refreshData()
    setSaving(false)
    setNotice({ ok: true, msg: 'Liens enregistrés.' })
  }

  function handleAutoReconcile() {
    startTransition(async () => {
      setNotice(null)
      const result = await autoReconcile()
      await refreshData()
      setNotice({ ok: true, msg: `${result.linked} lien${result.linked > 1 ? 's' : ''} créé${result.linked > 1 ? 's' : ''}${result.created ? `, ${result.created} client${result.created > 1 ? 's' : ''} ajouté${result.created > 1 ? 's' : ''}` : ''}.` })
    })
  }

  const usedRmmIds = new Set(Object.values(links).map((l) => l.rmmId).filter(Boolean))
  const rmmLinkedCount = Object.values(links).filter((l) => l.rmmId).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Réconciliation des sources</h2>
            <p className="text-xs text-muted-foreground">Associez chaque client local à son équivalent TacticalRMM</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        {data && !loading && (
          <div className="flex gap-6 px-6 py-2 border-b border-border bg-muted/30 text-xs text-muted-foreground shrink-0">
            <span><strong className="text-foreground">{data.localClients.length}</strong> clients locaux</span>
            <span><strong className="text-emerald-600">{rmmLinkedCount}</strong> / {data.rmmClients.length} liés à RMM</span>
            {data.rmmError && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle size={11} /> {data.rmmError}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse text-center py-16">
              Chargement des données…
            </p>
          )}

          {data && !loading && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Client local</th>
                  <th className="px-4 py-2 text-left font-medium">TacticalRMM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.localClients.map((client) => {
                  const link = links[client.id] ?? { rmmId: null }
                  const rmmOk = !!link.rmmId

                  return (
                    <tr key={client.id} className="hover:bg-muted/20 group">
                      <td className="px-4 py-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          {rmmOk
                            ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            : <span className="w-3 shrink-0" />}
                          <span className="flex-1 min-w-0 truncate">{client.name}</span>
                          {confirmDelete === client.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDelete(client.id)}
                                disabled={!!creating}
                                className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40"
                              >
                                {creating === `${client.id}-delete` ? <Loader2 size={10} className="animate-spin" /> : 'Confirmer'}
                              </button>
                              <button type="button" onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title={`Supprimer "${client.name}"`}
                              onClick={() => setConfirmDelete(client.id)}
                              disabled={!!creating}
                              className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* RMM select */}
                      <td className="px-4 py-2">
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={link.rmmId ?? ''}
                            onChange={(e) => setRmm(client.id, e.target.value || null)}
                            className="flex-1 min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
                          >
                            <option value="">— aucun —</option>
                            {data.rmmClients.map((r) => {
                              const takenByOther = usedRmmIds.has(r.id) && link.rmmId !== r.id
                              return (
                                <option key={r.id} value={r.id} disabled={takenByOther}>
                                  {r.name}{takenByOther ? ' (déjà lié)' : ''}
                                </option>
                              )
                            })}
                          </select>
                          {!link.rmmId && !data.rmmError && (
                            <button
                              type="button"
                              title={`Créer "${client.name}" dans TacticalRMM`}
                              onClick={() => handleCreateRmm(client.id, client.name)}
                              disabled={!!creating}
                              className="shrink-0 flex items-center justify-center w-6 h-6 rounded border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40"
                            >
                              {creating === `${client.id}-rmm`
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Plus size={11} />}
                            </button>
                          )}
                          {(() => {
                            if (!link.rmmId) return null
                            const rmmName = data.rmmClients.find((r) => r.id === link.rmmId)?.name
                            const key = `${client.id}-rmm-delete`
                            return (<>
                              {rmmName && rmmName !== client.name && (
                                <button
                                  type="button"
                                  title={`Renommer "${rmmName}" → "${client.name}" dans TacticalRMM`}
                                  onClick={() => handleRenameRmm(client.id, link.rmmId!, client.name)}
                                  disabled={!!creating}
                                  className="shrink-0 flex items-center justify-center w-6 h-6 rounded border border-dashed border-amber-400 text-amber-500 hover:border-amber-600 hover:text-amber-700 disabled:opacity-40"
                                >
                                  {creating === `${client.id}-rmm-rename`
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <Pencil size={11} />}
                                </button>
                              )}
                              {confirmDelete === key ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => handleDeleteRmm(client.id, link.rmmId!)} disabled={!!creating}
                                    className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-40">
                                    {creating === key ? <Loader2 size={10} className="animate-spin" /> : 'Confirmer'}
                                  </button>
                                  <button type="button" onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                                </div>
                              ) : (
                                <button type="button" title="Supprimer de TacticalRMM" onClick={() => setConfirmDelete(key)}
                                  disabled={!!creating}
                                  className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>)
                          })()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleAutoReconcile} disabled={loading || !data}>
              <Link2 size={14} className="mr-1.5" />
              Rapprocher automatiquement
            </Button>
            {notice && (
              <span className={`text-xs ${notice.ok ? 'text-emerald-600' : 'text-destructive'}`}>
                {notice.msg}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading || !data}>
              <Save size={14} className="mr-1.5" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
