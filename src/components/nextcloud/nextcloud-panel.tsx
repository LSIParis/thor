'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createNextcloudService, deleteNextcloudService,
  createNextcloudServer, deleteNextcloudServer,
} from '@/actions/nextcloud'
import { ChevronDown, ChevronRight, Server, Cloud, Trash2, Plus, ExternalLink } from 'lucide-react'
import type { NextcloudService, NextcloudServer } from '@prisma/client'

type ServiceWithServers = NextcloudService & { servers: NextcloudServer[] }

interface NextcloudPanelProps {
  clientId: string
  services: ServiceWithServers[]
  canEdit: boolean
}

function ServiceSection({ service, clientId, canEdit }: {
  service: ServiceWithServers
  clientId: string
  canEdit: boolean
}) {
  const [open, setOpen] = useState(true)
  const [showServerForm, setShowServerForm] = useState(false)
  const deleteServiceAction = deleteNextcloudService.bind(null, service.id, clientId)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
      {/* Service header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Cloud size={14} className="text-primary" />
          {service.name}
          <span className="text-xs text-muted-foreground font-normal font-mono">
            {service.servers.length} serveur{service.servers.length !== 1 ? 's' : ''}
          </span>
        </button>
        {canEdit && (
          <form action={deleteServiceAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-destructive h-7 px-2">
              <Trash2 size={13} />
            </Button>
          </form>
        )}
      </div>

      {open && (
        <div className="p-4">
          {/* Servers table */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Server size={12} /> Serveurs
            </div>
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowServerForm(!showServerForm)}>
                <Plus size={12} className="mr-1" /> Ajouter un serveur
              </Button>
            )}
          </div>

          {showServerForm && canEdit && (
            <form
              action={async (fd) => { await createNextcloudServer(service.id, clientId, fd); setShowServerForm(false) }}
              className="mb-4 p-3 rounded-md bg-secondary/30 border border-border space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor={`s-url-${service.id}`} className="text-xs">URL *</Label>
                  <Input id={`s-url-${service.id}`} name="url" placeholder="https://nextcloud.example.com" required className="h-7 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`s-ver-${service.id}`} className="text-xs">Version</Label>
                  <Input id={`s-ver-${service.id}`} name="version" placeholder="28.0.4" className="h-7 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`s-admin-${service.id}`} className="text-xs">Utilisateur admin</Label>
                  <Input id={`s-admin-${service.id}`} name="adminUser" placeholder="admin" className="h-7 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`s-storage-${service.id}`} className="text-xs">Stockage total</Label>
                  <Input id={`s-storage-${service.id}`} name="storageTotal" placeholder="500 Go" className="h-7 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`s-users-${service.id}`} className="text-xs">Nb utilisateurs</Label>
                  <Input id={`s-users-${service.id}`} name="userCount" type="number" min="0" className="h-7 text-sm" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor={`s-notes-${service.id}`} className="text-xs">Notes</Label>
                  <Input id={`s-notes-${service.id}`} name="notes" className="h-7 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowServerForm(false)}>Annuler</Button>
              </div>
            </form>
          )}

          {service.servers.length === 0 ? (
            <p className="text-muted-foreground text-xs italic">Aucun serveur configuré</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">URL</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Version</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Admin</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Stockage</th>
                  <th className="text-left text-xs text-muted-foreground font-medium py-1.5">Utilisateurs</th>
                  {canEdit && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {service.servers.map((srv) => {
                  const deleteServer = deleteNextcloudServer.bind(null, srv.id, clientId)
                  return (
                    <tr key={srv.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4">
                        <a
                          href={srv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {srv.url}
                          <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{srv.version ?? '—'}</td>
                      <td className="py-2 pr-4 text-xs font-mono text-muted-foreground">{srv.adminUser ?? '—'}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{srv.storageTotal ?? '—'}</td>
                      <td className="py-2 text-xs text-muted-foreground">{srv.userCount ?? '—'}</td>
                      {canEdit && (
                        <td>
                          <form action={deleteServer}>
                            <Button variant="ghost" size="sm" type="submit" className="h-6 w-6 p-0 text-destructive">
                              <Trash2 size={11} />
                            </Button>
                          </form>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {service.notes && (
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">{service.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function NextcloudPanel({ clientId, services, canEdit }: NextcloudPanelProps) {
  const [showServiceForm, setShowServiceForm] = useState(false)

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setShowServiceForm(!showServiceForm)}>
            <Plus size={14} className="mr-1.5" /> Nouveau service Nextcloud
          </Button>
        </div>
      )}

      {showServiceForm && canEdit && (
        <form
          action={async (fd) => { await createNextcloudService(clientId, fd); setShowServiceForm(false) }}
          className="mb-4 p-4 rounded-lg border border-border bg-card space-y-3"
        >
          <h3 className="text-sm font-semibold">Nouveau service Nextcloud</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nc-name" className="text-xs">Nom du service *</Label>
              <Input id="nc-name" name="name" placeholder="Nextcloud Production" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nc-notes" className="text-xs">Notes</Label>
              <Input id="nc-notes" name="notes" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowServiceForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {services.length === 0 && !showServiceForm && (
        <p className="text-muted-foreground text-sm">Aucun service Nextcloud configuré.</p>
      )}

      {services.map((s) => (
        <ServiceSection key={s.id} service={s} clientId={clientId} canEdit={canEdit} />
      ))}
    </div>
  )
}
