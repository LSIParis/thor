'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteOvhConfig } from '@/actions/ovh'
import { RefreshCw, Settings, CheckCircle } from 'lucide-react'
import type { OvhConfig } from '@prisma/client'

function formatLastSync(date: Date | null): string {
  if (!date) return 'jamais'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (diff < 1) return "à l'instant"
  if (diff < 60) return `il y a ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

interface OvhStatusBannerProps {
  clientId: string
  config: OvhConfig
  zonesCount: number
  recordsCount: number
}

export function OvhStatusBanner({ clientId, config, zonesCount, recordsCount }: OvhStatusBannerProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const deleteWithClientId = deleteOvhConfig.bind(null, clientId)

  async function handleSync() {
    setSyncing(true)
    setSyncResult('')
    try {
      const res = await fetch(`/api/ovh/${clientId}/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResult(`Erreur : ${data.error}`)
      } else {
        setSyncResult(`${data.zones} zones · ${data.records} enregistrements`)
        window.location.reload()
      }
    } catch {
      setSyncResult('Erreur réseau')
    }
    setSyncing(false)
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <CheckCircle size={14} className="text-primary flex-shrink-0" />
          <span className="text-sm font-medium">OVH connecté</span>
          <span className="text-xs text-muted-foreground">
            · Sync {formatLastSync(config.lastSyncAt)}
          </span>
          {syncResult && (
            <span className={`text-xs ${syncResult.startsWith('Erreur') ? 'text-destructive' : 'text-primary'}`}>
              — {syncResult}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {zonesCount} zones · {recordsCount} enreg.
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline" size="sm" className="h-7 text-xs"
            onClick={handleSync} disabled={syncing}
          >
            <RefreshCw size={12} className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => setShowSettings(!showSettings)} title="Paramètres OVH"
          >
            <Settings size={13} />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
          <p className="text-xs text-muted-foreground flex-1">
            Endpoint : <span className="font-mono">{config.endpoint}</span> ·
            App Key : <span className="font-mono">{config.applicationKey}</span>
          </p>
          <form action={deleteWithClientId}>
            <Button variant="destructive" size="sm" className="h-7 text-xs" type="submit">
              Déconnecter OVH
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
