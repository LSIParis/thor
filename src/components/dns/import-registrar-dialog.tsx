'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { createRegistrarFromPage } from '@/actions/dns'
import { saveRegistrarConfigFromDnsPage } from '@/actions/registrar'

// Registrars with API integration
const API_PROVIDERS: Record<string, string> = { OVH: 'ovh', Gandi: 'gandi', LWS: 'lws' }

const OVH_ENDPOINTS = [
  { value: 'ovh-eu', label: 'OVH Europe' },
  { value: 'ovh-ca', label: 'OVH Canada' },
  { value: 'ovh-us', label: 'OVH US' },
]

const ALL_REGISTRARS = [
  'OVH', 'Gandi', 'LWS',
  'Ionos', 'Infomaniak', 'Namecheap', 'GoDaddy',
  'Cloudflare', 'PlanetHoster', 'Amen', 'Online.net',
  'Scaleway', 'Letshost', 'Hébergeur Europe', 'Autre',
]

type Step = 'idle' | 'syncing' | 'ok' | 'error'

export function ImportRegistrarDialog({ clients, selectedClientId }: {
  clients: { id: string; name: string }[]
  selectedClientId?: string
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [customName, setCustomName] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [syncMsg, setSyncMsg] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const provider = API_PROVIDERS[selected] ?? null
  const isCustom = selected === 'Autre'
  const name = isCustom ? customName : selected

  function reset() {
    setSelected('')
    setCustomName('')
    setStep('idle')
    setSyncMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    const fd = new FormData(formRef.current!)

    const clientId = (fd.get('clientId') as string)

    if (provider) {
      // Save API credentials then trigger sync
      await saveRegistrarConfigFromDnsPage(clientId, provider, fd)
      setStep('syncing')
      try {
        const res = await fetch(`/api/registrar/${clientId}/${provider}/sync`, { method: 'POST' })
        const data = await res.json()
        if (res.ok) {
          setSyncMsg(`${data.zones} zone${data.zones !== 1 ? 's' : ''} importée${data.zones !== 1 ? 's' : ''} · ${data.records} enreg.`)
          setStep('ok')
        } else {
          setSyncMsg(data.error ?? 'Erreur inconnue')
          setStep('error')
        }
      } catch {
        setSyncMsg('Erreur réseau')
        setStep('error')
      }
    } else {
      // Manual registrar — just create the entity
      await createRegistrarFromPage(fd)
      setOpen(false)
      reset()
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      if (step === 'ok') window.location.reload()
      reset()
    }
    setOpen(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} className="mr-1.5" />
          Ajouter un registrar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un registrar</DialogTitle>
        </DialogHeader>

        {step === 'ok' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle size={32} className="text-primary" />
            <p className="text-sm font-medium">Registrar connecté et synchronisé</p>
            <p className="text-xs text-muted-foreground">{syncMsg}</p>
            <Button size="sm" onClick={() => handleClose(false)}>Fermer</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle size={32} className="text-destructive" />
            <p className="text-sm font-medium text-destructive">Erreur de synchronisation</p>
            <p className="text-xs text-muted-foreground">{syncMsg}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep('idle')}>Modifier</Button>
              <Button size="sm" variant="ghost" onClick={() => handleClose(false)}>Fermer</Button>
            </div>
          </div>
        )}

        {step === 'syncing' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <RefreshCw size={28} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Synchronisation en cours…</p>
          </div>
        )}

        {step === 'idle' && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Client */}
            {selectedClientId
              ? <input type="hidden" name="clientId" value={selectedClientId} />
              : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Client *</Label>
                  <select name="clientId" required
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )
            }

            {/* Registrar name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Registrar *</Label>
              <select
                value={selected}
                onChange={e => { setSelected(e.target.value); setCustomName('') }}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                required
              >
                <option value="">— Choisir —</option>
                {ALL_REGISTRARS.map(r => <option key={r} value={r}>{r}{API_PROVIDERS[r] ? ' ★ API' : ''}</option>)}
              </select>
              {isCustom && (
                <Input
                  name="name"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  required
                  placeholder="Nom du registrar…"
                  className="h-8 text-sm"
                  autoFocus
                />
              )}
              {!isCustom && <input type="hidden" name="name" value={name} />}
            </div>

            {/* ── OVH fields ── */}
            {provider === 'ovh' && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identifiants OVH API</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Endpoint</Label>
                    <select name="endpoint" defaultValue="ovh-eu"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
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
                  <a href="https://eu.api.ovh.com/createToken?GET=/me&GET=/domain/zone&GET=/domain/zone/*&GET=/domain/zone/*/record&GET=/domain/zone/*/record/*"
                    target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Générer une Consumer Key OVH ↗
                  </a>
                </p>
              </div>
            )}

            {/* ── Gandi fields ── */}
            {provider === 'gandi' && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identifiants Gandi API</p>
                <div className="space-y-1">
                  <Label className="text-xs">Clé API Gandi</Label>
                  <Input name="apiKey" type="password" required className="h-8 text-sm font-mono"
                    placeholder="Profil Gandi → Sécurité → Clé API" />
                </div>
              </div>
            )}

            {/* ── LWS fields ── */}
            {provider === 'lws' && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identifiants LWS API</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Code client LWS</Label>
                    <Input name="clientId" required className="h-8 text-sm font-mono" placeholder="ex: 584584" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Clé API LWS</Label>
                    <Input name="apiKey" type="password" required className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Domaines gérés <span className="text-muted-foreground">(un par ligne)</span></Label>
                  <textarea name="domains" required rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    placeholder="lsiparis.fr&#10;lsiparis.com" />
                  <p className="text-xs text-muted-foreground">LWS ne propose pas d'API de liste.</p>
                </div>
              </div>
            )}

            {/* Notes — only for manual registrars */}
            {!provider && selected && !isCustom && (
              <div className="space-y-1.5">
                <Label className="text-xs">Notes <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input name="notes" placeholder="Compte client, référence…" className="h-8 text-sm" />
              </div>
            )}
            {isCustom && (
              <div className="space-y-1.5">
                <Label className="text-xs">Notes <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input name="notes" placeholder="Compte client, référence…" className="h-8 text-sm" />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={!name}>
                {provider ? (
                  <><RefreshCw size={12} className="mr-1.5" />Connecter &amp; Synchroniser</>
                ) : 'Ajouter'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>Annuler</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
