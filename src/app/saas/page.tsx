import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Boxes, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

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

function fmt(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default async function SaasPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId = session.user.id
  const role = session.user.role
  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (role === 'ADMIN' ? { id: selectedClientId } : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const licenses = await prisma.license.findMany({
    where: { client: clientFilter },
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ expiryDate: 'asc' }, { name: 'asc' }],
  })

  const expiringSoon = licenses.filter((l) => l.expiryDate && l.expiryDate >= now && l.expiryDate <= in30).length
  const expired      = licenses.filter((l) => l.expiryDate && l.expiryDate < now).length
  const active       = licenses.length - expired

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autre SaaS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {licenses.length} licence{licenses.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total"         value={licenses.length} icon={<Boxes size={18} />}         color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Actives"        value={active}          icon={<CheckCircle2 size={18} />}  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="Exp. < 30 j"   value={expiringSoon}    icon={<Clock size={18} />}         color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Expirées"       value={expired}         icon={<AlertTriangle size={18} />} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Logiciel</th>
                <th className="px-4 py-2 text-left">Éditeur</th>
                <th className="px-4 py-2 text-right">Sièges</th>
                <th className="px-4 py-2 text-left">Expiration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {licenses.map((l) => {
                const isExpired = l.expiryDate && l.expiryDate < now
                const isExpiring = l.expiryDate && l.expiryDate >= now && l.expiryDate <= in30
                return (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/clients/${l.client.id}`} className="hover:text-primary transition-colors">
                        {l.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{l.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.publisher ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{l.seats ?? '—'}</td>
                    <td className={`px-4 py-2 text-sm ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      {fmt(l.expiryDate)}
                    </td>
                  </tr>
                )
              })}
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <Boxes size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-30" />
                    Aucune licence enregistrée
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
