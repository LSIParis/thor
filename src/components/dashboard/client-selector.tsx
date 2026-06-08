'use client'

import { useRouter } from 'next/navigation'
import { Building2, ChevronDown } from 'lucide-react'

interface Client { id: string; name: string }

export function ClientSelector({ clients, selectedId }: { clients: Client[]; selectedId?: string }) {
  const router = useRouter()

  return (
    <div className="relative inline-flex items-center">
      <Building2 size={14} className="absolute left-3 text-muted-foreground pointer-events-none z-10" />
      <select
        value={selectedId ?? ''}
        onChange={(e) => {
          const val = e.target.value
          if (!val) { router.push('/dashboard'); return }
          router.push(`/dashboard?client=${val}`)
        }}
        className="pl-8 pr-8 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer min-w-[220px]"
      >
        <option value="">Tous les clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 text-muted-foreground pointer-events-none" />
    </div>
  )
}
