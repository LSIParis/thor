import { requireAuth } from '@/lib/access'
import { AppLayout } from '@/components/layout/app-layout'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Globe, Building2, Shield, AlertTriangle } from 'lucide-react'
import { DnsCheckPanel, ZoneCheckButton } from '@/components/dns/dns-check-panel'
import { AddDnsZoneDialog } from '@/components/dns/add-dns-zone-dialog'
import { DeleteDnsZoneButton } from '@/components/dns/delete-dns-zone-button'
import { ImportRegistrarDialog } from '@/components/dns/import-registrar-dialog'
import { RegistrarRowActions } from '@/components/dns/registrar-row-actions'

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

export default async function DnsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const { client: selectedClientId } = await searchParams
  const userId = session.user.id
  const role = session.user.role
  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientFilter = selectedClientId
    ? (role === 'ADMIN' ? { id: selectedClientId } : { id: selectedClientId, users: { some: { userId } } })
    : accessFilter

  const now  = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const allClients = await prisma.client.findMany({
    where: accessFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const clients = await prisma.client.findMany({
    where: { ...clientFilter, registrars: { some: {} } },
    select: {
      id: true, name: true,
      registrars: {
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, clientId: true,
          dnsZones: {
            orderBy: { domain: 'asc' },
            select: { id: true, domain: true, nameservers: true, expiryDate: true, autoRenew: true, source: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const certs = await prisma.sslCertificate.findMany({
    where: { client: clientFilter },
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ client: { name: 'asc' } }, { domain: 'asc' }],
  })

  const allRegistrars = await prisma.registrar.findMany({
    where: { client: accessFilter },
    select: { id: true, clientId: true, name: true },
    orderBy: { name: 'asc' },
  })

  const allZones = clients.flatMap(c => c.registrars.flatMap(r => r.dnsZones))
  const zonesExpiringSoon = allZones.filter(z => z.expiryDate && z.expiryDate >= now && z.expiryDate <= in30).length
  const certsExpiringSoon = certs.filter(c => c.expiryDate && c.expiryDate >= now && c.expiryDate <= in30).length
  const selectedClient = selectedClientId ? (allClients.find(c => c.id === selectedClientId) ?? null) : null

  return (
    <AppLayout>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DNS & Mails</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allZones.length} zone{allZones.length !== 1 ? 's' : ''} DNS · {certs.length} certificat{certs.length !== 1 ? 's' : ''} SSL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportRegistrarDialog clients={allClients} selectedClientId={selectedClientId} />
          <AddDnsZoneDialog clients={allClients} registrars={allRegistrars} selectedClient={selectedClient} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Zones DNS"       value={allZones.length}   icon={<Globe size={18} />}         color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard label="Zones exp. <30j" value={zonesExpiringSoon} icon={<AlertTriangle size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard label="Certifs SSL"     value={certs.length}      icon={<Shield size={18} />}        color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard label="SSL exp. <30j"   value={certsExpiringSoon} icon={<AlertTriangle size={18} />} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      {/* ── Vérificateur email/DNS ── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Vérifier un domaine (SPF · DMARC · DKIM · Blacklists · BIMI · MTA-STS · TLS-RPT)</h2>
        <DnsCheckPanel />
      </div>

      {/* ── Zones DNS par client → registrar ── */}
      <h2 className="text-sm font-semibold mb-3">Zones DNS</h2>
      {clients.length === 0 ? (
        <div className="bg-card border border-border rounded-lg px-4 py-10 text-center text-muted-foreground text-sm mb-6">
          Aucune zone DNS
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {clients.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
                <Building2 size={13} className="text-muted-foreground" />
                <Link href={`/clients/${client.id}?tab=dns`} className="text-sm font-semibold hover:text-primary transition-colors">
                  {client.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  — {client.registrars.length} registrar{client.registrars.length !== 1 ? 's' : ''}
                </span>
              </div>

              {client.registrars.map(registrar => (
                <div key={registrar.id} className="border-b border-border last:border-b-0">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="text-primary" />
                      <span className="text-xs font-medium">{registrar.name}</span>
                      <span className="text-xs text-muted-foreground">— {registrar.dnsZones.length} domaine{registrar.dnsZones.length !== 1 ? 's' : ''}</span>
                    </div>
                    <RegistrarRowActions registrarId={registrar.id} name={registrar.name} />
                  </div>

                  {registrar.dnsZones.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/10">
                        <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-1.5 text-left">Domaine</th>
                          <th className="px-4 py-1.5 text-left hidden md:table-cell">Nameservers</th>
                          <th className="px-4 py-1.5 text-left">Source</th>
                          <th className="px-4 py-1.5 text-left">Expiration</th>
                          <th className="px-4 py-1.5 text-center hidden sm:table-cell">Auto</th>
                          <th className="px-4 py-1.5 text-right">Vérifier</th>
                          <th className="px-4 py-1.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {registrar.dnsZones.map(z => {
                          const isExpired  = z.expiryDate && z.expiryDate < now
                          const isExpiring = z.expiryDate && z.expiryDate >= now && z.expiryDate <= in90
                          return (
                            <tr key={z.id} className="border-t border-border/60 hover:bg-muted/20 align-top">
                              <td className="px-4 py-2 font-mono text-xs font-medium">{z.domain}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground font-mono truncate max-w-[180px] hidden md:table-cell">{z.nameservers ?? '—'}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground capitalize">{z.source}</td>
                              <td className={`px-4 py-2 text-xs ${isExpired ? 'text-destructive font-medium' : isExpiring ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                {fmt(z.expiryDate)}
                              </td>
                              <td className="px-4 py-2 text-center text-xs text-muted-foreground hidden sm:table-cell">
                                {z.autoRenew ? '✓' : '—'}
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
                  ) : (
                    <p className="px-4 py-3 text-xs text-muted-foreground italic">Aucun domaine</p>
                  )}
                </div>
              ))}
            </div>
          ))}
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
    </AppLayout>
  )
}
