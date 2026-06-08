import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LayoutGrid, Users, Globe } from 'lucide-react'

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

export default async function M365Page() {
  const session = await requireAuth()
  const userId = session.user.id
  const role = session.user.role
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const tenants = await prisma.m365Tenant.findMany({
    where: { client: clientFilter },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { accounts: true, domains: true } },
    },
    orderBy: { client: { name: 'asc' } },
  })

  const totalAccounts = tenants.reduce((s, t) => s + t._count.accounts, 0)
  const totalDomains  = tenants.reduce((s, t) => s + t._count.domains, 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Microsoft 365</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tenants"  value={tenants.length}  icon={<LayoutGrid size={18} />} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Comptes"  value={totalAccounts}   icon={<Users size={18} />}      color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
        <StatCard label="Domaines" value={totalDomains}    icon={<Globe size={18} />}      color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Tenant</th>
                <th className="px-4 py-2 text-left">Tenant ID</th>
                <th className="px-4 py-2 text-right">Comptes</th>
                <th className="px-4 py-2 text-right">Domaines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/clients/${t.client.id}?tab=m365`} className="hover:text-primary transition-colors">
                      {t.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{t.displayName}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{t.tenantId ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{t._count.accounts}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{t._count.domains}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <LayoutGrid size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-30" />
                    Aucun tenant Microsoft 365
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
