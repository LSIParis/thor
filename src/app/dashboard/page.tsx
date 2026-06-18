import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { ClientSelector } from '@/components/dashboard/client-selector'
import {
  Users, Contact, Monitor, AlertTriangle,
  Globe, ShieldCheck, Server, LayoutGrid,
  Cloud, Phone, Building2, AlertCircle,
} from 'lucide-react'

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.14em] uppercase font-semibold text-muted-foreground mb-3">
      {children}
    </p>
  )
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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const session = await requireAuth()
  const t = await getTranslations('dashboard')
  const { client: selectedClientId } = await searchParams

  const userId = session.user.id
  const role = session.user.role
  const isClient = role === 'CLIENT'

  const accessFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const clientFilter = selectedClientId
    ? role === 'ADMIN'
      ? { id: selectedClientId }
      : { id: selectedClientId, users: { some: { userId } } }
    : accessFilter

  const clientWhere = { client: clientFilter }
  const dnsZoneWhere = { registrar: { client: clientFilter } }

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in6m = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)

  const [
    clientCount, contactCount, equipmentCount,
    dnsZoneCount, sslCertCount, hostingCount,
    m365TenantCount, m365AccountCount, nextcloudCount, voipCount,
    certsExpiringSoon, domainsExpiringSoon,
    equipmentRaw, dnsZones, sslExpiry, topClients,
    allClients,
    lastCronSetting,
  ] = await Promise.all([
    prisma.client.count({ where: clientFilter }),
    prisma.contact.count({ where: { ...clientWhere, visible: true } }),
    prisma.equipment.count({ where: clientWhere }),
    prisma.dnsZone.count({ where: dnsZoneWhere }),
    prisma.sslCertificate.count({ where: clientWhere }),
    prisma.hosting.count({ where: clientWhere }),
    prisma.m365Tenant.count({ where: clientWhere }),
    prisma.m365Account.count({ where: { tenant: clientWhere } }),
    prisma.nextcloudService.count({ where: clientWhere }),
    prisma.voipService.count({ where: clientWhere }),
    prisma.sslCertificate.count({ where: { ...clientWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.dnsZone.count({ where: { ...dnsZoneWhere, expiryDate: { gte: now, lte: in30 } } }),
    prisma.equipment.groupBy({ by: ['type'], where: clientWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.dnsZone.findMany({ where: dnsZoneWhere, select: { registrar: { select: { name: true } }, source: true } }),
    prisma.sslCertificate.findMany({ where: { ...clientWhere, expiryDate: { gte: now, lte: in6m } }, select: { expiryDate: true } }),
    prisma.client.findMany({ where: clientFilter, select: { name: true, _count: { select: { equipment: true } } }, orderBy: { equipment: { _count: 'desc' } }, take: 8 }),
    !isClient
      ? prisma.client.findMany({ where: accessFilter, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([] as { id: string; name: string }[]),
    prisma.appSetting.findUnique({ where: { key: 'last_cron_run' } }),
  ])

  // Chart data
  const equipmentByType = equipmentRaw.map((r) => ({ type: r.type, count: r._count.id }))
  const registrarMap: Record<string, number> = {}
  for (const z of dnsZones) {
    const key = z.registrar?.name ?? z.source ?? 'Manuel'
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

  const lastCronRun = lastCronSetting?.value
    ? new Date(lastCronSetting.value).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <AppLayout>
      {/* Client selector — ADMIN/TECH only */}
      {!isClient && (
        <div className="w-full bg-muted/50 border border-border rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Sélectionnez le client à afficher :
            </span>
            <ClientSelector clients={allClients} selectedId={selectedClientId} />
          </div>
          {lastCronRun && (
            <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
              Dernière mise à jour : <span className="font-medium text-muted-foreground">{lastCronRun}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Infrastructure ── */}
      {!isClient && (
        <div className="mb-6">
          <SectionLabel>Infrastructure</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <InfraItem label={t('clients')}    value={clientCount}      icon={Users} />
            <InfraItem label={t('contacts')}   value={contactCount}     icon={Contact} />
            <InfraItem label={t('equipment')}  value={equipmentCount}   icon={Monitor} />
            <InfraItem label="Zones DNS"        value={dnsZoneCount}     icon={Globe} />
            <InfraItem label="Certif. SSL"      value={sslCertCount}     icon={ShieldCheck} />
            <InfraItem label="Hébergements"     value={hostingCount}     icon={Server} />
            <InfraItem label="Tenants M365"     value={m365TenantCount}  icon={LayoutGrid} />
            <InfraItem label="Comptes M365"     value={m365AccountCount} icon={Building2} />
            <InfraItem label="Nextcloud"        value={nextcloudCount}   icon={Cloud} />
            <InfraItem label="VoIP"             value={voipCount}        icon={Phone} />
            <InfraItem label="SSL exp. < 30j"   value={certsExpiringSoon}    icon={AlertTriangle} alert />
            <InfraItem label="Dom. exp. < 30j"  value={domainsExpiringSoon}  icon={AlertCircle}   alert />
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
