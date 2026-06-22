'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getEquipmentFormData, updateEquipmentAssignments } from '@/actions/equipment'

type Contact = { id: string; firstName: string; lastName: string; role: string | null }
type EquipmentItem = {
  id: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  assignedToId: string | null
}

const selectCls =
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AssociateEquipmentDialog({
  clientId,
  equipment,
}: {
  clientId: string
  equipment: EquipmentItem[]
}) {
  const [open, setOpen]             = useState(false)
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, start]          = useTransition()
  const router                      = useRouter()

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    try {
      const data = await getEquipmentFormData(clientId)
      setContacts(data.contacts)
      const init: Record<string, string> = {}
      for (const e of equipment) {
        init[e.id] = e.assignedToId ?? ''
      }
      setAssignments(init)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(equipmentId: string, contactId: string) {
    setAssignments((prev) => ({ ...prev, [equipmentId]: contactId }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const result = await updateEquipmentAssignments(
        clientId,
        Object.entries(assignments).map(([equipmentId, contactId]) => ({
          equipmentId,
          contactId: contactId || null,
        })),
      )
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
      >
        <Link2 size={13} /> Associations
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Associer équipements — utilisateurs</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={22} />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {contacts.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground text-center">
                  Aucun contact enregistré pour ce client.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-4 text-left font-medium">Équipement</th>
                        <th className="py-2 text-left font-medium">Attribué à</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {equipment.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/20">
                          <td className="py-2 pr-4">
                            <div className="font-medium">
                              {[e.brand, e.model].filter(Boolean).join(' ') || e.type}
                            </div>
                            {[e.brand, e.model].some(Boolean) && (
                              <div className="text-xs text-muted-foreground">{e.type}</div>
                            )}
                            {e.serialNumber && (
                              <div className="text-xs text-muted-foreground font-mono">{e.serialNumber}</div>
                            )}
                          </td>
                          <td className="py-2">
                            <select
                              value={assignments[e.id] ?? ''}
                              onChange={(ev) => handleChange(e.id, ev.target.value)}
                              className={selectCls}
                            >
                              <option value="">— Non attribué —</option>
                              {contacts.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.firstName} {c.lastName}{c.role ? ` — ${c.role}` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

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
                <Button type="submit" size="sm" disabled={isPending || contacts.length === 0}>
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
