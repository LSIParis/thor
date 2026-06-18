'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { updateContactFromPage, deleteContactFromPage } from '@/actions/contacts'
import { Pencil, Trash2, Check, X, Loader2, Phone, Mail, User } from 'lucide-react'

interface Site { id: string; name: string }

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string | null
  notes: string | null
  siteId: string | null
  noSync: boolean
  visible: boolean
}

interface ContactCardProps {
  contact: Contact
  isAdmin: boolean
  sites: Site[]
  clientName?: string
  clientId?: string
  selected?: boolean
  onToggle?: () => void
}

export function ContactCard({ contact, isAdmin, sites, clientName, clientId, selected, onToggle }: ContactCardProps) {
  const [mode, setMode]    = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [isPending, start] = useTransition()
  const router             = useRouter()

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      await updateContactFromPage(contact.id, fd)
      setMode('idle')
      router.refresh()
    })
  }

  function handleDelete() {
    start(async () => {
      await deleteContactFromPage(contact.id)
      router.refresh()
    })
  }

  if (mode === 'edit') {
    return (
      <form onSubmit={handleUpdate} className="px-4 py-3 bg-muted/20">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Nom *</label>
            <input name="lastName" required defaultValue={contact.lastName}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Prénom *</label>
            <input name="firstName" required defaultValue={contact.firstName}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Téléphone</label>
            <input name="phone" defaultValue={contact.phone ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Email</label>
            <input name="email" defaultValue={contact.email ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Fonction</label>
            <input name="role" defaultValue={contact.role ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Site</label>
            <select name="siteId" defaultValue={contact.siteId ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background">
              <option value="">— Sans site —</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">Notes</label>
            <textarea name="notes" rows={2} defaultValue={contact.notes ?? ''}
              className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background resize-none" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id={`nosync-${contact.id}`} type="checkbox" name="noSync" value="true"
              defaultChecked={contact.noSync} className="rounded border-input" />
            <label htmlFor={`nosync-${contact.id}`} className="text-[10px] text-muted-foreground cursor-pointer">
              Pas de synchronisation
            </label>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input id={`visible-${contact.id}`} type="checkbox" name="visible" value="true"
              defaultChecked={contact.visible} className="rounded border-input" />
            <label htmlFor={`visible-${contact.id}`} className="text-[10px] text-muted-foreground cursor-pointer">
              Visible
            </label>
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
    <div className={`flex items-center justify-between px-4 py-2.5 gap-4 ${selected ? 'bg-primary/5' : ''}`}>
      {/* Checkbox multi-sélection */}
      {onToggle && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 accent-primary cursor-pointer flex-shrink-0"
        />
      )}

      {/* Colonne client (vue globale) */}
      {clientName && clientId && (
        <div className="w-36 flex-shrink-0">
          <Link href={`/clients/${clientId}`}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
            {clientName}
          </Link>
        </div>
      )}

      {/* Icône + infos */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <User size={13} />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {contact.firstName} {contact.lastName}
          </span>
          {contact.role && (
            <span className="text-xs text-muted-foreground">{contact.role}</span>
          )}
          {contact.noSync
            ? <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pas de synchro</span>
            : <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Synchro</span>
          }
          {!contact.visible && (
            <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">Non visible</span>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
        {contact.phone && (
          <a href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Phone size={10} /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Mail size={10} /> {contact.email}
          </a>
        )}
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
