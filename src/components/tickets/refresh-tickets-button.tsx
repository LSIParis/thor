'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RefreshTicketsButton() {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [done, setDone] = useState(false)

  function handleRefresh() {
    setDone(false)
    start(() => {
      router.refresh()
      setDone(true)
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isPending}>
      {isPending
        ? <Loader2 size={14} className="mr-1.5 animate-spin" />
        : <RefreshCw size={14} className={`mr-1.5 ${done ? 'text-emerald-500' : ''}`} />}
      Synchroniser Zammad
    </Button>
  )
}
