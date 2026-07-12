'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, ChevronDown, Trash2, UserX, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncVisibleContactsToDesk365, importOrphanContacts } from '@/actions/contacts'

type ContactRef = { name: string; email: string; company: string }
type Result = {
  created: number
  skipped: number
  toDelete: ContactRef[]
  orphans: ContactRef[]
  error?: string
}

function CollapsibleList({
  count, label, icon, colorClass, items,
}: {
  count: number; label: string; icon: React.ReactNode; colorClass: string; items: ContactRef[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-xs ${colorClass} hover:opacity-80 transition-opacity`}
      >
        {icon}
        {count} {label}
        <ChevronDown size={11} className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-border bg-muted/40 p-2 text-left max-h-48 overflow-y-auto">
          {items.map(c => (
            <div key={c.email} className="py-0.5 text-xs">
              <span className="font-medium text-foreground">{c.name || '—'}</span>
              <span className="text-muted-foreground"> — {c.email}</span>
              {c.company && <span className="text-muted-foreground/70"> ({c.company})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrphansImportList({ items, clientId, onImported }: {
  items: ContactRef[]
  clientId?: string
  onImported: (count: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const allSelected = selected.size === items.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map(c => c.email)))
  }

  function toggle(email: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  function handleImport() {
    const toImport = items.filter(c => selected.has(c.email))
    startTransition(async () => {
      const { created } = await importOrphanContacts(toImport, clientId)
      setImportedCount(created)
      setSelected(new Set())
      onImported(created)
    })
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity"
      >
        <UserX size={11} />
        {items.length} contact{items.length > 1 ? 's' : ''} dans Desk365 absents de Thor
        <ChevronDown size={11} className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-border bg-muted/40 text-left overflow-hidden">
          {/* Header sélection */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/60">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded"
              />
              <span className="text-muted-foreground">
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </span>
            </label>
            {selected.size > 0 && (
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleImport} disabled={isPending}>
                {isPending
                  ? <Loader2 size={11} className="mr-1 animate-spin" />
                  : <Download size={11} className="mr-1" />}
                Importer {selected.size}
              </Button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-52 overflow-y-auto divide-y divide-border/40">
            {items.map(c => (
              <label key={c.email} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(c.email)}
                  onChange={() => toggle(c.email)}
                  className="rounded shrink-0"
                />
                <span className="text-xs min-w-0">
                  <span className="font-medium text-foreground">{c.name || '—'}</span>
                  <span className="text-muted-foreground"> — {c.email}</span>
                  {c.company && <span className="text-muted-foreground/70"> ({c.company})</span>}
                </span>
              </label>
            ))}
          </div>

          {/* Confirmation import */}
          {importedCount !== null && (
            <div className="px-3 py-2 border-t border-border/60 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} />
              {importedCount} contact{importedCount > 1 ? 's' : ''} importé{importedCount > 1 ? 's' : ''} dans Thor
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SyncDesk365ContactsButton({ clientId }: { clientId?: string } = {}) {
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, start]  = useTransition()

  function handleSync() {
    setResult(null)
    start(async () => {
      try {
        const res = await syncVisibleContactsToDesk365(clientId)
        setResult(res)
      } catch (e) {
        setResult({ created: 0, skipped: 0, toDelete: [], orphans: [], error: e instanceof Error ? e.message : 'Erreur serveur' })
      }
    })
  }

  const summary = result && !result.error
    ? result.created > 0
      ? `+${result.created} contact${result.created !== 1 ? 's' : ''} créé${result.created !== 1 ? 's' : ''}`
      : 'Déjà synchronisé'
    : null

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        {summary && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} />
            {summary}
          </span>
        )}
        {result?.error && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle size={13} />
            {result.error}
          </span>
        )}
        <Button size="sm" variant="outline" onClick={handleSync} disabled={isPending}>
          {isPending
            ? <Loader2 size={14} className="mr-1.5 animate-spin" />
            : <RefreshCw size={14} className="mr-1.5" />}
          Synchro Desk365
        </Button>
      </div>

      {result && result.toDelete.length > 0 && (
        <CollapsibleList
          count={result.toDelete.length}
          label={`contact${result.toDelete.length > 1 ? 's' : ''} à supprimer dans Desk365 (noSync)`}
          icon={<Trash2 size={11} />}
          colorClass="text-amber-600 dark:text-amber-400"
          items={result.toDelete}
        />
      )}

      {result && result.orphans.length > 0 && (
        <OrphansImportList
          items={result.orphans}
          clientId={clientId}
          onImported={() => {}}
        />
      )}
    </div>
  )
}
