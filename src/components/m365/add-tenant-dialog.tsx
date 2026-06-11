'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createM365TenantFromPage } from '@/actions/m365'
import { Plus, X, Loader2 } from 'lucide-react'

interface Client { id: string; name: string }

export function AddTenantDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen]     = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [isPending, start]  = useTransition()
  const router              = useRouter()

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
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
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

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom du tenant <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="displayName"
                    required
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
