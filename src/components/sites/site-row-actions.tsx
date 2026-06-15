'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { updateSite, deleteSite } from '@/actions/sites'
import { Pencil, Trash2, Check, X, Loader2, MapPin, Phone, Mail, Star, Home } from 'lucide-react'

interface Site {
  id: string
  name: string
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  email: string | null
  digicode1: string | null
  digicode2: string | null
  interphone: string | null
  etage: string | null
  heureOuverture: string | null
  heureFermeture: string | null
  isHeadquarters: boolean
  isDefault: boolean
  notes: string | null
}

interface SiteCardProps {
  site: Site
  isAdmin: boolean
  clientName?: string
  clientId?: string
  selected?: boolean
  onToggle?: () => void
}

export function SiteCard({ site, isAdmin, clientName, clientId, selected, onToggle }: SiteCardProps) {
  const [mode, setMode]    = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [isPending, start] = useTransition()
  const router             = useRouter()

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!fd.get('isHeadquarters')) fd.set('isHeadquarters', 'false')
    if (!fd.get('isDefault'))      fd.set('isDefault', 'false')
    start(async () => {
      await updateSite(site.id, fd)
      setMode('idle')
      router.refresh()
    })
  }

  function handleDelete() {
    start(async () => {
      await deleteSite(site.id)
      router.refresh()
    })
  }

  if (mode === 'edit') {
    return (
      <form onSubmit={handleUpdate} className="px-4 py-3 bg-muted/20">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Nom *</label>
            <input name="name" required defaultValue={site.name}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Adresse</label>
            <input name="address" defaultValue={site.address ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Code postal</label>
            <input name="postalCode" defaultValue={site.postalCode ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Ville</label>
            <input name="city" defaultValue={site.city ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Pays</label>
            <input name="country" defaultValue={site.country ?? 'France'}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Téléphone</label>
            <input name="phone" defaultValue={site.phone ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Email</label>
            <input name="email" defaultValue={site.email ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Digicode 1</label>
            <input name="digicode1" defaultValue={site.digicode1 ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Digicode 2</label>
            <input name="digicode2" defaultValue={site.digicode2 ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Interphone</label>
            <input name="interphone" defaultValue={site.interphone ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Étage</label>
            <input name="etage" defaultValue={site.etage ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Heure ouverture</label>
            <input name="heureOuverture" type="time" defaultValue={site.heureOuverture ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Heure fermeture</label>
            <input name="heureFermeture" type="time" defaultValue={site.heureFermeture ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div className="col-span-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input id={`hq-${site.id}`} type="checkbox" name="isHeadquarters" value="true"
                defaultChecked={site.isHeadquarters} className="rounded border-input" />
              <label htmlFor={`hq-${site.id}`} className="text-[10px] text-muted-foreground">Siège social</label>
            </div>
            <div className="flex items-center gap-2">
              <input id={`def-${site.id}`} type="checkbox" name="isDefault" value="true"
                defaultChecked={site.isDefault} className="rounded border-input" />
              <label htmlFor={`def-${site.id}`} className="text-[10px] text-muted-foreground">Site par défaut</label>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Notes</label>
            <textarea name="notes" rows={2} defaultValue={site.notes ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode('idle')}>
              <X size={12} className="mr-1" /> Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className={`flex items-start justify-between px-4 py-3 gap-4 ${selected ? 'bg-primary/5' : ''}`}>
      {/* Checkbox multi-sélection */}
      {onToggle && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          className="mt-1 w-3.5 h-3.5 accent-primary cursor-pointer flex-shrink-0"
        />
      )}

      {/* Colonne client (vue "tous les clients") */}
      {clientName && clientId && (
        <div className="w-36 flex-shrink-0 pt-0.5">
          <Link
            href={`/clients/${clientId}`}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors leading-snug"
          >
            {clientName}
          </Link>
        </div>
      )}

      {/* Info site */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary flex-shrink-0">
          <MapPin size={13} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{site.name}</span>
            {site.isDefault && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Home size={9} /> Défaut
              </span>
            )}
            {site.isHeadquarters && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Star size={9} /> Siège
              </span>
            )}
          </div>
          {(site.address || site.city || site.postalCode) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[site.address, site.postalCode, site.city, site.country !== 'France' ? site.country : null]
                .filter(Boolean).join(', ')}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {site.phone && (
              <a href={`tel:${site.phone}`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Phone size={10} /> {site.phone}
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Mail size={10} /> {site.email}
              </a>
            )}
          </div>
          {(site.digicode1 || site.digicode2 || site.interphone || site.etage) && (
            <div className="flex items-center gap-3 mt-1">
              {site.etage      && <span className="text-[11px] text-muted-foreground">Étage : {site.etage}</span>}
              {site.digicode1  && <span className="text-[11px] text-muted-foreground">Digi. 1 : {site.digicode1}</span>}
              {site.digicode2  && <span className="text-[11px] text-muted-foreground">Digi. 2 : {site.digicode2}</span>}
              {site.interphone && <span className="text-[11px] text-muted-foreground">Interphone : {site.interphone}</span>}
            </div>
          )}
          {(site.heureOuverture || site.heureFermeture) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Horaires : {site.heureOuverture ?? '?'} – {site.heureFermeture ?? '?'}
            </p>
          )}
          {site.notes && (
            <p className="text-[11px] text-muted-foreground mt-1 italic">{site.notes}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        mode === 'confirm-delete' ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-destructive">Supprimer ?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirmer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>Annuler</Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setMode('edit')} title="Modifier">
              <Pencil size={13} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('confirm-delete')} title="Supprimer"
              className="text-destructive hover:text-destructive">
              <Trash2 size={13} />
            </Button>
          </div>
        )
      )}
    </div>
  )
}
