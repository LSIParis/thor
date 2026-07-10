import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Globe, Shield, AlertTriangle, CheckCircle, XCircle, TriangleAlert } from 'lucide-react'
import { ZoneCheckButton } from '@/components/dns/dns-check-panel'
import { AddDnsZoneDialog } from '@/components/dns/add-dns-zone-dialog'
import { DeleteDnsZoneButton } from '@/components/dns/delete-dns-zone-button'
import { ClientSelector } from '@/components/dashboard/client-selector'
import { computeScore, scoreColor } from '@/lib/dns/score'

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

function CheckBadge({ status, checkedAt }: { status: string; checkedAt: Date }) {
  const date = checkedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  if (status === 'OK') return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium" title={`Vérifié le ${date}`}>
      <CheckCircle size={12} /> OK
    </span>
  )
  if (status === 'WARNING') return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium" title={`Vérifié le ${date}`}>
      <TriangleAlert size={12} /> Avertissement
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium" title={`Vérifié le ${date}`}>
      <XCircle size={12} /> Erreur
    </span>
  )
}

export default async function DnsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId = session.user.id
  const role = session.user.role
  const isAdmin = role === 'ADMIN'
  const accessFilter = isAdmin ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (isAdmin ? { id: selectedClientId } : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const now  = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const [allClients, zones, certs] = await Promise.all([
    prisma.client.findMany({
      where: accessFilter,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.dnsZone.findMany({
      where: { client: clientFilter },
      orderBy: [{ client: { name: 'asc' } }, { domain: 'asc' }],
      select: {
        id: true, domain: true, nameservers: true, expiryDate: true, autoRenew: true, source: true,
        client: { select: { id: true, name: true } },
        checkResults: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
          select: { globalStatus: true, checkedAt: true, spfValid: true, dmarcValid: true, dmarcPolicy: true, dkimFound: true, blacklistClean: true, blacklistMinorCount: true },
        },
      },
    }),
    prisma.sslCertificate.findMany({
      where: { client: clientFilter },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ client: { name: 'asc' } }, { domain: 'asc' }],
    }),
  ])

  const zonesExpiringSoon = zones.filter(z => z.expiryDate && z.expiryDate >= now && z.expiryDate <= in30).length
  const certsExpiringSoon = certs.filter(c => c.expiryDate && c.expiryDate >= now && c.expiryDate <= in30).length
  const selectedClient = selectedClientId ? (allClients.find(c => c.id === selectedClientId) ?? null) : null
  const zonesWithIssues = zones.filter(z => z.checkResults[0]?.globalStatus === 'ERROR').length

  return (
    <>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DNS & Mails</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {zones.length} zone{zones.length !== 1 ? 's' : ''} DNS · {certs.length} certificat{certs.length !== 1 ? 's' : ''} SSL
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientSelector clients={allClients} selectedId={selectedClientId} basePath="/dns" />
          <AddDnsZoneDialog clients={allClients} selectedClient={selectedClient} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Zones DNS"        value={zones.length}      icon={<Globe size={18} />}         color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Zones exp. <30j"  value={zonesExpiringSoon} icon={<AlertTriangle size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Certifs SSL"      value={certs.length}      icon={<Shield size={18} />}        color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="Problèmes DNS"    value={zonesWithIssues}   icon={<XCircle size={18} />}       color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      {/* ── Tableau plat des zones DNS ── */}
      <h2 className="text-sm font-semibold mb-3">Zones DNS</h2>
      {zones.length === 0 ? (
        <div className="bg-card border border-border rounded-lg px-4 py-10 text-center text-muted-foreground text-sm mb-6">
          Aucune zone DNS
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left">Domaine</th>
                  {isAdmin && !selectedClientId && <th className="px-4 py-2 text-left hidden md:table-cell">Client</th>}
                  <th className="px-4 py-2 text-left hidden md:table-cell">Nameservers</th>
                  <th className="px-4 py-2 text-left">Expiration</th>
                  <th className="px-4 py-2 text-center hidden sm:table-cell">Auto</th>
                  <th className="px-4 py-2 text-left">Dernière vérif.</th>
                  <th className="px-4 py-2 text-right">Vérifier</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {zones.map(z => {
                  const isExpired  = z.expiryDate && z.expiryDate < now
                  const isExpiring = z.expiryDate && z.expiryDate >= now && z.expiryDate <= in90
                  const lastCheck  = z.checkResults[0] ?? null
                  return (
                    <tr key={z.id} className="hover:bg-muted/20 align-middle">
                      <td className="px-4 py-2 font-mono text-xs font-medium">{z.domain}</td>
                      {isAdmin && !selectedClientId && (
                        <td className="px-4 py-2 text-xs hidden md:table-cell">
                          <Link href={`/clients/${z.client.id}?tab=dns`} className="hover:text-primary transition-colors">
                            {z.client.name}
                          </Link>
                        </td>
                      )}
                      <td className="px-4 py-2 text-xs text-muted-foreground font-mono truncate max-w-[160px] hidden md:table-cell">{z.nameservers ?? '—'}</td>
                      <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                        {fmt(z.expiryDate)}
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-muted-foreground hidden sm:table-cell">
                        {z.autoRenew ? '✓' : '—'}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {lastCheck ? (() => {
                          const score = lastCheck.dmarcPolicy !== undefined
                            ? computeScore({
                                spfValid:           lastCheck.spfValid,
                                dmarcPolicy:        lastCheck.dmarcPolicy,
                                dkimFound:          lastCheck.dkimFound,
                                blacklistClean:     lastCheck.blacklistClean,
                                blacklistMinorCount: lastCheck.blacklistMinorCount,
                              })
                            : Math.round(([lastCheck.spfValid, lastCheck.dmarcValid, lastCheck.dkimFound, lastCheck.blacklistClean].filter(Boolean).length / 4) * 100)
                          return (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <CheckBadge status={lastCheck.globalStatus} checkedAt={lastCheck.checkedAt} />
                                <span className={`text-xs font-semibold tabular-nums ${scoreColor(score)}`}>{score}%</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {lastCheck.checkedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                {' '}
                                {!lastCheck.spfValid && <span className="text-destructive">SPF </span>}
                                {!lastCheck.dmarcValid && <span className="text-destructive">DMARC </span>}
                                {!lastCheck.dkimFound && <span className="text-amber-600">DKIM </span>}
                                {!lastCheck.blacklistClean && <span className="text-destructive">BL </span>}
                              </span>
                            </div>
                          )
                        })() : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ZoneCheckButton domain={z.domain} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DeleteDnsZoneButton zoneId={z.id} domain={z.domain} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Certificats SSL ── */}
      <h2 className="text-sm font-semibold mb-2">Certificats SSL</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Domaine</th>
              <th className="px-4 py-2 text-left">Émetteur</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left hidden sm:table-cell">Émission</th>
              <th className="px-4 py-2 text-left">Expiration</th>
              <th className="px-4 py-2 text-center">Auto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certs.map(c => {
              const isExpired  = c.expiryDate && c.expiryDate < now
              const isExpiring = c.expiryDate && c.expiryDate >= now && c.expiryDate <= in30
              return (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-xs">
                    <Link href={`/clients/${c.client.id}?tab=dns`} className="hover:text-primary transition-colors">
                      {c.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{c.domain}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.issuer ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.type ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{fmt(c.issuedDate)}</td>
                  <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                    {fmt(c.expiryDate)}
                  </td>
                  <td className="px-4 py-2 text-center text-xs">{c.autoRenew ? '✓' : '—'}</td>
                </tr>
              )
            })}
            {certs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">Aucun certificat SSL</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
