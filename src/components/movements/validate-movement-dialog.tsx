'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2, Monitor, Laptop } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientPCs, validateMovement } from '@/actions/movements'

type PC = {
  id: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  assignedTo: { firstName: string; lastName: string } | null
}

const PC_ICON: Record<string, React.ElementType> = {
  'PC Fixe':      Monitor,
  'Mac Fixe':     Monitor,
  'PC Portable':  Laptop,
  'Mac Portable': Laptop,
}

export function ValidateMovementDialog({
  movementId,
  clientId,
  movementName,
}: {
  movementId: string
  clientId: string
  movementName: string
}) {
  const [open, setOpen]             = useState(false)
  const [pcs, setPcs]               = useState<PC[]>([])
  const [loading, setLoading]       = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [reprise, setReprise]       = useState('')
  const [isPending, start]          = useTransition()

  async function handleOpen() {
    setOpen(true)
    setLoading(true)
    setSelectedId('')
    setReprise('')
    try {
      const data = await getClientPCs(clientId)
      setPcs(data)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    start(async () => {
      await validateMovement(movementId, clientId, selectedId || null)
      // Ouvrir le PDF dans un nouvel onglet
      const qs = reprise ? `?reprise=${encodeURIComponent(reprise)}` : ''
      window.open(`/api/pdf/mouvement/${movementId}${qs}`, '_blank')
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="text-emerald-600 h-6 px-2 text-xs"
        onClick={handleOpen}
      >
        Valider
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              Valider la demande
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-0.5">{movementName}</p>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sélection du PC */}
              <div className="space-y-2">
                <p className="text-sm font-medium">PC attribué (optionnel)</p>
                {pcs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aucun PC enregistré pour ce client.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    <label className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedId === '' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}>
                      <input
                        type="radio"
                        name="pc"
                        value=""
                        checked={selectedId === ''}
                        onChange={() => setSelectedId('')}
                        className="accent-primary"
                      />
                      <span className="text-sm text-muted-foreground italic">— Aucun PC attribué</span>
                    </label>

                    {pcs.map((pc) => {
                      const Icon  = PC_ICON[pc.type] ?? Monitor
                      const label = [pc.brand, pc.model].filter(Boolean).join(' ') || pc.type
                      return (
                        <label
                          key={pc.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedId === pc.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pc"
                            value={pc.id}
                            checked={selectedId === pc.id}
                            onChange={() => setSelectedId(pc.id)}
                            className="accent-primary"
                          />
                          <Icon size={14} className="flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground flex gap-2">
                              <span>{pc.type}</span>
                              {pc.serialNumber && <span className="font-mono">{pc.serialNumber}</span>}
                              {pc.assignedTo && (
                                <span className="text-amber-600">
                                  Attribué à {pc.assignedTo.firstName} {pc.assignedTo.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Matériel en reprise */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Matériel en reprise</Label>
                <Input
                  value={reprise}
                  onChange={(e) => setReprise(e.target.value)}
                  placeholder="Ex : Dell Latitude 5520 — SN ABC123"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Matériel récupéré lors de cette prise en charge (facultatif).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isPending || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
              Valider et générer le PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
