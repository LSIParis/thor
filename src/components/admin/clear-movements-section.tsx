'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearAllMovements } from '@/actions/admin'

export function ClearMovementsSection() {
  const [step, setStep]     = useState<'idle' | 'confirm1' | 'confirm2'>('idle')
  const [result, setResult] = useState<{ deleted?: number; error?: string } | null>(null)
  const [isPending, start]  = useTransition()

  function handleClear() {
    start(async () => {
      const res = await clearAllMovements()
      setResult(res)
      setStep('idle')
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-xs text-destructive">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Cette action <strong>supprime définitivement</strong> tous les mouvements de personnel
          (entrées et sorties). Elle est <strong>irréversible</strong>.
          Pensez à effectuer un backup avant.
        </span>
      </div>

      <div className="flex items-center gap-2">
        {step === 'idle' && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => { setResult(null); setStep('confirm1') }}
          >
            <Trash2 size={14} />
            Vider la table Entrées / Sorties
          </Button>
        )}

        {step === 'confirm1' && (
          <>
            <span className="text-xs text-muted-foreground">Êtes-vous sûr ?</span>
            <Button variant="destructive" size="sm" onClick={() => setStep('confirm2')}>
              Oui, continuer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>
              Annuler
            </Button>
          </>
        )}

        {step === 'confirm2' && (
          <>
            <span className="text-xs font-medium text-destructive">
              Dernière confirmation — toutes les données seront perdues.
            </span>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleClear}
            >
              {isPending ? 'Suppression…' : 'Confirmer la suppression'}
            </Button>
            <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStep('idle')}>
              Annuler
            </Button>
          </>
        )}
      </div>

      {result?.deleted !== undefined && (
        <p className="text-xs text-green-600">
          {result.deleted} mouvement{result.deleted !== 1 ? 's' : ''} supprimé{result.deleted !== 1 ? 's' : ''}.
        </p>
      )}
      {result?.error && (
        <p className="text-xs text-destructive">Erreur : {result.error}</p>
      )}
    </div>
  )
}
