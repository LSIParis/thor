'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createDnsZoneFromPage } from '@/actions/dns'
import { Plus, X, Loader2, Check } from 'lucide-react'

interface Client { id: string; name: string }
interface Registrar { id: string; clientId: string; name: string }

export function AddDnsZoneDialog({
  clients,
  registrars,
  selectedClient,
}: {
  clients: Client[]
  registrars: Registrar[]
  selectedClient?: Client | null
}) {
  const [open, setOpen]           = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [clientSel, setClientSel] = useState(selectedClient?.id ?? '')
  const [isPending, start]        = useTransition()
  const router                    = useRouter()

  const filteredRegistrars = registrars.filter(r => r.clientId === clientSel)

  function handleOpen() {
    setOpen(true); setDone(false); setError(null)
    setClientSel(selectedClient?.id ?? '')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    start(async () => {
      try {
        await createDnsZoneFromPage(formData)
        setDone(true)
        router.refresh()
        setTimeout(() => { setOpen(false); setDone(false) }, 1200)
      } catch {
        setError('Une erreur est survenue.')
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <Plus size={14} className="mr-1.5" />
        Ajouter un DNS
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nouvelle zone DNS</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center text-emerald-600 font-medium flex items-center justify-center gap-2">
                <Check size={16} /> Zone DNS créée
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* Client */}
                {selectedClient ? (
                  <div className="text-sm text-muted-foreground">
                    Client : <span className="font-medium text-foreground">{selectedClient.name}</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Client <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={clientSel}
                      onChange={e => setClientSel(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Registrar */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Registrar <span className="text-destructive">*</span>
                  </label>
                  {filteredRegistrars.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {clientSel
                        ? 'Aucun registrar pour ce client — créez-en un depuis la page DNS.'
                        : 'Sélectionnez d\'abord un client.'}
                    </p>
                  ) : (
                    <select
                      name="registrarId"
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      {filteredRegistrars.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Domaine */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Domaine <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="domain"
                    required
                    placeholder="ex. example.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date d'expiration
                    <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                  </label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input id="autoRenew" name="autoRenew" type="checkbox" className="rounded border-input" />
                  <label htmlFor="autoRenew" className="text-sm">Renouvellement automatique</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                    <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" size="sm" disabled={isPending || filteredRegistrars.length === 0}>
                    {isPending
                      ? <><Loader2 size={14} className="animate-spin mr-1.5" />Création…</>
                      : <><Plus size={14} className="mr-1.5" />Créer</>
                    }
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
