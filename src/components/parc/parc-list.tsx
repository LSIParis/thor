'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Monitor, Server, Laptop, Printer, Router, Wifi, Cpu,
  UserRound, CalendarDays, ShieldCheck, Wifi as WifiIcon,
  Trash2, X, Loader2, MapPin,
} from 'lucide-react'
import { deleteEquipmentBulk } from '@/actions/equipment'
import { Button } from '@/components/ui/button'
import { EditEquipmentDialog } from './edit-equipment-dialog'

type EquipmentRow = {
  id: string
  type: string
  operatingSystem: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  ipAddress: string | null
  ipType: string | null
  rmmAgentId: string | null
  notes: string | null
  purchaseDate: Date | null
  warrantyDuration: string | null
  site: { id: string; name: string } | null
  assignedTo: { firstName: string; lastName: string; role: string | null } | null
}

const TYPE_ICON: Record<string, React.ElementType> = {
  'Serveur': Server,
  'PC Fixe': Monitor,
  'PC Portable': Laptop,
  'Mac Fixe': Monitor,
  'Mac Portable': Laptop,
  'Switch': Router,
  'Routeur / Firewall': Router,
  'Imprimante Personnelle': Printer,
  'Imprimante Départementale': Printer,
  'Box Internet': Wifi,
  'Autre': Cpu,
}

const TYPE_COLOR: Record<string, string> = {
  'Serveur': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'PC Fixe': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'PC Portable': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'Mac Fixe': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  'Mac Portable': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  'Switch': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  'Routeur / Firewall': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'Imprimante Personnelle': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'Imprimante Départementale': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'Box Internet': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  'Autre': 'bg-muted text-muted-foreground border-border',
}

export function ParcList({
  equipment,
  clientId,
  isAdmin = false,
}: {
  equipment: EquipmentRow[]
  clientId: string
  isAdmin?: boolean
}) {
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirm] = useState(false)
  const [isPending, start]          = useTransition()
  const router                      = useRouter()

  const allIds      = equipment.map((e) => e.id)
  const selCount    = selected.size
  const allSelected = selCount === allIds.length && allIds.length > 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    allSelected ? setSelected(new Set()) : setSelected(new Set(allIds))
  }

  function clearSelection() { setSelected(new Set()); setConfirm(false) }

  function handleBulkDelete() {
    start(async () => {
      await deleteEquipmentBulk(Array.from(selected))
      clearSelection()
      router.refresh()
    })
  }

  if (equipment.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Aucun équipement.</p>
  }

  return (
    <>
      {isAdmin && allIds.length > 0 && (
        <label className="flex items-center gap-2 mb-3 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-3.5 h-3.5 accent-primary cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">Tout sélectionner</span>
        </label>
      )}

      <div className="space-y-1.5">
        {equipment.map((item) => {
          const Icon       = TYPE_ICON[item.type] ?? Cpu
          const colorClass = TYPE_COLOR[item.type] ?? TYPE_COLOR['Autre']
          const isSelected = selected.has(item.id)

          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              {/* Checkbox (admin only) */}
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.id)}
                  className="mt-1 w-3.5 h-3.5 flex-shrink-0 accent-primary cursor-pointer"
                />
              )}

              {/* Type icon */}
              <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-md border ${colorClass}`}>
                <Icon size={14} />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {[item.brand, item.model].filter(Boolean).join(' ') || item.type}
                  </span>
                  {item.operatingSystem && (
                    <span className="text-xs px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                      {item.operatingSystem}
                    </span>
                  )}
                  {item.rmmAgentId && (
                    <span className="text-xs px-1.5 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-1">
                      <WifiIcon size={9} /> RMM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                  {item.serialNumber && (
                    <span className="font-mono">{item.serialNumber}</span>
                  )}
                  {item.ipAddress && (
                    <span className="font-mono">{item.ipAddress}{item.ipType ? ` (${item.ipType})` : ''}</span>
                  )}
                  {item.purchaseDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={10} />
                      {new Date(item.purchaseDate).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {item.warrantyDuration && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={10} />
                      {item.warrantyDuration}
                    </span>
                  )}
                  {item.site && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {item.site.name}
                    </span>
                  )}
                  {item.assignedTo && (
                    <span className="flex items-center gap-1">
                      <UserRound size={10} />
                      {item.assignedTo.firstName} {item.assignedTo.lastName}
                      {item.assignedTo.role && ` — ${item.assignedTo.role}`}
                    </span>
                  )}
                  {item.notes && (
                    <span className="italic truncate max-w-[240px]">{item.notes}</span>
                  )}
                </div>
              </div>

              {/* Right: type badge + edit */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded border ${colorClass} hidden sm:inline-block`}>
                  {item.type}
                </span>
                {isAdmin && (
                  <EditEquipmentDialog item={item} clientId={clientId} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bulk action bar */}
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
                Supprimer {selCount} équipement{selCount > 1 ? 's' : ''} ?
              </span>
              <Button
                size="sm" variant="destructive"
                onClick={handleBulkDelete} disabled={isPending}
                className="h-6 text-xs px-2 py-0"
              >
                {isPending ? <Loader2 size={10} className="animate-spin" /> : 'Confirmer'}
              </Button>
              <button
                onClick={() => setConfirm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80"
            >
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
