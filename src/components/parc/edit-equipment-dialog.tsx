'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getEquipmentFormData, updateEquipmentInPlace } from '@/actions/equipment'

const EQUIPMENT_TYPES = [
  'PC Fixe', 'PC Portable', 'Mac Fixe', 'Mac Portable',
  'Serveur', 'Switch', 'Routeur / Firewall',
  'Imprimante Personnelle', 'Imprimante Départementale',
  'Box Internet', 'Autre',
]

type Contact = { id: string; firstName: string; lastName: string; role: string | null }
type Site    = { id: string; name: string }

type EquipmentRow = {
  id: string
  type: string
  operatingSystem: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  ipAddress: string | null
  ipType: string | null
  notes: string | null
  noSync: boolean
  purchaseDate: Date | null
  warrantyDuration: string | null
  site: { id: string; name: string } | null
  assignedTo: { firstName: string; lastName: string; role: string | null } | null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const selectCls =
  'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function EditEquipmentDialog({
  item,
  clientId,
}: {
  item: EquipmentRow
  clientId: string
}) {
  const [open, setOpen]         = useState(false)
  const [sites, setSites]       = useState<Site[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, start]      = useTransition()
  const router                  = useRouter()

  async function handleOpen() {
    setOpen(true)
    if (sites.length === 0) {
      setLoading(true)
      try {
        const data = await getEquipmentFormData(clientId)
        setSites(data.sites)
        setContacts(data.contacts)
      } finally {
        setLoading(false)
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    start(async () => {
      const result = await updateEquipmentInPlace(item.id, clientId, fd)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  const purchaseDateStr = item.purchaseDate
    ? new Date(item.purchaseDate).toISOString().split('T')[0]
    : ''

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Modifier"
      >
        <Pencil size={13} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {[item.brand, item.model].filter(Boolean).join(' ') || item.type}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={22} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <Field label="Type">
                  <select name="type" defaultValue={item.type} className={selectCls}>
                    {EQUIPMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                {/* Système d'exploitation */}
                <Field label="Système d'exploitation">
                  <input
                    name="operatingSystem"
                    defaultValue={item.operatingSystem ?? ''}
                    className={inputCls}
                    placeholder="Ex. Windows 11, macOS 14…"
                  />
                </Field>

                {/* Marque */}
                <Field label="Marque">
                  <input
                    name="brand"
                    defaultValue={item.brand ?? ''}
                    className={inputCls}
                    placeholder="Dell, HP, Apple…"
                  />
                </Field>

                {/* Modèle */}
                <Field label="Modèle">
                  <input
                    name="model"
                    defaultValue={item.model ?? ''}
                    className={inputCls}
                  />
                </Field>

                {/* Numéro de série */}
                <Field label="Numéro de série">
                  <input
                    name="serialNumber"
                    defaultValue={item.serialNumber ?? ''}
                    className={inputCls}
                    placeholder="S/N"
                  />
                </Field>

                {/* Adresse IP */}
                <Field label="Adresse IP">
                  <div className="flex gap-2">
                    <input
                      name="ipAddress"
                      defaultValue={item.ipAddress ?? ''}
                      className={inputCls}
                      placeholder="192.168.1.x"
                    />
                    <select name="ipType" defaultValue={item.ipType ?? ''} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0">
                      <option value="">—</option>
                      <option value="Fixe">Fixe</option>
                      <option value="DHCP">DHCP</option>
                    </select>
                  </div>
                </Field>

                {/* Site */}
                <Field label="Site">
                  <select name="siteId" defaultValue={item.site?.id ?? ''} className={selectCls}>
                    <option value="">— Aucun site —</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                {/* Attribué à */}
                <Field label="Attribué à">
                  <select name="assignedToId" defaultValue={item.assignedTo ? findContactId(contacts, item.assignedTo) : ''} className={selectCls}>
                    <option value="">— Non attribué —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}{c.role ? ` — ${c.role}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Date d'achat */}
                <Field label="Date d'achat">
                  <input
                    type="date"
                    name="purchaseDate"
                    defaultValue={purchaseDateStr}
                    className={inputCls}
                  />
                </Field>

                {/* Durée de garantie */}
                <Field label="Durée de garantie">
                  <input
                    name="warrantyDuration"
                    defaultValue={item.warrantyDuration ?? ''}
                    className={inputCls}
                    placeholder="Ex. 3 ans"
                  />
                </Field>

                {/* Notes (full width) */}
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <textarea
                      name="notes"
                      defaultValue={item.notes ?? ''}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>

                {/* Pas de synchronisation */}
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    id="noSyncEq"
                    type="checkbox"
                    name="noSync"
                    value="true"
                    defaultChecked={item.noSync}
                    className="rounded border-input"
                  />
                  <label htmlFor="noSyncEq" className="text-xs text-muted-foreground cursor-pointer">
                    Pas de synchronisation
                  </label>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              )}

              <DialogFooter className="mt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function findContactId(
  contacts: Contact[],
  assignedTo: { firstName: string; lastName: string } | null,
): string {
  if (!assignedTo) return ''
  const fn = assignedTo.firstName.toLowerCase()
  const ln = assignedTo.lastName.toLowerCase()
  return contacts.find(
    (c) => c.firstName.toLowerCase() === fn && c.lastName.toLowerCase() === ln,
  )?.id ?? ''
}
