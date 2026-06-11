'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateM365TenantFromPage } from '@/actions/m365'
import { Pencil, X, Loader2, Check } from 'lucide-react'

interface Tenant {
  id: string
  displayName: string
  tenantId: string | null
  azureClientId: string | null
  azureClientSecret: string | null
  notes: string | null
}

export function EditTenantDialog({ tenant }: { tenant: Tenant }) {
  const [open, setOpen]    = useState(false)
  const [done, setDone]    = useState(false)
  const [error, setError]  = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const router             = useRouter()

  function handleOpen() {
    setOpen(true)
    setDone(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('id', tenant.id)
    start(async () => {
      try {
        await updateM365TenantFromPage(formData)
        setDone(true)
        router.refresh()
        setTimeout(() => { setOpen(false); setDone(false) }, 1000)
      } catch {
        setError('Une erreur est survenue.')
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Modifier ce tenant"
      >
        <Pencil size={12} />
        Modifier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Modifier le tenant</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center text-emerald-600 font-medium flex items-center justify-center gap-2">
                <Check size={16} /> Modifications enregistrées
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom du tenant <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="displayName"
                    required
                    defaultValue={tenant.displayName}
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
                    defaultValue={tenant.tenantId ?? ''}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Credentials Azure (sync Graph API)
                  </p>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Azure Client ID
                      <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                    </label>
                    <input
                      name="azureClientId"
                      defaultValue={tenant.azureClientId ?? ''}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Azure Client Secret
                      <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                    </label>
                    <input
                      name="azureClientSecret"
                      type="password"
                      defaultValue={tenant.azureClientSecret ?? ''}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                    <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={tenant.notes ?? ''}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending
                      ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enregistrement…</>
                      : <><Check size={14} className="mr-1.5" />Enregistrer</>
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
