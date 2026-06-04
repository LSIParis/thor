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
import { NextcloudUsers } from './nextcloud-users'
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
                  <Label htmlFor={`s-pass-${service.id}`} className="text-xs">Mot de passe admin</Label>
                  <Input id={`s-pass-${service.id}`} name="adminPassword" type="password" className="h-7 text-sm" placeholder="Chiffré AES-256" />
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
            <div className="space-y-4">
              {service.servers.map((srv) => {
                const deleteServer = deleteNextcloudServer.bind(null, srv.id, clientId)
                return (
                  <div key={srv.id} className="rounded-md border border-border/60 p-3 bg-secondary/20">
                    {/* Infos serveur */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <a
                          href={srv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {srv.url} <ExternalLink size={10} />
                        </a>
                        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                          {srv.version && <span>v{srv.version}</span>}
                          {srv.adminUser && <span>Admin : <span className="font-mono">{srv.adminUser}</span></span>}
                          {srv.storageTotal && <span>Stockage : {srv.storageTotal}</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <form action={deleteServer} className="flex-shrink-0">
                          <Button variant="ghost" size="sm" type="submit" className="h-6 w-6 p-0 text-destructive">
                            <Trash2 size={11} />
                          </Button>
                        </form>
                      )}
                    </div>
                    {/* Utilisateurs Nextcloud via API */}
                    <NextcloudUsers
                      serverId={srv.id}
                      hasCredentials={!!(srv.adminUser && srv.adminPassword)}
                    />
                  </div>
                )
              })}
            </div>
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
