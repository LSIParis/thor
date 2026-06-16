'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ContactCard } from './contact-card'
import { deleteContactsBulk } from '@/actions/contacts'
import { MapPin, Users, Trash2, X, Loader2, Globe, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Contact = {
  id: string; firstName: string; lastName: string
  email: string | null; phone: string | null
  role: string | null; notes: string | null; siteId: string | null; noSync: boolean
}
type ContactWithClient = Contact & { client: { id: string; name: string } }
type SiteGroup = { id: string; name: string; contacts: Contact[] }
type Site = { id: string; clientId: string; name: string }

type Props =
  | { mode: 'grouped'; siteGroups: SiteGroup[]; unsited: Contact[]; clientSites: Site[]; isAdmin: boolean }
  | { mode: 'flat'; contacts: ContactWithClient[]; allSites: Site[]; isAdmin: boolean }

// ── Utilitaires domaine ───────────────────────────────────────────────────────

function getDomain(email: string | null): string {
  if (!email) return ''
  const at = email.indexOf('@')
  return at >= 0 ? email.slice(at + 1).toLowerCase() : ''
}

function groupByDomain<T extends { email: string | null }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const d = getDomain(item.email)
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(item)
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    return a.localeCompare(b)
  })
}

// ── Groupe domaine collapsible ────────────────────────────────────────────────

function DomainGroup<T extends Contact>({
  domain,
  contacts,
  isAdmin,
  getSites,
  getClientProps,
  selected,
  onToggle,
}: {
  domain: string
  contacts: T[]
  isAdmin: boolean
  getSites: (c: T) => Site[]
  getClientProps?: (c: T) => { clientName: string; clientId: string }
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border hover:bg-muted/60 transition-colors"
      >
        <Globe size={12} className="text-primary flex-shrink-0" />
        <span className="text-xs font-semibold flex-1 text-left">
          {domain || 'Sans domaine'}
        </span>
        <span className="text-xs text-muted-foreground mr-1">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-border">
          {contacts.map(c => {
            const cp = getClientProps?.(c)
            return (
              <ContactCard
                key={c.id}
                contact={c}
                isAdmin={isAdmin}
                sites={getSites(c)}
                clientName={cp?.clientName}
                clientId={cp?.clientId}
                selected={selected.has(c.id)}
                onToggle={() => onToggle(c.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ContactsView(props: Props) {
  const { isAdmin } = props
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirm] = useState(false)
  const [isPending, start]          = useTransition()
  const router                      = useRouter()

  const allIds = props.mode === 'grouped'
    ? [...props.siteGroups.flatMap(s => s.contacts.map(c => c.id)), ...props.unsited.map(c => c.id)]
    : props.contacts.map(c => c.id)

  const selCount    = selected.size
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
      await deleteContactsBulk(Array.from(selected))
      clearSelection()
      router.refresh()
    })
  }

  const SelectAll = isAdmin && allIds.length > 0 ? (
    <label className="flex items-center gap-2 mb-3 cursor-pointer select-none w-fit">
      <input type="checkbox" checked={allSelected} onChange={toggleAll}
        className="w-3.5 h-3.5 accent-primary cursor-pointer" />
      <span className="text-xs text-muted-foreground">Tout sélectionner</span>
    </label>
  ) : null

  // ── Vue groupée par site (client sélectionné) ─────────────────────────────
  if (props.mode === 'grouped') {
    const { siteGroups, unsited, clientSites } = props
    const total = siteGroups.reduce((a, s) => a + s.contacts.length, 0) + unsited.length

    if (total === 0) {
      return (
        <div className="bg-card border border-border rounded-lg px-4 py-16 text-center text-muted-foreground text-sm">
          Aucun contact enregistré pour ce client
        </div>
      )
    }

    return (
      <>
        {SelectAll}
        <div className="space-y-4">
          {/* Sites avec contacts → groupés par domaine */}
          {siteGroups.filter(s => s.contacts.length > 0).map(site => {
            const domainGroups = groupByDomain(site.contacts)
            const moreThanOneDomain = domainGroups.length > 1

            return (
              <div key={site.id}>
                {/* En-tête site */}
                <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
                  <MapPin size={12} className="text-primary" />
                  <span className="text-xs font-semibold">{site.name}</span>
                  <span className="text-xs text-muted-foreground">
                    — {site.contacts.length} contact{site.contacts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {moreThanOneDomain ? (
                  /* Sous-groupes par domaine */
                  <div className="space-y-2 pl-4">
                    {domainGroups.map(([domain, dc]) => (
                      <DomainGroup
                        key={domain || '_none'}
                        domain={domain}
                        contacts={dc}
                        isAdmin={isAdmin}
                        getSites={() => clientSites}
                        selected={selected}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                ) : (
                  /* Un seul domaine : pas de sous-groupe, liste directe */
                  <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {site.contacts.map(c => (
                      <ContactCard key={c.id} contact={c} isAdmin={isAdmin} sites={clientSites}
                        selected={selected.has(c.id)} onToggle={() => toggle(c.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Sans site → groupés par domaine */}
          {unsited.length > 0 && (() => {
            const domainGroups = groupByDomain(unsited)
            const moreThanOneDomain = domainGroups.length > 1
            return (
              <div>
                <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
                  <Users size={12} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Sans site</span>
                  <span className="text-xs text-muted-foreground">
                    — {unsited.length} contact{unsited.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {moreThanOneDomain ? (
                  <div className="space-y-2 pl-4">
                    {domainGroups.map(([domain, dc]) => (
                      <DomainGroup
                        key={domain || '_none'}
                        domain={domain}
                        contacts={dc}
                        isAdmin={isAdmin}
                        getSites={() => clientSites}
                        selected={selected}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {unsited.map(c => (
                      <ContactCard key={c.id} contact={c} isAdmin={isAdmin} sites={clientSites}
                        selected={selected.has(c.id)} onToggle={() => toggle(c.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        <BulkActionBar selCount={selCount} allSelected={allSelected} confirmDelete={confirmDelete}
          isPending={isPending} onToggleAll={toggleAll} onClear={clearSelection}
          onRequestDelete={() => setConfirm(true)} onCancelDelete={() => setConfirm(false)}
          onConfirmDelete={handleBulkDelete} />
      </>
    )
  }

  // ── Vue globale groupée par domaine ───────────────────────────────────────
  const { contacts, allSites } = props

  if (contacts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-16 text-center text-muted-foreground text-sm">
        Aucun contact enregistré
      </div>
    )
  }

  const domainGroups = groupByDomain(contacts)

  return (
    <>
      {SelectAll}
      <div className="space-y-3">
        {domainGroups.map(([domain, dc]) => (
          <DomainGroup
            key={domain || '_none'}
            domain={domain}
            contacts={dc}
            isAdmin={isAdmin}
            getSites={(c) => allSites.filter(s => s.clientId === c.client.id)}
            getClientProps={(c) => ({ clientName: c.client.name, clientId: c.client.id })}
            selected={selected}
            onToggle={toggle}
          />
        ))}
      </div>

      <BulkActionBar selCount={selCount} allSelected={allSelected} confirmDelete={confirmDelete}
        isPending={isPending} onToggleAll={toggleAll} onClear={clearSelection}
        onRequestDelete={() => setConfirm(true)} onCancelDelete={() => setConfirm(false)}
        onConfirmDelete={handleBulkDelete} />
    </>
  )
}

// ── Barre d'actions flottante ─────────────────────────────────────────────────

function BulkActionBar({
  selCount, allSelected, confirmDelete, isPending,
  onToggleAll, onClear, onRequestDelete, onCancelDelete, onConfirmDelete,
}: {
  selCount: number; allSelected: boolean; confirmDelete: boolean; isPending: boolean
  onToggleAll: () => void; onClear: () => void
  onRequestDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void
}) {
  if (selCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-full shadow-xl text-sm whitespace-nowrap">
      <span className="font-medium tabular-nums">
        {selCount} sélectionné{selCount > 1 ? 's' : ''}
      </span>
      <span className="text-border select-none">|</span>
      <button onClick={onToggleAll} className="text-xs text-muted-foreground hover:text-foreground">
        {allSelected ? 'Désélectionner tout' : 'Tout sélectionner'}
      </button>
      <span className="text-border select-none">|</span>
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive">
            Supprimer {selCount} contact{selCount > 1 ? 's' : ''} ?
          </span>
          <Button size="sm" variant="destructive" onClick={onConfirmDelete} disabled={isPending}
            className="h-6 text-xs px-2 py-0">
            {isPending ? <Loader2 size={10} className="animate-spin" /> : 'Confirmer'}
          </Button>
          <button onClick={onCancelDelete} className="text-xs text-muted-foreground hover:text-foreground">
            Annuler
          </button>
        </div>
      ) : (
        <button onClick={onRequestDelete}
          className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80">
          <Trash2 size={12} /> Supprimer
        </button>
      )}
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground ml-1">
        <X size={14} />
      </button>
    </div>
  )
}
