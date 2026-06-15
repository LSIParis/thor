'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SiteCard } from './site-row-actions'
import { deleteSitesBulk } from '@/actions/sites'
import { Trash2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Site = {
  id: string; name: string
  address: string | null; city: string | null; postalCode: string | null; country: string | null
  phone: string | null; email: string | null
  digicode1: string | null; digicode2: string | null; interphone: string | null; etage: string | null
  heureOuverture: string | null; heureFermeture: string | null
  isHeadquarters: boolean; isDefault: boolean; notes: string | null
}
type SiteWithClient = Site & { client: { id: string; name: string } }

type Props =
  | { mode: 'single'; sites: Site[]; isAdmin: boolean }
  | { mode: 'all'; sites: SiteWithClient[]; isAdmin: boolean }

export function SitesView(props: Props) {
  const { isAdmin } = props
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirm] = useState(false)
  const [isPending, start]          = useTransition()
  const router                      = useRouter()

  const allIds     = props.sites.map(s => s.id)
  const selCount   = selected.size
  const allSelected = selCount === allIds.length && allIds.length > 0

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    allSelected ? setSelected(new Set()) : setSelected(new Set(allIds))
  }

  function clearSelection() { setSelected(new Set()); setConfirm(false) }

  function handleBulkDelete() {
    start(async () => {
      await deleteSitesBulk(Array.from(selected))
      clearSelection()
      router.refresh()
    })
  }

  if (props.sites.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-16 text-center text-muted-foreground text-sm">
        {props.mode === 'single' ? 'Aucun site enregistré pour ce client' : 'Aucun site enregistré'}
        {isAdmin && (
          <p className="mt-2 text-xs">Cliquez sur « Ajouter un site » pour commencer.</p>
        )}
      </div>
    )
  }

  return (
    <>
      {isAdmin && allIds.length > 0 && (
        <label className="flex items-center gap-2 mb-3 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={allSelected} onChange={toggleAll}
            className="w-3.5 h-3.5 accent-primary cursor-pointer" />
          <span className="text-xs text-muted-foreground">Tout sélectionner</span>
        </label>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {props.mode === 'single'
          ? props.sites.map(site => (
              <SiteCard key={site.id} site={site} isAdmin={isAdmin}
                selected={selected.has(site.id)} onToggle={() => toggle(site.id)} />
            ))
          : props.sites.map(site => (
              <SiteCard key={site.id} site={site} isAdmin={isAdmin}
                clientName={site.client.name} clientId={site.client.id}
                selected={selected.has(site.id)} onToggle={() => toggle(site.id)} />
            ))
        }
      </div>

      {isAdmin && selCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-full shadow-xl text-sm whitespace-nowrap">
          <span className="font-medium tabular-nums">
            {selCount} sélectionné{selCount > 1 ? 's' : ''}
          </span>
          <span className="text-border select-none">|</span>
          <button onClick={toggleAll} className="text-xs text-muted-foreground hover:text-foreground">
            {allSelected ? 'Désélectionner tout' : 'Tout sélectionner'}
          </button>
          <span className="text-border select-none">|</span>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">
                Supprimer {selCount} site{selCount > 1 ? 's' : ''} ?
              </span>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isPending}
                className="h-6 text-xs px-2 py-0">
                {isPending ? <Loader2 size={10} className="animate-spin" /> : 'Confirmer'}
              </Button>
              <button onClick={() => setConfirm(false)}
                className="text-xs text-muted-foreground hover:text-foreground">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)}
              className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80">
              <Trash2 size={12} /> Supprimer
            </button>
          )}
          <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground ml-1">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
