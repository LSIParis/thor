import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LayoutGrid, Users, Globe, ExternalLink } from 'lucide-react'
import { TenantAccountsView } from '@/components/m365/tenant-accounts-view'
import { AddTenantDialog } from '@/components/m365/add-tenant-dialog'
import { EditTenantDialog } from '@/components/m365/edit-tenant-dialog'
import { SyncTenantButton } from '@/components/m365/sync-tenant-button'
import { ExportPdfButton } from '@/components/m365/export-pdf-button'
import { DeleteTenantButton } from '@/components/m365/delete-tenant-button'


export default async function M365Page({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId = session.user.id
  const role = session.user.role
  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (role === 'ADMIN' ? { id: selectedClientId } : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const allClients = await prisma.client.findMany({
    where: accessFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const clients = await prisma.client.findMany({
    where: { ...clientFilter, m365Tenants: { some: {} } },
    select: {
      id: true,
      name: true,
      m365Tenants: {
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          displayName: true,
          tenantId: true,
          azureClientId: true,
          azureClientSecret: true,
          lastSyncAt: true,
          notes: true,
          createdAt: true,
          accounts: {
            orderBy: { displayName: 'asc' },
          },
          domains: { orderBy: { isDefault: 'desc' } },
          _count: { select: { domains: true } },
          licenseSkus: { orderBy: { skuPartNumber: 'asc' } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const totalTenants  = clients.reduce((s, c) => s + c.m365Tenants.length, 0)
  const totalAccounts = clients.reduce((s, c) => s + c.m365Tenants.reduce((t, tn) => t + tn.accounts.length, 0), 0)
  const totalDomains  = clients.reduce((s, c) => s + c.m365Tenants.reduce((t, tn) => t + tn._count.domains, 0), 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Microsoft 365</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalTenants} tenant{totalTenants !== 1 ? 's' : ''} · {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddTenantDialog clients={allClients} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><LayoutGrid size={18} /></div>
          <div><div className="text-2xl font-bold tabular-nums">{totalTenants}</div><div className="text-xs text-muted-foreground">Tenants</div></div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"><Users size={18} /></div>
          <div><div className="text-2xl font-bold tabular-nums">{totalAccounts}</div><div className="text-xs text-muted-foreground">Comptes</div></div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><Globe size={18} /></div>
          <div><div className="text-2xl font-bold tabular-nums">{totalDomains}</div><div className="text-xs text-muted-foreground">Domaines</div></div>
        </div>
      </div>

      {/* Clients → Tenants → Comptes */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <LayoutGrid size={36} strokeWidth={1.5} className="opacity-30" />
          <p className="text-sm">Aucun tenant Microsoft 365</p>
        </div>
      ) : (
        <div className="space-y-6">
          {clients.map((client) => (
            <div key={client.id}>
              {/* Client header */}
              <div className="flex items-center gap-2 mb-3">
                <Link
                  href={`/clients/${client.id}`}
                  className="text-base font-semibold hover:text-primary transition-colors"
                >
                  {client.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  — {client.m365Tenants.length} tenant{client.m365Tenants.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-4 pl-3 border-l-2 border-border">
                {client.m365Tenants.map((tenant) => {
                  const now = Date.now()
                  const expiringSoon = tenant.accounts.filter(
                    (a) => a.licenseExpiry && a.licenseExpiry >= new Date(now) &&
                      a.licenseExpiry <= new Date(now + 30 * 24 * 60 * 60 * 1000)
                  ).length
                  const expired = tenant.accounts.filter(
                    (a) => a.licenseExpiry && a.licenseExpiry < new Date(now)
                  ).length

                  return (
                    <div key={tenant.id} className="bg-card border border-border rounded-xl overflow-hidden">
                      {/* Tenant header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                        <div className="flex items-center gap-3">
                          <LayoutGrid size={14} className="text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{tenant.displayName}</span>
                          {tenant.tenantId && (
                            <span className="font-mono text-[11px] text-muted-foreground">{tenant.tenantId}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {expiringSoon > 0 && (
                            <span className="text-amber-600 font-medium">{expiringSoon} exp. &lt;30j</span>
                          )}
                          {expired > 0 && (
                            <span className="text-destructive font-medium">{expired} expirée{expired > 1 ? 's' : ''}</span>
                          )}
                          <span>{tenant.accounts.length} compte{tenant.accounts.length !== 1 ? 's' : ''}</span>
                          <span>{tenant._count.domains} domaine{tenant._count.domains !== 1 ? 's' : ''}</span>
                          {tenant.lastSyncAt && (
                            <span className="text-muted-foreground/60" title={new Date(tenant.lastSyncAt).toLocaleString('fr-FR')}>
                              sync {new Date(tenant.lastSyncAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {tenant.tenantId && (
                            <a
                              href={`https://admin.microsoft.com/?tenantid=${tenant.tenantId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ouvrir l'admin Microsoft 365 — pour une session isolée, utilisez Ctrl+Shift+N (Edge InPrivate) puis collez l'URL"
                              className="no-print inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink size={12} />
                              Admin
                            </a>
                          )}
                          <span className="no-print"><ExportPdfButton tenantId={tenant.id} /></span>
                          <span className="no-print"><SyncTenantButton tenantDbId={tenant.id} /></span>
                          <span className="no-print"><EditTenantDialog tenant={tenant} /></span>
                          <span className="no-print"><DeleteTenantButton tenantDbId={tenant.id} displayName={tenant.displayName} /></span>
                        </div>
                      </div>

                      {/* Domains */}
                      {tenant.domains.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-muted/5">
                          <span className="text-xs text-muted-foreground font-medium shrink-0">Domaines :</span>
                          {tenant.domains.map((d) => (
                            <span
                              key={d.id}
                              className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 font-mono ${
                                d.isDefault
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {d.domain}
                              {d.isDefault && <span className="font-sans text-[10px] font-medium">✦</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <TenantAccountsView
                        accounts={tenant.accounts}
                        licenseSkus={tenant.licenseSkus}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
