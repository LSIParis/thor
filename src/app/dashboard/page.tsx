import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { getClientLinkedToUser } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { fetchDesk365Tickets } from '@/lib/desk365'
import {
  Users, Contact, Monitor, AlertTriangle,
  Globe, ShieldCheck, Server, LayoutGrid,
  Cloud, Phone, Building2,
  Ticket, AlertCircle,
} from 'lucide-react'

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.14em] uppercase font-semibold text-muted-foreground mb-3">
      {children}
    </p>
  )
}

function PanelCard({
  title,
  icon: Icon,
  accent,
  href,
  metrics,
}: {
  title: string
  icon: React.ElementType
  accent: string // tailwind border-color class
  href?: string
  metrics: { label: string; value: number; color?: string }[]
}) {
  const inner = (
    <div className={`bg-card border border-border rounded-xl overflow-hidden border-t-2 ${accent} h-full flex flex-col`}>
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border">
        <Icon size={13} className="text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <div className={`grid flex-1 divide-x divide-border ${metrics.length === 2 ? 'grid-cols-2' : metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {metrics.map((m) => (
          <div key={m.label} className="px-5 py-4 flex flex-col justify-center">
            <span className={`text-3xl font-bold tracking-tight tabular-nums ${m.color ?? ''}`}>{m.value}</span>
            <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block h-full hover:opacity-90 transition-opacity">
        {inner}
      </a>
    )
  }
  return inner
}

function InfraItem({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string
  value: number
  icon: React.ElementType
  alert?: boolean
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-3.5 py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={13} className={`flex-shrink-0 ${alert && value > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className={`text-xs truncate ${alert && value > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${alert && value > 0 ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await requireAuth()
  const t = await getTranslations('dashboard')

  const userId = session.user.id
  const role = session.user.role
  const isClient = role === 'CLIENT'
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientWhere = { client: clientFilter }

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in6m = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)

  let clientCompany: string | null = null
  if (isClient) {
    const linkedClientId = await getClientLinkedToUser(userId)
    if (linkedClientId) {
      const c = await prisma.client.findUnique({ where: { id: linkedClientId }, select: { desk365Company: true } })
      clientCompany = c?.desk365Company ?? null
    }
  }

  const [
    clientCount, contactCount, equipmentCount,
    dnsZoneCount, sslCertCount, hostingCount,
    m365TenantCount, m365AccountCount, nextcloudCount, voipCount,
    certsExpiringSoon, domainsExpiringSoon,
    equipmentRaw, dnsZones, sslExpiry, topClients,
    ticketsResult,
  ] = await Promise.all([
    prisma.client.count({ where: clientFilter }),
    prisma.contact.count({ where: clientWhere }),
    prisma.equipment.count({ where: clientWhere }),
    prisma.dnsZone.count({ where: clientWhere }),
    prisma.sslCertificate.count({ where: clientWhere }),
    prisma.hosting.count({ where: clientWhere }),
    prisma.m365Tenant.count({ where: clientWhere }),
    prisma.m365Account.count({ where: { tenant: clientWhere } }),
    prisma.nextcloudService.count({ where: clientWhere }),
    prisma.voipService.count({ where: clientWhere }),
    prisma.sslCertificate.count({ where: { ...clientWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.dnsZone.count({ where: { ...clientWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.equipment.groupBy({ by: ['type'], where: clientWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.dnsZone.findMany({ where: clientWhere, select: { registrar: true, source: true } }),
    prisma.sslCertificate.findMany({ where: { ...clientWhere, expiryDate: { gte: now, lte: in6m } }, select: { expiryDate: true } }),
    prisma.client.findMany({ where: clientFilter, select: { name: true, _count: { select: { equipment: true } } }, orderBy: { equipment: { _count: 'desc' } }, take: 8 }),
    fetchDesk365Tickets(),
  ])

  // Tickets
  const allTickets = ticketsResult.tickets
  const visibleTickets = isClient && clientCompany
    ? allTickets.filter((t) => t.company_name === clientCompany)
    : allTickets
  const openTickets    = visibleTickets.filter((t) => t.status === 'Open').length
  const pendingTickets = visibleTickets.filter((t) => t.status === 'Pending').length

  // Chart data
  const equipmentByType = equipmentRaw.map((r) => ({ type: r.type, count: r._count.id }))
  const registrarMap: Record<string, number> = {}
  for (const z of dnsZones) {
    const key = z.registrar ?? z.source ?? 'Manuel'
    registrarMap[key] = (registrarMap[key] ?? 0) + 1
  }
  const dnsByRegistrar = Object.entries(registrarMap).map(([registrar, count]) => ({ registrar, count })).sort((a, b) => b.count - a.count)
  const monthMap: Record<string, number> = {}
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
  for (const c of sslExpiry) {
    if (!c.expiryDate) continue
    const key = monthFmt.format(c.expiryDate)
    monthMap[key] = (monthMap[key] ?? 0) + 1
  }
  const certExpiry = Object.entries(monthMap).map(([month, count]) => ({ month, count }))
  const topClientsByEquipment = topClients.filter((c) => c._count.equipment > 0).map((c) => ({ name: c.name, count: c._count.equipment }))

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{today}</p>
        </div>
      </div>

      {/* ── Panneau principal : Tickets ── */}
      <div className="mb-6 max-w-sm">
        <PanelCard
          title="Tickets"
          icon={Ticket}
          accent="border-t-blue-500"
          href="/tickets"
          metrics={[
            { label: 'Ouverts',     value: openTickets,    color: openTickets > 0    ? 'text-blue-600 dark:text-blue-400' : '' },
            { label: 'En attente',  value: pendingTickets, color: pendingTickets > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
          ]}
        />
      </div>

      {/* ── Infrastructure ── */}
      {!isClient && (
        <div className="mb-6">
          <SectionLabel>Infrastructure</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <InfraItem label={t('clients')}    value={clientCount}     icon={Users} />
            <InfraItem label={t('contacts')}   value={contactCount}    icon={Contact} />
            <InfraItem label={t('equipment')}  value={equipmentCount}  icon={Monitor} />
            <InfraItem label="Zones DNS"        value={dnsZoneCount}    icon={Globe} />
            <InfraItem label="Certif. SSL"      value={sslCertCount}    icon={ShieldCheck} />
            <InfraItem label="Hébergements"     value={hostingCount}    icon={Server} />
            <InfraItem label="Tenants M365"     value={m365TenantCount} icon={LayoutGrid} />
            <InfraItem label="Comptes M365"     value={m365AccountCount}icon={Building2} />
            <InfraItem label="Nextcloud"        value={nextcloudCount}  icon={Cloud} />
            <InfraItem label="VoIP"             value={voipCount}       icon={Phone} />
            <InfraItem label="SSL exp. < 30j"   value={certsExpiringSoon}   icon={AlertTriangle} alert />
            <InfraItem label="Dom. exp. < 30j"  value={domainsExpiringSoon} icon={AlertCircle}   alert />
          </div>
        </div>
      )}

      {/* ── Graphiques ── */}
      {!isClient && (
        <>
          <SectionLabel>Analyses</SectionLabel>
          <DashboardCharts
            equipmentByType={equipmentByType}
            dnsByRegistrar={dnsByRegistrar}
            certExpiry={certExpiry}
            topClientsByEquipment={topClientsByEquipment}
          />
        </>
      )}
    </AppLayout>
  )
}
