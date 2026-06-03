'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createM365Tenant, deleteM365Tenant,
  createM365Domain, deleteM365Domain,
  createM365Account, deleteM365Account,
} from '@/actions/m365'
import { ChevronDown, ChevronRight, Globe, Users, Building2, Trash2, Plus } from 'lucide-react'
import type { M365Tenant, M365Domain, M365Account } from '@prisma/client'

type TenantWithRelations = M365Tenant & {
  domains: M365Domain[]
  accounts: M365Account[]
}

interface M365PanelProps {
  clientId: string
  tenants: TenantWithRelations[]
  canEdit: boolean
}

function TenantSection({ tenant, clientId, canEdit }: {
  tenant: TenantWithRelations
  clientId: string
  canEdit: boolean
}) {
  const [open, setOpen] = useState(true)
  const [showDomainForm, setShowDomainForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)

  const deleteTenantAction = deleteM365Tenant.bind(null, tenant.id, clientId)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
      {/* Tenant header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Building2 size={14} className="text-primary" />
          {tenant.displayName}
          {tenant.tenantId && (
            <span className="text-xs text-muted-foreground font-mono font-normal">
              {tenant.tenantId}
            </span>
          )}
        </button>
        {canEdit && (
          <form action={deleteTenantAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-destructive h-7 px-2">
              <Trash2 size={13} />
            </Button>
          </form>
        )}
      </div>

      {open && (
        <div className="p-4 space-y-5">
          {/* Domains table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Globe size={12} /> Domaines gérés
              </div>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowDomainForm(!showDomainForm)}>
                  <Plus size={12} className="mr-1" /> Ajouter
                </Button>
              )}
            </div>

            {showDomainForm && canEdit && (
              <form
                action={async (fd) => { await createM365Domain(tenant.id, clientId, fd); setShowDomainForm(false) }}
                className="mb-3 p-3 rounded-md bg-secondary/30 border border-border space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label htmlFor={`d-domain-${tenant.id}`} className="text-xs">Domaine *</Label>
                    <Input id={`d-domain-${tenant.id}`} name="domain" placeholder="contoso.com" required className="h-7 text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`d-default-${tenant.id}`} name="isDefault" className="rounded" />
                  <Label htmlFor={`d-default-${tenant.id}`} className="text-xs">Domaine principal</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowDomainForm(false)}>Annuler</Button>
                </div>
              </form>
            )}

            {tenant.domains.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">Aucun domaine</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Domaine</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5">Type</th>
                    {canEdit && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {tenant.domains.map((d) => {
                    const deleteDomain = deleteM365Domain.bind(null, d.id, clientId)
                    return (
                      <tr key={d.id} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-4 font-mono text-xs">{d.domain}</td>
                        <td className="py-1.5">
                          {d.isDefault
                            ? <Badge variant="default" className="text-[10px] h-4 px-1.5">Principal</Badge>
                            : <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Alias</Badge>
                          }
                        </td>
                        {canEdit && (
                          <td>
                            <form action={deleteDomain}>
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
          </div>

          {/* Accounts table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Users size={12} /> Comptes ({tenant.accounts.length})
              </div>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowAccountForm(!showAccountForm)}>
                  <Plus size={12} className="mr-1" /> Ajouter
                </Button>
              )}
            </div>

            {showAccountForm && canEdit && (
              <form
                action={async (fd) => { await createM365Account(tenant.id, clientId, fd); setShowAccountForm(false) }}
                className="mb-3 p-3 rounded-md bg-secondary/30 border border-border space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`a-name-${tenant.id}`} className="text-xs">Nom affiché *</Label>
                    <Input id={`a-name-${tenant.id}`} name="displayName" required className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`a-upn-${tenant.id}`} className="text-xs">Email (UPN) *</Label>
                    <Input id={`a-upn-${tenant.id}`} name="userPrincipalName" type="email" required className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`a-title-${tenant.id}`} className="text-xs">Fonction</Label>
                    <Input id={`a-title-${tenant.id}`} name="jobTitle" className="h-7 text-sm" />
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <input type="checkbox" id={`a-lic-${tenant.id}`} name="licensed" defaultChecked className="rounded" />
                    <Label htmlFor={`a-lic-${tenant.id}`} className="text-xs">Licence active</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="h-7 text-xs">Enregistrer</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAccountForm(false)}>Annuler</Button>
                </div>
              </form>
            )}

            {tenant.accounts.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">Aucun compte</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Nom</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Email / UPN</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5 pr-4">Fonction</th>
                    <th className="text-left text-xs text-muted-foreground font-medium py-1.5">Licence</th>
                    {canEdit && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {tenant.accounts.map((a) => {
                    const deleteAccount = deleteM365Account.bind(null, a.id, clientId)
                    return (
                      <tr key={a.id} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-4 font-medium text-xs">{a.displayName}</td>
                        <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">{a.userPrincipalName}</td>
                        <td className="py-1.5 pr-4 text-xs text-muted-foreground">{a.jobTitle ?? '—'}</td>
                        <td className="py-1.5">
                          {a.licensed
                            ? <Badge variant="default" className="text-[10px] h-4 px-1.5">Actif</Badge>
                            : <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Sans licence</Badge>
                          }
                        </td>
                        {canEdit && (
                          <td>
                            <form action={deleteAccount}>
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
          </div>
        </div>
      )}
    </div>
  )
}

export function M365Panel({ clientId, tenants, canEdit }: M365PanelProps) {
  const [showTenantForm, setShowTenantForm] = useState(false)

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setShowTenantForm(!showTenantForm)}>
            <Plus size={14} className="mr-1.5" /> Nouveau tenant
          </Button>
        </div>
      )}

      {showTenantForm && canEdit && (
        <form
          action={async (fd) => { await createM365Tenant(clientId, fd); setShowTenantForm(false) }}
          className="mb-4 p-4 rounded-lg border border-border bg-card space-y-3"
        >
          <h3 className="text-sm font-semibold">Nouveau tenant Microsoft 365</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="t-name" className="text-xs">Nom affiché *</Label>
              <Input id="t-name" name="displayName" placeholder="Contoso" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="t-id" className="text-xs">Tenant ID (GUID)</Label>
              <Input id="t-id" name="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="h-8 text-sm font-mono" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="t-notes" className="text-xs">Notes</Label>
            <Input id="t-notes" name="notes" className="h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Enregistrer</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowTenantForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {tenants.length === 0 && !showTenantForm && (
        <p className="text-muted-foreground text-sm">Aucun tenant Microsoft 365 configuré.</p>
      )}

      {tenants.map((t) => (
        <TenantSection key={t.id} tenant={t} clientId={clientId} canEdit={canEdit} />
      ))}
    </div>
  )
}
