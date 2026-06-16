'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createSite } from '@/actions/sites'
import { Plus, X, Loader2, Check } from 'lucide-react'

interface Client { id: string; name: string }

export function AddSiteDialog({
  clients,
  selectedClientId,
}: {
  clients: Client[]
  selectedClientId?: string
}) {
  const [open, setOpen]         = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [clientSel, setClientSel] = useState(selectedClientId ?? '')
  const [isPending, start]      = useTransition()
  const router                  = useRouter()

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
        await createSite(fd)
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
        Ajouter un site
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Nouveau site</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* Client */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Client *</label>
                  <select
                    name="clientId"
                    required
                    value={clientSel}
                    onChange={e => setClientSel(e.target.value)}
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  >
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Nom du site */}
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Nom du site *</label>
                  <input
                    name="name"
                    required
                    placeholder="Siège social, Entrepôt Nord…"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>

                {/* Adresse */}
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Adresse</label>
                  <input
                    name="address"
                    placeholder="12 rue de la Paix"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Code postal</label>
                  <input
                    name="postalCode"
                    placeholder="75001"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Ville</label>
                  <input
                    name="city"
                    placeholder="Paris"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Pays</label>
                  <input
                    name="country"
                    placeholder="France"
                    defaultValue="France"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Téléphone</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="site@entreprise.fr"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  />
                </div>

                {/* Accès */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Digicode 1</label>
                  <input name="digicode1" placeholder="1234"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Digicode 2</label>
                  <input name="digicode2" placeholder="5678"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Interphone</label>
                  <input name="interphone" placeholder="Nom ou code"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Étage</label>
                  <input name="etage" placeholder="2e étage, RDC…"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Heure ouverture</label>
                  <input name="heureOuverture" type="time"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Heure fermeture</label>
                  <input name="heureFermeture" type="time"
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background" />
                </div>

                {/* Flags */}
                <div className="col-span-2 flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input id="isHQ" type="checkbox" name="isHeadquarters" value="true"
                      className="rounded border-input" />
                    <label htmlFor="isHQ" className="text-xs text-muted-foreground">Siège social</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="isDef" type="checkbox" name="isDefault" value="true"
                      className="rounded border-input" />
                    <label htmlFor="isDef" className="text-xs text-muted-foreground">Site par défaut</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="noSync" type="checkbox" name="noSync" value="true"
                      className="rounded border-input" />
                    <label htmlFor="noSync" className="text-xs text-muted-foreground">Pas de synchronisation</label>
                  </div>
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background resize-none"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" size="sm" disabled={isPending || done}>
                  {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : done ? <Check size={14} className="mr-1.5 text-emerald-500" /> : null}
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
