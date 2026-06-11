'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createM365TenantFromPage } from '@/actions/m365'
import { Plus, X, Loader2, ChevronDown, BookOpen } from 'lucide-react'

interface Client { id: string; name: string }

export function AddTenantDialog({ clients, selectedClient }: { clients: Client[]; selectedClient?: Client | null }) {
  const [open, setOpen]       = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [showGuide, setGuide] = useState(false)
  const [isPending, start]    = useTransition()
  const router                = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    start(async () => {
      try {
        await createM365TenantFromPage(formData)
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
      <Button size="sm" onClick={() => { setOpen(true); setDone(false); setError(null) }}>
        <Plus size={14} className="mr-1.5" />
        Ajouter un tenant
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nouveau tenant Microsoft 365</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center text-emerald-600 font-medium">Tenant créé ✓</div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {selectedClient ? (
                  <input type="hidden" name="clientId" value={selectedClient.id} />
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Client <span className="text-destructive">*</span>
                    </label>
                    <select
                      name="clientId"
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom du tenant <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="displayName"
                    required
                    defaultValue={selectedClient?.name ?? ''}
                    placeholder="ex. LSI Maintenance"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tenant ID Microsoft
                    <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                  </label>
                  <input
                    name="tenantId"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
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

                {/* Guide Entra */}
                <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGuide((v) => !v)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={12} />
                      Comment créer une application dans Microsoft Entra ?
                    </span>
                    <ChevronDown size={12} className={`transition-transform ${showGuide ? 'rotate-180' : ''}`} />
                  </button>

                  {showGuide && (
                    <ol className="px-4 pb-4 pt-1 space-y-2 text-xs text-muted-foreground border-t border-border">
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
                        <span>Connectez-vous sur <strong className="text-foreground">entra.microsoft.com</strong> avec un compte administrateur du tenant client.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
                        <span>Allez dans <strong className="text-foreground">Applications → Inscriptions d'applications</strong> puis cliquez sur <strong className="text-foreground">Nouvelle inscription</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">3</span>
                        <span>Donnez un nom (ex. <em>LSI Thor Sync</em>), choisissez <strong className="text-foreground">Locataire unique</strong> et validez.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">4</span>
                        <span>Sur la page de l'application, notez l'<strong className="text-foreground">ID d'application (client)</strong> et l'<strong className="text-foreground">ID d'annuaire (locataire)</strong> — à saisir dans ce formulaire et dans "Modifier".</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">5</span>
                        <span>Allez dans <strong className="text-foreground">Certificats et secrets → Nouveau secret client</strong>. Copiez la <strong className="text-foreground">valeur</strong> immédiatement (elle ne s'affiche qu'une fois).</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">6</span>
                        <span>Allez dans <strong className="text-foreground">Autorisations API → Ajouter → Microsoft Graph → Autorisations d'application</strong> et ajoutez <strong className="text-foreground">User.Read.All</strong> et <strong className="text-foreground">Directory.Read.All</strong>.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">7</span>
                        <span>Cliquez sur <strong className="text-foreground">Accorder le consentement administrateur</strong> pour le tenant et confirmez.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">8</span>
                        <span>Créez le tenant ici, puis utilisez le bouton <strong className="text-foreground">Modifier</strong> pour renseigner l'ID client et le secret Azure.</span>
                      </li>
                    </ol>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
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
