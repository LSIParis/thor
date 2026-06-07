'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { ReconcileDialog } from './reconcile-dialog'

export function SyncButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw size={15} className="mr-1.5" />
        Synchroniser
      </Button>
      {open && <ReconcileDialog onClose={() => setOpen(false)} />}
    </>
  )
}
