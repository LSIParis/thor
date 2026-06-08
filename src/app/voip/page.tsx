import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Phone, Hash, GitBranch } from 'lucide-react'

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

export default async function VoipPage() {
  const session = await requireAuth()
  const userId = session.user.id
  const role = session.user.role
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const services = await prisma.voipService.findMany({
    where: { client: clientFilter },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { extensions: true, trunks: true, equipment: true } },
    },
    orderBy: { client: { name: 'asc' } },
  })

  const totalExtensions = services.reduce((s, svc) => s + svc._count.extensions, 0)
  const totalTrunks     = services.reduce((s, svc) => s + svc._count.trunks, 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tél. VoIP</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Services"    value={services.length}  icon={<Phone size={18} />}      color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
        <StatCard label="Extensions"  value={totalExtensions}  icon={<Hash size={18} />}       color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Trunks SIP"  value={totalTrunks}      icon={<GitBranch size={18} />}  color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Fournisseur</th>
                <th className="px-4 py-2 text-right">Extensions</th>
                <th className="px-4 py-2 text-right">Trunks</th>
                <th className="px-4 py-2 text-right">Équipements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/clients/${svc.client.id}?tab=voip`} className="hover:text-primary transition-colors">
                      {svc.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{svc.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{svc.provider ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{svc._count.extensions}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{svc._count.trunks}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{svc._count.equipment}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <Phone size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-30" />
                    Aucun service VoIP
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
