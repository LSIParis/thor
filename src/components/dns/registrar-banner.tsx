'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { saveRegistrarConfig, deleteRegistrarConfig } from '@/actions/registrar'
import { Link2, RefreshCw, Settings, CheckCircle, ChevronDown } from 'lucide-react'
import type { RegistrarConfig } from '@prisma/client'

const OVH_ENDPOINTS = [
  { value: 'ovh-eu', label: 'OVH Europe' },
  { value: 'ovh-ca', label: 'OVH Canada' },
  { value: 'ovh-us', label: 'OVH US' },
]

const PROVIDER_LABELS: Record<string, string> = { ovh: 'OVH', gandi: 'Gandi', lws: 'LWS' }

// ── Connect form ──────────────────────────────────────────

function ConnectForm({ provider, clientId, onClose }: { provider: string; clientId: string; onClose: () => void }) {
  const save = saveRegistrarConfig.bind(null, clientId, provider)

  return (
    <form action={save} className="space-y-3 pt-3 border-t border-border">
      {provider === 'ovh' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Endpoint</Label>
              <select name="endpoint" defaultValue="ovh-eu" className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                {OVH_ENDPOINTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Application Key</Label>
              <Input name="applicationKey" required className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Application Secret</Label>
              <Input name="applicationSecret" type="password" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Consumer Key</Label>
              <Input name="consumerKey" type="password" required className="h-8 text-sm" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Droits requis : GET /domain/zone, GET /domain/zone/* ·{' '}
            <a href="https://eu.api.ovh.com/createToken?GET=/me&GET=/domain/zone&GET=/domain/zone/*&GET=/domain/zone/*/record&GET=/domain/zone/*/record/*"
              target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Générer une Consumer Key ↗
            </a>
          </p>
        </>
      )}

      {provider === 'gandi' && (
        <div className="space-y-1 max-w-sm">
          <Label className="text-xs">Clé API Gandi</Label>
          <Input name="apiKey" type="password" required className="h-8 text-sm font-mono" placeholder="Profil Gandi → Sécurité → Clé API" />
        </div>
      )}

      {provider === 'lws' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Code client LWS</Label>
            <Input name="clientId" required className="h-8 text-sm font-mono" placeholder="ex: 584584" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Clé API LWS</Label>
            <Input name="apiKey" type="password" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Domaines gérés <span className="text-muted-foreground">(un par ligne ou séparés par virgule)</span></Label>
            <textarea name="domains" required rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[64px]"
              placeholder="lsiparis.fr&#10;lsiparis.com&#10;autre-domaine.fr" />
            <p className="text-xs text-muted-foreground">LWS ne propose pas d'API de liste — saisissez vos domaines manuellement.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm">Connecter &amp; Synchroniser</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <span className="text-xs text-muted-foreground self-center">Secrets chiffrés AES-256.</span>
      </div>
    </form>
  )
}

// ── Status bar for a connected provider ──────────────────

function ProviderStatus({ config, zonesCount, onSync, syncing, syncResult }: {
  config: RegistrarConfig; zonesCount: number; onSync: () => void; syncing: boolean; syncResult: string
}) {
  const [showSettings, setShowSettings] = useState(false)
  const del = deleteRegistrarConfig.bind(null, config.clientId, config.provider)
  const label = PROVIDER_LABELS[config.provider] ?? config.provider

  function formatLastSync(date: Date | null): string {
    if (!date) return 'jamais'
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (diff < 1) return "à l'instant"
    if (diff < 60) return `il y a ${diff} min`
    return `il y a ${Math.floor(diff / 60)}h`
  }

  return (
    <div className="rounded-md border border-border bg-card/50 px-3 py-2 mb-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-primary flex-shrink-0" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">· sync {formatLastSync(config.lastSyncAt)}</span>
          {syncResult && (
            <span className={`text-xs ${syncResult.startsWith('Erreur') ? 'text-destructive' : 'text-primary'}`}>— {syncResult}</span>
          )}
          <Badge variant="secondary" className="text-xs">{zonesCount} zones</Badge>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSync} disabled={syncing}>
            <RefreshCw size={11} className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={12} />
          </Button>
        </div>
      </div>
      {showSettings && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-3">
          <p className="text-xs text-muted-foreground flex-1">
            {config.provider === 'lws' && config.login && `Client : ${config.login} · `}
            {config.provider === 'ovh' && config.login && `Endpoint : ${config.login} · `}
            {config.apiKey && `Key : ${config.apiKey}`}
          </p>
          <form action={del}>
            <Button variant="destructive" size="sm" className="h-7 text-xs">Déconnecter</Button>
          </form>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────

interface RegistrarBannerProps {
  clientId: string
  configs: RegistrarConfig[]
  dnsZones: { source: string }[]
  canEdit: boolean
}

const ALL_PROVIDERS = ['ovh', 'gandi', 'lws'] as const

export function RegistrarBanner({ clientId, configs, dnsZones, canEdit }: RegistrarBannerProps) {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [syncResults, setSyncResults] = useState<Record<string, string>>({})
  const [addingProvider, setAddingProvider] = useState<string | null>(null)

  const connectedProviders = configs.map(c => c.provider)
  const unconnectedProviders = ALL_PROVIDERS.filter(p => !connectedProviders.includes(p))

  async function handleSync(provider: string) {
    setSyncing(s => ({ ...s, [provider]: true }))
    setSyncResults(r => ({ ...r, [provider]: '' }))
    try {
      const res  = await fetch(`/api/registrar/${clientId}/${provider}/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResults(r => ({ ...r, [provider]: `Erreur : ${data.error}` }))
      } else {
        setSyncResults(r => ({ ...r, [provider]: `${data.zones} zones · ${data.records} enreg.` }))
        window.location.reload()
      }
    } catch {
      setSyncResults(r => ({ ...r, [provider]: 'Erreur réseau' }))
    }
    setSyncing(s => ({ ...s, [provider]: false }))
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registrars connectés</span>
        {canEdit && unconnectedProviders.length > 0 && (
          <div className="flex gap-1">
            {unconnectedProviders.map(p => (
              <Button key={p} variant="ghost" size="sm" className="h-6 text-xs px-2"
                onClick={() => setAddingProvider(addingProvider === p ? null : p)}>
                <Link2 size={10} className="mr-1" /> {PROVIDER_LABELS[p]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Connected providers */}
      {configs.map(config => (
        <ProviderStatus
          key={config.provider}
          config={config}
          zonesCount={dnsZones.filter(z => z.source === config.provider).length}
          onSync={() => handleSync(config.provider)}
          syncing={syncing[config.provider] ?? false}
          syncResult={syncResults[config.provider] ?? ''}
        />
      ))}

      {/* Connect form for a new provider */}
      {addingProvider && canEdit && (
        <ConnectForm
          provider={addingProvider}
          clientId={clientId}
          onClose={() => setAddingProvider(null)}
        />
      )}

      {/* Empty state */}
      {configs.length === 0 && !addingProvider && (
        <p className="text-xs text-muted-foreground">
          Aucun registrar connecté. Cliquez sur OVH, Gandi ou LWS pour synchroniser vos domaines.
        </p>
      )}
    </div>
  )
}
