'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

type UpdateStatus = {
  current: string
  latest: string
  upToDate: boolean
  committedAt: string | null
}

export function UpdateBadge() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    fetch('/api/updates')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setStatus(data) })
      .catch(() => {})
  }, [])

  if (!status || status.upToDate) return null

  return (
    <a
      href="https://github.com/LSIParis/thor/commits/master"
      target="_blank"
      rel="noopener noreferrer"
      title={`Mise à jour disponible — commit ${status.latest}`}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-amber-500 hover:text-amber-400 transition-colors"
    >
      <RefreshCw size={10} className="flex-shrink-0" />
      <span>Mise à jour disponible</span>
    </a>
  )
}
