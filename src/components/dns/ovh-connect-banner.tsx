'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveOvhConfig } from '@/actions/ovh'
import { Link2, ChevronDown } from 'lucide-react'

const ENDPOINTS = [
  { value: 'ovh-eu', label: 'OVH Europe (ovh-eu)' },
  { value: 'ovh-ca', label: 'OVH Canada (ovh-ca)' },
  { value: 'ovh-us', label: 'OVH US (ovh-us)' },
]

export function OvhConnectBanner({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const saveWithClientId = saveOvhConfig.bind(null, clientId)

  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Link2 size={14} className="text-primary" />
        <span>Connecter un compte OVH pour synchroniser les domaines</span>
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form action={saveWithClientId} className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ovh-endpoint" className="text-xs">Endpoint</Label>
              <select
                id="ovh-endpoint"
                name="endpoint"
                defaultValue="ovh-eu"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ENDPOINTS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-ak" className="text-xs">Application Key</Label>
              <Input id="ovh-ak" name="applicationKey" required className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-as" className="text-xs">Application Secret</Label>
              <Input id="ovh-as" name="applicationSecret" type="password" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovh-ck" className="text-xs">Consumer Key</Label>
              <Input id="ovh-ck" name="consumerKey" type="password" required className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <Button type="submit" size="sm">Connecter &amp; Synchroniser</Button>
            <a
              href="https://eu.api.ovh.com/createToken?GET=/me&GET=/domain/zone&GET=/domain/zone/*&GET=/domain/zone/*/record&GET=/domain/zone/*/record/*"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              Générer une Consumer Key OVH ↗
            </a>
            <p className="text-xs text-muted-foreground">Droits requis : GET /me · GET /domain/zone · GET /domain/zone/*</p>
          </div>
        </form>
      )}
    </div>
  )
}
