'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createContactFromPage } from '@/actions/contacts'
import { Plus, X, Loader2, Check } from 'lucide-react'

interface Client { id: string; name: string }
interface Site   { id: string; clientId: string; name: string }

export function AddContactDialog({
  clients,
  sites,
  selectedClientId,
}: {
  clients: Client[]
  sites: Site[]
  selectedClientId?: string
}) {
  const [open, setOpen]           = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [clientSel, setClientSel] = useState(selectedClientId ?? '')
  const [isPending, start]        = useTransition()
  const router                    = useRouter()

  const filteredSites = sites.filter(s => s.clientId === clientSel)

  function handleOpen() {
    setOpen(true); setDone(false); setError(null)
    setClientSel(selectedClientId ?? '')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    start(async () => {
      try {
        await createContactFromPage(fd)
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
        Ajouter un contact
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Nouveau contact</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Client */}
                {!selectedClientId && (
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Client *</label>
                    <select name="clientId" required value={clientSel}
                      onChange={e => setClientSel(e.target.value)}
                      className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background">
                      <option value="">— Sélectionner —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {selectedClientId && (
                  <input type="hidden" name="clientId" value={selectedClientId} />
                )}

                {/* Nom / Prénom */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Nom *</label>
                  <input name="lastName" required placeholder="Dupont"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Prénom *</label>
                  <input name="firstName" required placeholder="Jean"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>

                {/* Téléphone / Email */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Téléphone</label>
                  <input name="phone" type="tel" placeholder="+33 6 12 34 56 78"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email</label>
                  <input name="email" type="email" placeholder="jean@exemple.fr"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>

                {/* Fonction */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Fonction</label>
                  <input name="role" placeholder="Directeur, Comptable…"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>

                {/* Site */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Site</label>
                  <select name="siteId"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                    disabled={!clientSel}>
                    <option value="">— Sans site —</option>
                    {filteredSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                  <textarea name="notes" rows={2}
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-none" />
                </div>

                {/* Pas de synchronisation */}
                <div className="col-span-2 flex items-center gap-2">
                  <input id="noSyncContact" type="checkbox" name="noSync" value="true"
                    className="rounded border-input" />
                  <label htmlFor="noSyncContact" className="text-xs text-muted-foreground cursor-pointer">
                    Pas de synchronisation
                  </label>
                </div>

                {/* Visible */}
                <div className="col-span-2 flex items-center gap-2">
                  <input id="visibleContact" type="checkbox" name="visible" value="true"
                    defaultChecked className="rounded border-input" />
                  <label htmlFor="visibleContact" className="text-xs text-muted-foreground cursor-pointer">
                    Visible
                  </label>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" size="sm" disabled={isPending || done}>
                  {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" />
                    : done    ? <Check   size={14} className="mr-1.5 text-emerald-500" />
                    : null}
                  {done ? 'Enregistré' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
