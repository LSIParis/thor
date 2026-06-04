'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createVoipService, deleteVoipService,
  createVoipEquipment, deleteVoipEquipment,
  createVoipTrunk, deleteVoipTrunk,
  createVoipExtension, deleteVoipExtension,
} from '@/actions/voip'
import { ChevronDown, ChevronRight, Phone, Trash2, Plus, Server, Cable, PhoneCall } from 'lucide-react'
import type { VoipService, VoipEquipment, VoipTrunk, VoipExtension } from '@prisma/client'

type ServiceWithChildren = VoipService & {
  equipment: VoipEquipment[]
  trunks: VoipTrunk[]
  extensions: VoipExtension[]
}

const EQUIPMENT_TYPES = ['IPBX', 'Téléphone IP', 'Gateway', 'Switch PoE', 'Routeur', 'DECT', 'Autre']
const EXTENSION_TYPES = ['SIP', 'DECT', 'Softphone', 'Analogique', 'Autre']

// Inline form toggle + table helper
function Section({ title, icon: Icon, count, canEdit, form, children }: {
  title: string; icon: React.ElementType; count: number
  canEdit: boolean; form: React.ReactNode; children: React.ReactNode
}) {
  const [showForm, setShowForm] = useState(false)
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Icon size={12} /> {title} ({count})
        </div>
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowForm(!showForm)}>
            <Plus size={12} className="mr-1" /> Ajouter
          </Button>
        )}
      </div>
      {showForm && canEdit && (
        <div className="mb-3 p-3 rounded-md bg-secondary/30 border border-border">
          {form}
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs mt-2" onClick={() => setShowForm(false)}>Annuler</Button>
        </div>
      )}
      {children}
    </div>
  )
}

function ServiceSection({ service, clientId, canEdit }: {
  service: ServiceWithChildren; clientId: string; canEdit: boolean
}) {
  const [open, setOpen] = useState(true)
  const deleteAction = deleteVoipService.bind(null, service.id, clientId)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Phone size={14} className="text-primary" />
          {service.name}
          {service.provider && <span className="text-xs text-muted-foreground font-normal">— {service.provider}</span>}
        </button>
        {canEdit && (
          <form action={deleteAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-destructive h-7 px-2"><Trash2 size={13} /></Button>
          </form>
        )}
      </div>

      {open && (
        <div className="p-4 space-y-2">

          {/* ── ÉQUIPEMENTS ── */}
          <Section title="Équipements" icon={Server} count={service.equipment.length} canEdit={canEdit}
            form={
              <form action={async (fd) => { await createVoipEquipment(service.id, clientId, fd) }} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type *</Label>
                    <select name="type" required className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-7">
                      {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marque</Label>
                    <Input name="brand" className="h-7 text-xs" placeholder="Yealink" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modèle</Label>
                    <Input name="model" className="h-7 text-xs" placeholder="T54W" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Adresse MAC</Label>
                    <Input name="macAddress" className="h-7 text-xs font-mono" placeholder="00:11:22:33:44:55" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Adresse IP</Label>
                    <Input name="ipAddress" className="h-7 text-xs font-mono" placeholder="192.168.1.x" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input name="notes" className="h-7 text-xs" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
              </form>
            }
          >
            {service.equipment.length === 0
              ? <p className="text-muted-foreground text-xs italic">Aucun équipement</p>
              : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Type</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Marque / Modèle</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">MAC</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5">IP</th>
                    {canEdit && <th className="w-6" />}
                  </tr></thead>
                  <tbody>
                    {service.equipment.map(e => {
                      const del = deleteVoipEquipment.bind(null, e.id, clientId)
                      return (
                        <tr key={e.id} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3"><Badge variant="secondary" className="text-[10px] h-4 px-1.5">{e.type}</Badge></td>
                          <td className="py-1.5 pr-3 font-medium">{[e.brand, e.model].filter(Boolean).join(' ') || '—'}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted-foreground">{e.macAddress ?? '—'}</td>
                          <td className="py-1.5 font-mono text-muted-foreground">{e.ipAddress ?? '—'}</td>
                          {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-5 w-5 p-0 text-destructive"><Trash2 size={10} /></Button></form></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
          </Section>

          {/* ── TRUNKS ── */}
          <Section title="Trunks SIP" icon={Cable} count={service.trunks.length} canEdit={canEdit}
            form={
              <form action={async (fd) => { await createVoipTrunk(service.id, clientId, fd) }} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom *</Label>
                    <Input name="name" required className="h-7 text-xs" placeholder="Trunk principal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Opérateur</Label>
                    <Input name="provider" className="h-7 text-xs" placeholder="OVH Telecom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nb canaux</Label>
                    <Input name="channels" type="number" min="1" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Serveur SIP</Label>
                    <Input name="sipServer" className="h-7 text-xs font-mono" placeholder="sip.example.com" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Utilisateur SIP</Label>
                    <Input name="sipUser" className="h-7 text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input name="notes" className="h-7 text-xs" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
              </form>
            }
          >
            {service.trunks.length === 0
              ? <p className="text-muted-foreground text-xs italic">Aucun trunk</p>
              : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Nom</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Opérateur</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Serveur SIP</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">User SIP</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5">Canaux</th>
                    {canEdit && <th className="w-6" />}
                  </tr></thead>
                  <tbody>
                    {service.trunks.map(t => {
                      const del = deleteVoipTrunk.bind(null, t.id, clientId)
                      return (
                        <tr key={t.id} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3 font-medium">{t.name}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{t.provider ?? '—'}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted-foreground">{t.sipServer ?? '—'}</td>
                          <td className="py-1.5 pr-3 font-mono text-muted-foreground">{t.sipUser ?? '—'}</td>
                          <td className="py-1.5 text-muted-foreground">{t.channels ?? '—'}</td>
                          {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-5 w-5 p-0 text-destructive"><Trash2 size={10} /></Button></form></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
          </Section>

          {/* ── EXTENSIONS ── */}
          <Section title="Extensions" icon={PhoneCall} count={service.extensions.length} canEdit={canEdit}
            form={
              <form action={async (fd) => { await createVoipExtension(service.id, clientId, fd) }} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Numéro *</Label>
                    <Input name="number" required className="h-7 text-xs font-mono" placeholder="100" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input name="name" className="h-7 text-xs" placeholder="Marie Dupont" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <select name="type" className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs h-7">
                      <option value="">—</option>
                      {EXTENSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Appareil</Label>
                    <Input name="device" className="h-7 text-xs" placeholder="Yealink T54W" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input name="notes" className="h-7 text-xs" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
              </form>
            }
          >
            {service.extensions.length === 0
              ? <p className="text-muted-foreground text-xs italic">Aucune extension</p>
              : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">N°</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Nom</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5 pr-3">Type</th>
                    <th className="text-left text-muted-foreground font-medium py-1.5">Appareil</th>
                    {canEdit && <th className="w-6" />}
                  </tr></thead>
                  <tbody>
                    {service.extensions.map(x => {
                      const del = deleteVoipExtension.bind(null, x.id, clientId)
                      return (
                        <tr key={x.id} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3 font-mono font-bold text-primary">{x.number}</td>
                          <td className="py-1.5 pr-3 font-medium">{x.name ?? '—'}</td>
                          <td className="py-1.5 pr-3">
                            {x.type ? <Badge variant="outline" className="text-[10px] h-4 px-1.5">{x.type}</Badge> : '—'}
                          </td>
                          <td className="py-1.5 text-muted-foreground">{x.device ?? '—'}</td>
                          {canEdit && <td><form action={del}><Button variant="ghost" size="sm" type="submit" className="h-5 w-5 p-0 text-destructive"><Trash2 size={10} /></Button></form></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
          </Section>

          {service.notes && (
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">{service.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function VoipPanel({ clientId, services, canEdit }: {
  clientId: string; services: ServiceWithChildren[]; canEdit: boolean
}) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} className="mr-1.5" /> Nouveau service VoIP
          </Button>
        </div>
      )}

      {showForm && canEdit && (
        <form
          action={async (fd) => { await createVoipService(clientId, fd); setShowForm(false) }}
          className="mb-4 p-4 rounded-lg border border-border bg-card space-y-3"
        >
          <h3 className="text-sm font-semibold">Nouveau service VoIP</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="v-name" className="text-xs">Nom *</Label>
              <Input id="v-name" name="name" placeholder="IPBX Principal" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v-provider" className="text-xs">Opérateur / Marque</Label>
              <Input id="v-provider" name="provider" placeholder="3CX, Asterisk, OVH..." className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="v-notes" className="text-xs">Notes</Label>
              <Input id="v-notes" name="notes" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {services.length === 0 && !showForm && (
        <p className="text-muted-foreground text-sm">Aucun service VoIP configuré.</p>
      )}

      {services.map(s => (
        <ServiceSection key={s.id} service={s} clientId={clientId} canEdit={canEdit} />
      ))}
    </div>
  )
}
