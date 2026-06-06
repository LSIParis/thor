import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import {
  Users, Contact, Monitor, AlertTriangle,
  Globe, ShieldCheck, Server, LayoutGrid,
  Cloud, Phone, Building2,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireAuth()
  const t = await getTranslations('dashboard')

  const userId = session.user.id
  const role = session.user.role
  const clientFilter = role === 'ADMIN' ? {} : { users: { some: { userId } } }
  const clientWhere = { client: clientFilter }

  const now = new Date()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const in6m = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)

  const [
    clientCount,
    contactCount,
    equipmentCount,
    dnsZoneCount,
    sslCertCount,
    hostingCount,
    m365TenantCount,
    m365AccountCount,
    nextcloudCount,
    voipCount,
    certsExpiringSoon,
    domainsExpiringSoon,
    // chart data
    equipmentRaw,
    dnsZones,
    sslExpiry,
    topClients,
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
    // equipment grouped by type
    prisma.equipment.groupBy({ by: ['type'], where: clientWhere, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    // dns zones with registrar
    prisma.dnsZone.findMany({ where: clientWhere, select: { registrar: true, source: true } }),
    // ssl certs expiring in next 6 months
    prisma.sslCertificate.findMany({
      where: { ...clientWhere, expiryDate: { gte: now, lte: in6m } },
      select: { expiryDate: true },
    }),
    // top 8 clients by equipment count
    prisma.client.findMany({
      where: clientFilter,
      select: { name: true, _count: { select: { equipment: true } } },
      orderBy: { equipment: { _count: 'desc' } },
      take: 8,
    }),
  ])

  const stats = [
    { label: t('clients'),     value: clientCount,     icon: Users,        color: 'text-primary' },
    { label: t('contacts'),    value: contactCount,     icon: Contact,      color: 'text-primary' },
    { label: t('equipment'),   value: equipmentCount,   icon: Monitor,      color: 'text-primary' },
    { label: 'Zones DNS',      value: dnsZoneCount,     icon: Globe,        color: 'text-primary' },
    { label: 'Certif. SSL',    value: sslCertCount,     icon: ShieldCheck,  color: 'text-primary' },
    { label: 'Hébergements',   value: hostingCount,     icon: Server,       color: 'text-primary' },
    { label: 'Tenants M365',   value: m365TenantCount,  icon: LayoutGrid,   color: 'text-primary' },
    { label: 'Comptes M365',   value: m365AccountCount, icon: Building2,    color: 'text-primary' },
    { label: 'Nextcloud',      value: nextcloudCount,   icon: Cloud,        color: 'text-primary' },
    { label: 'VoIP',           value: voipCount,        icon: Phone,        color: 'text-primary' },
    { label: 'SSL exp. <30j',  value: certsExpiringSoon, icon: AlertTriangle, color: certsExpiringSoon > 0 ? 'text-destructive' : 'text-primary' },
    { label: 'Dom. exp. <30j', value: domainsExpiringSoon, icon: AlertTriangle, color: domainsExpiringSoon > 0 ? 'text-amber-500' : 'text-primary' },
  ]

  // Build chart data
  const equipmentByType = equipmentRaw.map((r) => ({ type: r.type, count: r._count.id }))

  const registrarMap: Record<string, number> = {}
  for (const z of dnsZones) {
    const key = z.registrar ?? z.source ?? 'Manuel'
    registrarMap[key] = (registrarMap[key] ?? 0) + 1
  }
  const dnsByRegistrar = Object.entries(registrarMap)
    .map(([registrar, count]) => ({ registrar, count }))
    .sort((a, b) => b.count - a.count)

  const monthMap: Record<string, number> = {}
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
  for (const c of sslExpiry) {
    if (!c.expiryDate) continue
    const key = monthFmt.format(c.expiryDate)
    monthMap[key] = (monthMap[key] ?? 0) + 1
  }
  const certExpiry = Object.entries(monthMap).map(([month, count]) => ({ month, count }))

  const topClientsByEquipment = topClients
    .filter((c) => c._count.equipment > 0)
    .map((c) => ({ name: c.name, count: c._count.equipment }))

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {label}
              </CardTitle>
              <Icon size={14} className={color} />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardCharts
        equipmentByType={equipmentByType}
        dnsByRegistrar={dnsByRegistrar}
        certExpiry={certExpiry}
        topClientsByEquipment={topClientsByEquipment}
      />
    </AppLayout>
  )
}
