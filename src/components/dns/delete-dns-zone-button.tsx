'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteDnsZoneFromPage } from '@/actions/dns'

export function DeleteDnsZoneButton({ zoneId, domain }: { zoneId: string; domain: string }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-muted-foreground hover:text-destructive transition-colors"
        title={`Supprimer ${domain}`}
      >
        <Trash2 size={13} />
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <button
        disabled={pending}
        onClick={() => start(() => deleteDnsZoneFromPage(zoneId))}
        className="text-destructive font-medium hover:underline disabled:opacity-50"
      >
        {pending ? '…' : 'Confirmer'}
      </button>
      <span className="text-muted-foreground">/</span>
      <button
        onClick={() => setConfirm(false)}
        className="text-muted-foreground hover:text-foreground"
      >
        Annuler
      </button>
    </span>
  )
}
