'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createDnsZone, deleteDnsZone, createDnsRecord, deleteDnsRecord,
  createSslCertificate, deleteSslCertificate,
  createHosting, deleteHosting,
  createRegistrar, deleteRegistrar,
} from '@/actions/dns'
import { Globe, Shield, Server, Trash2, Plus, ChevronDown, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RegistrarBanner } from './registrar-banner'
import type { Registrar, DnsZone, DnsRecord, SslCertificate, Hosting, RegistrarConfig } from '@prisma/client'

type ZoneWithRecords = DnsZone & { records: DnsRecord[] }
type RegistrarWithZones = Registrar & { dnsZones: ZoneWithRecords[] }

interface DnsPanelProps {
  clientId: string
  registrars: RegistrarWithZones[]
  certs: SslCertificate[]
  hostings: Hosting[]
  canEdit: boolean
  registrarConfigs: RegistrarConfig[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR']
const CERT_TYPES = ['DV', 'OV', 'EV', 'Wildcard', 'Multi-domaines']
const HOSTING_TYPES = ['Mutualisé', 'VPS', 'Dédié', 'Cloud', 'CDN', 'PaaS', 'Autre']

function daysUntil(date: Date | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ date }: { date: Date | null }) {
  const days = daysUntil(date)
  if (days === null) return null
  if (days < 0) return <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Expiré</Badge>
  if (days <= 30) return <Badge className="text-[10px] h-4 px-1.5 bg-yellow-600 text-white">{days}j</Badge>
  return <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{new Date(date!).toLocaleDateString('fr-FR')}</Badge>
}

// ── DNS Zones ─────────────────────────────────────────────────────────────────

const KNOWN_REGISTRARS = [
  'OVH', 'Gandi', 'LWS', 'Ionos', 'Infomaniak', 'Namecheap', 'GoDaddy',
  'Cloudflare', 'PlanetHoster', 'Amen', 'Online.net', 'Scaleway', 'Letshost', 'Hébergeur Europe',
]

function NewRegistrarDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  const name = isCustom ? customName : selected

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setIsCustom(val === '__custom__')
    setSelected(val === '__custom__' ? '' : val)
    setCustomName('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelected(''); setIsCustom(false); setCustomName('') } }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus size={14} className="mr-1.5" /> Nouveau registrar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouveau registrar</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => { await createRegistrar(clientId, fd); setOpen(false) }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Registrar *</Label>
            <select
              value={isCustom ? '__custom__' : selected}
              onChange={handleSelect}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required={!isCustom}
            >
              <option value="">— Choisir —</option>
              {KNOWN_REGISTRARS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__custom__">Autre…</option>
            </select>
            {isCustom
              ? <Input name="name" value={customName} onChange={e => setCustomName(e.target.value)}
                  required autoFocus placeholder="Nom du registrar…" className="h-8 text-sm" />
              : <input type="hidden" name="name" value={name} />
            }
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes <span className="text-muted-foreground">(optionnel)</span></Label>
            <Input name="notes" placeholder="Compte client, référence…" className="h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name}>Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DnsZonesTab({ clientId, registrars, canEdit }: { clientId: string; registrars: RegistrarWithZones[]; canEdit: boolean }) {
  const [zoneFormForRegistrar, setZoneFormForRegistrar] = useState<string | null>(null)

  return (
    <div>
      {canEdit && (
        <div className="mb-4 flex gap-2">
          <NewRegistrarDialog clientId={clientId} />
        </div>
      )}

      {registrars.length === 0 && (
        <p className="text-muted-foreground text-sm">Aucun registrar configuré.</p>
      )}

      {registrars.map(registrar => (
        <div key={registrar.id} className="mb-4 rounded-lg border border-border overflow-hidden">
          {/* En-tête registrar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-primary" />
              <span className="text-sm font-semibold">{registrar.name}</span>
              <span className="text-xs text-muted-foreground">— {registrar.dnsZones.length} domaine{registrar.dnsZones.length !== 1 ? 's' : ''}</span>
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => setZoneFormForRegistrar(zoneFormForRegistrar === registrar.id ? null : registrar.id)}>
                  <Plus size={12} className="mr-1" /> Domaine
                </Button>
                <form action={deleteRegistrar.bind(null, registrar.id, clientId)}>
                  <Button variant="ghost" size="sm" type="submit" className="text-destructive h-7 px-2"><Trash2 size={13} /></Button>
                </form>
              </div>
            )}
          </div>

          {/* Formulaire ajout zone */}
          {zoneFormForRegistrar === registrar.id && canEdit && (
            <form action={async (fd) => { await createDnsZone(registrar.id, fd); setZoneFormForRegistrar(null) }}
              className="p-4 border-b border-border bg-card space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Domaine *</Label>
                  <Input name="domain" required placeholder="lsiparis.fr" className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">NS (nameservers)</Label>
                  <Input name="nameservers" placeholder="ns1.ovh.net, ns2.ovh.net" className="h-8 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date d'enregistrement</Label>
                  <Input name="registrationDate" type="date" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date d'expiration</Label>
                  <Input name="expiryDate" type="date" className="h-8 text-sm" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id={`ar-${registrar.id}`} name="autoRenew" className="rounded" />
                  <Label htmlFor={`ar-${registrar.id}`} className="text-xs">Renouvellement auto</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setZoneFormForRegistrar(null)}>Annuler</Button>
              </div>
            </form>
          )}

          {/* Zones du registrar */}
          {registrar.dnsZones.length === 0 && zoneFormForRegistrar !== registrar.id && (
            <p className="text-muted-foreground text-xs italic px-4 py-3">Aucun domaine.</p>
          )}
          {registrar.dnsZones.map(zone => (
            <ZoneSection
              key={zone.id}
              zone={zone}
              clientId={clientId}
              canEdit={canEdit && zone.source === 'manual'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ZoneSection({ zone, clientId, canEdit }: { zone: ZoneWithRecords; clientId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(true)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string>('')
  const deleteZoneAction = deleteDnsZone.bind(null, zone.id, clientId)

  async function handleImport() {
    setImporting(true)
    setImportResult('')
    try {
      const res = await fetch(`/api/dns/${zone.id}/import`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setImportResult(`Erreur : ${data.error}`)
      } else {
        setImportResult(`${data.imported} enregistrements importés (${data.types?.join(', ')})`)
        // Refresh page to show new records
        window.location.reload()
      }
    } catch {
      setImportResult('Erreur réseau')
    }
    setImporting(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Globe size={14} className="text-primary" />
          <span className="font-mono">{zone.domain}</span>
          {zone.source !== 'manual'
            ? <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground uppercase">{zone.source}</Badge>
            : <Badge variant="outline" className="text-[10px] h-4 px-1.5">Manuel</Badge>
          }
          {zone.nameservers && <span className="text-xs text-muted-foreground font-mono font-normal hidden xl:inline">{zone.nameservers}</span>}
          <ExpiryBadge date={zone.expiryDate} />
          {zone.autoRenew && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Auto</Badge>}
        </button>
        {canEdit && (
          <form action={deleteZoneAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-destructive h-7 px-2"><Trash2 size={13} /></Button>
          </form>
        )}
      </div>

      {open && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enregistrements ({zone.records.length})</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-6 px-2 text-xs text-primary hover:text-primary"
                onClick={handleImport}
                disabled={importing}
                title="Récupérer automatiquement les enregistrements DNS via Google DNS"
              >
                <RefreshCw size={12} className={`mr-1 ${importing ? 'animate-spin' : ''}`} />
                {importing ? 'Import...' : 'Importer depuis DNS'}
              </Button>
              {canEdit && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowRecordForm(!showRecordForm)}>
                <Plus size={12} className="mr-1" /> Ajouter
              </Button>
              )}
            </div>
          </div>

          {importResult && (
            <p className={`text-xs mb-2 ${importResult.startsWith('Erreur') ? 'text-destructive' : 'text-primary'}`}>
              {importResult}
            </p>
          )}

          {showRecordForm && canEdit && (
            <form action={async (fd) => { await createDnsRecord(zone.id, clientId, fd); setShowRecordForm(false) }}
              className="mb-3 p-3 rounded-md bg-secondary/30 border border-border space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type *</Label>
                  <select name="type" required className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-7">
                    {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input name="name" required placeholder="@ ou sous-domaine" className="h-7 text-xs font-mono" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Valeur *</Label>
                  <Input name="value" required placeholder="192.168.1.1" className="h-7 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">TTL (s)</Label>
                  <Input name="ttl" type="number" placeholder="3600" className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priorité (MX)</Label>
                  <Input name="priority" type="number" placeholder="10" className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowRecordForm(false)}>Annuler</Button>
              </div>
            </form>
          )}

          {zone.records.length === 0
            ? <p className="text-muted-foreground text-xs italic">Aucun enregistrement</p>
            : (
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left text-muted-foreground font-medium py-1 pr-2 w-16">Type</th>
                  <th className="text-left text-muted-foreground font-medium py-1 pr-2">Nom</th>
                  <th className="text-left text-muted-foreground font-medium py-1 pr-2">Valeur</th>
                  <th className="text-left text-muted-foreground font-medium py-1 pr-2 w-16">TTL</th>
                  <th className="text-left text-muted-foreground font-medium py-1 w-12">Prio</th>
                  {canEdit && <th className="w-6" />}
                </tr></thead>
                <tbody>
                  {zone.records.map(r => {
                    const del = deleteDnsRecord.bind(null, r.id, clientId)
                    return (
                      <tr key={r.id} className="border-b border-border/40 last:border-0">
                        <td className="py-1 pr-2"><Badge variant="outline" className="text-[10px] h-4 px-1.5">{r.type}</Badge></td>
                        <td className="py-1 pr-2 font-mono text-primary">{r.name}</td>
                        <td className="py-1 pr-2 font-mono text-muted-foreground break-all">{r.value}</td>
                        <td className="py-1 pr-2 text-muted-foreground">{r.ttl ?? '—'}</td>
                        <td className="py-1 text-muted-foreground">{r.priority ?? '—'}</td>
                        {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-5 w-5 p-0 text-destructive"><Trash2 size={10} /></Button></form></td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  )
}

// ── SSL Certificates ──────────────────────────────────────────────────────────

function SslTab({ clientId, certs, canEdit }: { clientId: string; certs: SslCertificate[]; canEdit: boolean }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} className="mr-1.5" /> Nouveau certificat
          </Button>
        </div>
      )}

      {showForm && canEdit && (
        <form action={async (fd) => { await createSslCertificate(clientId, fd); setShowForm(false) }}
          className="mb-4 p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="text-sm font-semibold">Nouveau certificat SSL</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Domaine *</Label>
              <Input name="domain" required placeholder="*.lsiparis.fr" className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Émetteur</Label>
              <Input name="issuer" placeholder="Let's Encrypt, Sectigo..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select name="type" className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm h-8">
                <option value="">—</option>
                {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date d'émission</Label>
              <Input name="issuedDate" type="date" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date d'expiration</Label>
              <Input name="expiryDate" type="date" className="h-8 text-sm" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input type="checkbox" id="ar-cert" name="autoRenew" className="rounded" />
              <Label htmlFor="ar-cert" className="text-xs">Renouvellement auto</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {certs.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">Aucun certificat SSL configuré.</p>
      )}

      {certs.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Domaine</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Émetteur</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Type</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Émis le</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5">Expiration</th>
            {canEdit && <th className="w-8" />}
          </tr></thead>
          <tbody>
            {certs.map(c => {
              const del = deleteSslCertificate.bind(null, c.id, clientId)
              return (
                <tr key={c.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-xs font-medium">{c.domain}</td>
                  <td className="py-1.5 pr-4 text-xs text-muted-foreground">{c.issuer ?? '—'}</td>
                  <td className="py-1.5 pr-4">{c.type ? <Badge variant="outline" className="text-[10px] h-4 px-1.5">{c.type}</Badge> : '—'}</td>
                  <td className="py-1.5 pr-4 text-xs text-muted-foreground">{c.issuedDate ? new Date(c.issuedDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="py-1.5"><ExpiryBadge date={c.expiryDate} />{c.autoRenew && <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">Auto</Badge>}</td>
                  {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-6 w-6 p-0 text-destructive"><Trash2 size={11} /></Button></form></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Hosting ───────────────────────────────────────────────────────────────────

function HostingTab({ clientId, hostings, canEdit }: { clientId: string; hostings: Hosting[]; canEdit: boolean }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} className="mr-1.5" /> Nouvel hébergement
          </Button>
        </div>
      )}

      {showForm && canEdit && (
        <form action={async (fd) => { await createHosting(clientId, fd); setShowForm(false) }}
          className="mb-4 p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="text-sm font-semibold">Nouvel hébergement</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input name="name" required placeholder="Site principal" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select name="type" className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm h-8">
                <option value="">—</option>
                {HOSTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hébergeur</Label>
              <Input name="provider" placeholder="OVH, Scaleway, AWS..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input name="url" type="url" placeholder="https://..." className="h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adresse IP</Label>
              <Input name="ipAddress" className="h-8 text-sm font-mono" placeholder="1.2.3.4" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Offre / Plan</Label>
              <Input name="plan" placeholder="Pro, Business..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de renouvellement</Label>
              <Input name="renewalDate" type="date" className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Input name="notes" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {hostings.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">Aucun hébergement configuré.</p>
      )}

      {hostings.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-3">Nom</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-3">Type</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-3">Hébergeur</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-3">URL</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-3">IP</th>
            <th className="text-left text-xs text-muted-foreground font-medium py-1.5">Renouvellement</th>
            {canEdit && <th className="w-8" />}
          </tr></thead>
          <tbody>
            {hostings.map(h => {
              const del = deleteHosting.bind(null, h.id, clientId)
              return (
                <tr key={h.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-xs">{h.name}</td>
                  <td className="py-1.5 pr-3">{h.type ? <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{h.type}</Badge> : '—'}</td>
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">{h.provider ?? '—'}</td>
                  <td className="py-1.5 pr-3">
                    {h.url
                      ? <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-mono hover:underline flex items-center gap-0.5">{h.url}<ExternalLink size={10} /></a>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{h.ipAddress ?? '—'}</td>
                  <td className="py-1.5"><ExpiryBadge date={h.renewalDate} /></td>
                  {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-6 w-6 p-0 text-destructive"><Trash2 size={11} /></Button></form></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────

export function DnsPanel({ clientId, registrars, certs, hostings, canEdit, registrarConfigs }: DnsPanelProps) {
  const allZones = registrars.flatMap(r => r.dnsZones)
  const totalZones = allZones.length
  return (
    <div>
      {(canEdit || registrarConfigs.length > 0) && (
        <RegistrarBanner
          clientId={clientId}
          configs={registrarConfigs}
          dnsZones={allZones}
          canEdit={canEdit}
        />
      )}
      <Tabs defaultValue="zones">
        <TabsList className="mb-4">
          <TabsTrigger value="zones"><Globe size={13} className="mr-1.5" />Zones DNS ({totalZones})</TabsTrigger>
          <TabsTrigger value="ssl"><Shield size={13} className="mr-1.5" />Certificats SSL ({certs.length})</TabsTrigger>
          <TabsTrigger value="hosting"><Server size={13} className="mr-1.5" />Hébergements ({hostings.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="zones"><DnsZonesTab clientId={clientId} registrars={registrars} canEdit={canEdit} /></TabsContent>
        <TabsContent value="ssl"><SslTab clientId={clientId} certs={certs} canEdit={canEdit} /></TabsContent>
        <TabsContent value="hosting"><HostingTab clientId={clientId} hostings={hostings} canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  )
}
