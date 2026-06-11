'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteM365TenantFromPage } from '@/actions/m365'

export function DeleteTenantButton({ tenantDbId, displayName }: { tenantDbId: string; displayName: string }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirm(true)}
        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-7 px-2"
        title={`Supprimer ${displayName}`}
      >
        <Trash2 size={13} />
      </Button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs bg-destructive/10 border border-destructive/30 rounded px-2 py-1">
      <span className="text-destructive font-medium">
        Supprimer <strong>{displayName}</strong> ?
        <span className="block font-normal text-destructive/80 mt-0.5">
          Action irréversible — tous les comptes, domaines et licences seront définitivement supprimés.
        </span>
      </span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => deleteM365TenantFromPage(tenantDbId))}
        className="h-6 px-2 text-xs shrink-0"
      >
        {pending ? '…' : 'Supprimer'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirm(false)}
        className="h-6 px-2 text-xs shrink-0"
      >
        Annuler
      </Button>
    </span>
  )
}
