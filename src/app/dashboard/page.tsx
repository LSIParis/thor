import { getTranslations } from 'next-intl/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Contact, Monitor, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireAuth()
  const t = await getTranslations('dashboard')

  const userId = session.user.id
  const role = session.user.role

  const clientFilter =
    role === 'ADMIN' ? {} : { users: { some: { userId } } }

  const [clientCount, contactCount, equipmentCount, expiringSoonCount] =
    await Promise.all([
      prisma.client.count({ where: clientFilter }),
      prisma.contact.count({ where: { client: clientFilter } }),
      prisma.equipment.count({ where: { client: clientFilter } }),
      prisma.license.count({
        where: {
          client: clientFilter,
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

  const stats = [
    { label: t('clients'), value: clientCount, icon: Users },
    { label: t('contacts'), value: contactCount, icon: Contact },
    { label: t('equipment'), value: equipmentCount, icon: Monitor },
    { label: t('expiringSoon'), value: expiringSoonCount, icon: AlertTriangle },
  ]

  return (
    <AppLayout>
      <h1 className="text-2xl font-semibold mb-6">{t('title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon size={16} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  )
}
