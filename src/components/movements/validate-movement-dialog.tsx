'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Loader2, Monitor, Laptop, FileDown, Mail, AlertCircle, PenLine, Plus, X, Package } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientPCs, validateMovement } from '@/actions/movements'
import { DocusealSignForm } from './docuseal-sign-form'
import type { Accessory } from '@/lib/handover-html'

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

type Step = 'accessories' | 'form' | 'pending' | 'result'

type Result = {
  saved: boolean
  attributionPath: string | null
  reprisePath: string | null
  emailSent: boolean
  to: string | null
  signingUrl: string | null
} | null

export function ValidateMovementDialog({
  movementId,
  clientId,
  movementName,
  movementType,
  recipientEmail,
}: {
  movementId: string
  clientId: string
  movementName: string
  movementType: 'ENTREE' | 'SORTIE'
  recipientEmail?: string | null
}) {
  const [open, setOpen]                 = useState(false)
  const [step, setStep]                 = useState<Step>('accessories')
  const [pcs, setPcs]                   = useState<PC[]>([])
  const [loading, setLoading]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string>('')
  const [reprise, setReprise]           = useState('')
  const [accessories, setAccessories]   = useState<Accessory[]>([])
  const [newAccName, setNewAccName]     = useState('')
  const [newAccQty, setNewAccQty]       = useState('')
  const [result, setResult]             = useState<Result>(null)
  const [showSign, setShowSign]         = useState(false)
  const [isPending, start]              = useTransition()

  async function handleOpen() {
    setOpen(true)
    setStep(movementType === 'ENTREE' ? 'accessories' : 'form')
    setLoading(true)
    setSelectedId('')
    setReprise('')
    setAccessories([])
    setNewAccName('')
    setNewAccQty('')
    setResult(null)
    setShowSign(false)
    try {
      const data = await getClientPCs(clientId)
      setPcs(data)
    } finally {
      setLoading(false)
    }
  }

  function addAccessory() {
    const name = newAccName.trim()
    if (!name) return
    const qty = newAccQty ? parseInt(newAccQty, 10) : undefined
    setAccessories((prev) => [...prev, { name, qty: qty && qty > 1 ? qty : undefined }])
    setNewAccName('')
    setNewAccQty('')
  }

  function removeAccessory(idx: number) {
    setAccessories((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleConfirm() {
    start(async () => {
      const res = await validateMovement(movementId, clientId, selectedId || null, reprise, accessories)
      setResult(res)
      setStep('result')
    })
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
    setStep('accessories')
  }

  const isLoading = step === 'pending' || isPending

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

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              Valider la demande
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-0.5">{movementName}</p>
          </DialogHeader>

          {/* ── Envoi en cours ── */}
          {isPending ? (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <Loader2 size={28} className="animate-spin text-emerald-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Validation en cours…</p>
                <p className="text-xs text-muted-foreground">
                  Génération des bons et envoi du mail
                  {recipientEmail ? (
                    <> à <span className="font-mono text-foreground">{recipientEmail}</span></>
                  ) : null}
                </p>
              </div>
            </div>

          ) : step === 'result' && result ? (
            /* ── Résultat ── */
            <div className="py-4 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-700">Demande validée avec succès.</p>
              </div>

              {result.saved && result.attributionPath && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <FileDown size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700">Bon d'attribution enregistré</p>
                    <a
                      href={result.attributionPath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 text-xs mt-0.5 underline underline-offset-2 hover:text-blue-800"
                    >
                      Télécharger le bon d'attribution
                    </a>
                  </div>
                </div>
              )}

              {result.saved && result.reprisePath && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <FileDown size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-700">Bon de reprise enregistré</p>
                    <a
                      href={result.reprisePath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-600 text-xs mt-0.5 underline underline-offset-2 hover:text-orange-800"
                    >
                      Télécharger le bon de reprise
                    </a>
                  </div>
                </div>
              )}

              {result.emailSent ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Mail size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-emerald-700">
                      {result.signingUrl ? 'Lien de signature envoyé via DocuSeal' : 'Bon envoyé par e-mail (PDF)'}
                    </p>
                    <p className="text-emerald-600 text-xs mt-0.5">{result.to}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Aucune adresse e-mail renseignée — bon non envoyé.
                  </p>
                </div>
              )}

              {result.signingUrl ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <PenLine size={16} className="text-violet-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm flex-1">
                      <p className="font-medium text-violet-700">Demande de signature envoyée via DocuSeal</p>
                      <div className="flex items-center gap-4 mt-1">
                        <button
                          type="button"
                          onClick={() => setShowSign((v) => !v)}
                          className="text-violet-700 text-xs font-medium underline underline-offset-2 hover:text-violet-900"
                        >
                          {showSign ? 'Masquer le formulaire' : 'Signer maintenant'}
                        </button>
                        <a
                          href={result.signingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-600 text-xs underline underline-offset-2 hover:text-violet-800"
                        >
                          Ouvrir dans un onglet
                        </a>
                      </div>
                    </div>
                  </div>
                  {showSign && (
                    <div className="rounded-lg border overflow-y-auto max-h-[60vh]">
                      <DocusealSignForm
                        src={result.signingUrl}
                        email={result.to}
                        onComplete={() => setShowSign(false)}
                      />
                    </div>
                  )}
                </div>
              ) : result.emailSent ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    DocuSeal non configuré — signature électronique non créée.
                  </p>
                </div>
              ) : null}
            </div>

          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>

          ) : step === 'accessories' ? (
            /* ── Étape 1 : Accessoires sans sérialisation ── */
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700">
                <Package size={13} className="flex-shrink-0 mt-0.5" />
                <span>
                  Ajoutez ici les accessoires à attribuer <strong>sans numéro de série</strong>
                  {' '}(souris, clavier, chargeur, casque…).
                  Le matériel sérialisé (PC) sera sélectionné à l'étape suivante.
                </span>
              </div>

              {/* Liste des accessoires */}
              {accessories.length > 0 && (
                <ul className="space-y-1.5">
                  {accessories.map((acc, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm"
                    >
                      <span>
                        {acc.qty && acc.qty > 1 && (
                          <span className="font-mono text-xs text-muted-foreground mr-1.5">{acc.qty}×</span>
                        )}
                        {acc.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAccessory(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Ajout d'un accessoire */}
              <div className="flex gap-2">
                <Input
                  value={newAccQty}
                  onChange={(e) => setNewAccQty(e.target.value)}
                  placeholder="Qté"
                  type="number"
                  min="1"
                  className="text-sm w-16 shrink-0"
                  onKeyDown={(e) => { if (e.key === 'Enter') addAccessory() }}
                />
                <Input
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Ex : Souris sans fil, Chargeur USB-C…"
                  className="text-sm flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') addAccessory() }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAccessory}
                  disabled={!newAccName.trim()}
                  className="shrink-0"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>

          ) : (
            /* ── Étape 2 : PC + reprise ── */
            <div className="space-y-4">
              {!recipientEmail && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Aucune adresse e-mail renseignée — le bon sera généré mais <strong>aucun mail ne sera envoyé</strong>.
                    Renseignez l&apos;adresse sur la fiche avant de valider.
                  </span>
                </div>
              )}

              {/* Sélection du matériel */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Matériel attribué (optionnel)</p>
                {pcs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aucun matériel enregistré pour ce client.
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
                      <span className="text-sm text-muted-foreground italic">— Aucun matériel attribué</span>
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
                  Matériel récupéré lors de cette prise en charge (facultatif). Un bon de reprise séparé sera généré si renseigné.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            {step === 'result' ? (
              <Button type="button" size="sm" onClick={handleClose}>
                Fermer
              </Button>
            ) : step === 'accessories' ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep('form')}
                  disabled={loading}
                >
                  Suivant →
                </Button>
              </>
            ) : !isPending && !loading ? (
              <>
                {movementType === 'ENTREE' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('accessories')}
                  >
                    ← Retour
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
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
                  {isPending
                    ? <Loader2 size={13} className="animate-spin mr-1.5" />
                    : <FileDown size={13} className="mr-1.5" />}
                  Valider et générer les bons
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
