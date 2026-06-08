import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LayoutGrid, Users, Globe, CheckCircle2, XCircle } from 'lucide-react'

function fmt(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default async function M365Page() {
  const session = await requireAuth()
  const userId = session.user.id
  const role = session.user.role
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const clients = await prisma.client.findMany({
    where: { ...clientFilter, m365Tenants: { some: {} } },
    select: {
      id: true,
      name: true,
      m365Tenants: {
        orderBy: { displayName: 'asc' },
        include: {
          accounts: {
            orderBy: { displayName: 'asc' },
          },
          _count: { select: { domains: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const totalTenants  = clients.reduce((s, c) => s + c.m365Tenants.length, 0)
  const totalAccounts = clients.reduce((s, c) => s + c.m365Tenants.reduce((t, tn) => t + tn.accounts.length, 0), 0)
  const totalDomains  = clients.reduce((s, c) => s + c.m365Tenants.reduce((t, tn) => t + tn._count.domains, 0), 0)

  const now = new Date()

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Microsoft 365</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalTenants} tenant{totalTenants !== 1 ? 's' : ''} · {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
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
                  const expiringSoon = tenant.accounts.filter(
                    (a) => a.licenseExpiry && a.licenseExpiry >= now &&
                      a.licenseExpiry <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  ).length
                  const expired = tenant.accounts.filter(
                    (a) => a.licenseExpiry && a.licenseExpiry < now
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
                        </div>
                      </div>

                      {/* Accounts table */}
                      {tenant.accounts.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/20">
                              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-4 py-2 text-left">Nom</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Poste</th>
                                <th className="px-4 py-2 text-left">Licence</th>
                                <th className="px-4 py-2 text-left">Expiration</th>
                                <th className="px-4 py-2 text-center">Actif</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {tenant.accounts.map((account) => {
                                const isExpired  = account.licenseExpiry && account.licenseExpiry < now
                                const isExpiring = account.licenseExpiry && account.licenseExpiry >= now &&
                                  account.licenseExpiry <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                return (
                                  <tr key={account.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-2 font-medium">{account.displayName}</td>
                                    <td className="px-4 py-2 text-xs text-muted-foreground">{account.userPrincipalName}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{account.jobTitle ?? '—'}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{account.licenseType ?? '—'}</td>
                                    <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                      {fmt(account.licenseExpiry)}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {account.licensed
                                        ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                                        : <XCircle     size={14} className="text-muted-foreground/40 mx-auto" />
                                      }
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="px-4 py-6 text-sm text-muted-foreground/60 text-center">
                          Aucun compte dans ce tenant
                        </p>
                      )}
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
