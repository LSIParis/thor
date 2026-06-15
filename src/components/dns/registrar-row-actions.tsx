'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { updateRegistrarFromPage, deleteRegistrarFromPage } from '@/actions/dns'

const KNOWN_REGISTRARS = [
  'OVH', 'Gandi', 'LWS', 'Ionos', 'Infomaniak', 'Namecheap', 'GoDaddy',
  'Cloudflare', 'PlanetHoster', 'Amen', 'Online.net', 'Scaleway',
  'Letshost', 'Hébergeur Europe',
]

export function RegistrarRowActions({ registrarId, name }: { registrarId: string; name: string }) {
  const [mode, setMode] = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [editName, setEditName] = useState(name)
  const [isCustom, setIsCustom] = useState(!KNOWN_REGISTRARS.includes(name))

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setIsCustom(val === '__custom__')
    if (val !== '__custom__') setEditName(val)
  }

  if (mode === 'edit') {
    return (
      <form
        action={async (fd) => { await updateRegistrarFromPage(registrarId, fd); setMode('idle') }}
        className="flex items-center gap-1.5"
        onClick={e => e.stopPropagation()}
      >
        <select
          defaultValue={KNOWN_REGISTRARS.includes(name) ? name : '__custom__'}
          onChange={handleSelectChange}
          className="rounded border border-input bg-background px-2 py-0.5 text-xs h-6"
        >
          {KNOWN_REGISTRARS.map(r => <option key={r} value={r}>{r}</option>)}
          <option value="__custom__">Autre…</option>
        </select>
        {isCustom
          ? <Input name="name" value={editName} onChange={e => setEditName(e.target.value)}
              required className="h-6 text-xs w-32 font-mono" />
          : <input type="hidden" name="name" value={editName} />
        }
        <Button type="submit" size="sm" variant="ghost" className="h-6 w-6 p-0 text-primary">
          <Check size={12} />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0"
          onClick={() => { setMode('idle'); setEditName(name) }}>
          <X size={12} />
        </Button>
      </form>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <span className="text-xs text-destructive font-medium">Supprimer ?</span>
        <form action={async () => { await deleteRegistrarFromPage(registrarId) }}>
          <Button type="submit" size="sm" variant="destructive" className="h-6 px-2 text-xs">
            Confirmer
          </Button>
        </form>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
          onClick={() => setMode('idle')}>
          Annuler
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setMode('edit')} title="Éditer">
        <Pencil size={11} />
      </Button>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => setMode('confirm-delete')} title="Supprimer">
        <Trash2 size={11} />
      </Button>
    </div>
  )
}
