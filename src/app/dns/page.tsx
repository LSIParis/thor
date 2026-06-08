import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Globe, AlertTriangle, RefreshCw, Shield } from 'lucide-react'

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

export default async function DnsPage() {
  const session = await requireAuth()
  const userId = session.user.id
  const role = session.user.role
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const now   = new Date()
  const in30  = new Date(Date.now() + 30  * 24 * 60 * 60 * 1000)
  const in90  = new Date(Date.now() + 90  * 24 * 60 * 60 * 1000)

  const [zones, certs] = await Promise.all([
    prisma.dnsZone.findMany({
      where: { client: clientFilter },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ client: { name: 'asc' } }, { domain: 'asc' }],
    }),
    prisma.sslCertificate.findMany({
      where: { client: clientFilter },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ client: { name: 'asc' } }, { domain: 'asc' }],
    }),
  ])

  const zonesExpiringSoon = zones.filter((z) => z.expiryDate && z.expiryDate >= now && z.expiryDate <= in30).length
  const certsExpiringSoon = certs.filter((c) => c.expiryDate && c.expiryDate >= now && c.expiryDate <= in30).length

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DNS & Mails</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {zones.length} zone{zones.length !== 1 ? 's' : ''} DNS · {certs.length} certificat{certs.length !== 1 ? 's' : ''} SSL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Zones DNS"       value={zones.length}       icon={<Globe size={18} />}         color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Zones exp. <30j" value={zonesExpiringSoon}  icon={<AlertTriangle size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Certifs SSL"     value={certs.length}       icon={<Shield size={18} />}        color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="SSL exp. <30j"   value={certsExpiringSoon}  icon={<RefreshCw size={18} />}     color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      {/* Zones DNS */}
      <h2 className="text-sm font-semibold mb-2">Zones DNS</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Domaine</th>
                <th className="px-4 py-2 text-left">Registrar</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2 text-center">Renouvellement auto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones.map((z) => {
                const isExpired  = z.expiryDate && z.expiryDate < now
                const isExpiring = z.expiryDate && z.expiryDate >= now && z.expiryDate <= in90
                return (
                  <tr key={z.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/clients/${z.client.id}?tab=dns`} className="hover:text-primary transition-colors">
                        {z.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{z.domain}</td>
                    <td className="px-4 py-2 text-muted-foreground">{z.registrar ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground capitalize">{z.source}</td>
                    <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      {fmt(z.expiryDate)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                      {z.autoRenew ? '✓' : '—'}
                    </td>
                  </tr>
                )
              })}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Aucune zone DNS
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificats SSL */}
      <h2 className="text-sm font-semibold mb-2">Certificats SSL</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Domaine</th>
                <th className="px-4 py-2 text-left">Émetteur</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Émission</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2 text-center">Auto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certs.map((c) => {
                const isExpired  = c.expiryDate && c.expiryDate < now
                const isExpiring = c.expiryDate && c.expiryDate >= now && c.expiryDate <= in30
                return (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/clients/${c.client.id}?tab=dns`} className="hover:text-primary transition-colors">
                        {c.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{c.domain}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.issuer ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.type ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(c.issuedDate)}</td>
                    <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                      {fmt(c.expiryDate)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                      {c.autoRenew ? '✓' : '—'}
                    </td>
                  </tr>
                )
              })}
              {certs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Aucun certificat SSL
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
