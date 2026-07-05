import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Cloud, Server, Users } from 'lucide-react'

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

export default async function CloudPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId = session.user.id
  const role = session.user.role
  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (role === 'ADMIN' ? { id: selectedClientId } : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const services = await prisma.nextcloudService.findMany({
    where: { client: clientFilter },
    include: {
      client: { select: { id: true, name: true } },
      servers: true,
    },
    orderBy: { client: { name: 'asc' } },
  })

  const totalServers = services.reduce((s, svc) => s + svc.servers.length, 0)
  const totalUsers   = services.reduce((s, svc) => s + svc.servers.reduce((a, srv) => a + (srv.userCount ?? 0), 0), 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {services.length} service{services.length !== 1 ? 's' : ''} Nextcloud
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Services"  value={services.length} icon={<Cloud size={18} />}   color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
        <StatCard label="Serveurs"  value={totalServers}    icon={<Server size={18} />}  color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Utilisateurs" value={totalUsers}   icon={<Users size={18} />}   color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">URL</th>
                <th className="px-4 py-2 text-left">Version</th>
                <th className="px-4 py-2 text-right">Utilisateurs</th>
                <th className="px-4 py-2 text-right">Stockage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.flatMap((svc) =>
                svc.servers.length > 0
                  ? svc.servers.map((srv, i) => (
                      <tr key={srv.id} className="hover:bg-muted/20">
                        {i === 0 && (
                          <td className="px-4 py-2 font-medium" rowSpan={svc.servers.length}>
                            <Link href={`/clients/${svc.client.id}?tab=nextcloud`} className="hover:text-primary transition-colors">
                              {svc.client.name}
                            </Link>
                          </td>
                        )}
                        {i === 0 && (
                          <td className="px-4 py-2" rowSpan={svc.servers.length}>{svc.name}</td>
                        )}
                        <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[180px]">{srv.url}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{srv.version ?? '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{srv.userCount ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-xs text-muted-foreground">{srv.storageTotal ?? '—'}</td>
                      </tr>
                    ))
                  : [
                      <tr key={svc.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 font-medium">
                          <Link href={`/clients/${svc.client.id}?tab=nextcloud`} className="hover:text-primary transition-colors">
                            {svc.client.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{svc.name}</td>
                        <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground">Aucun serveur</td>
                      </tr>,
                    ]
              )}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <Cloud size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-30" />
                    Aucun service cloud
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
