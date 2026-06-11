import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncTenant } from '@/lib/m365-sync'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await prisma.m365Tenant.findMany({
    where: {
      tenantId: { not: null },
      azureClientId: { not: null },
      azureClientSecret: { not: null },
    },
    select: { id: true, displayName: true },
  })

  const results: { tenant: string; synced?: number; error?: string }[] = []

  for (const tenant of tenants) {
    try {
      const { synced } = await syncTenant(tenant.id)
      results.push({ tenant: tenant.displayName, synced })
      console.log(`[cron/sync-m365] ${tenant.displayName} : ${synced} comptes synchronisés`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ tenant: tenant.displayName, error: msg })
      console.error(`[cron/sync-m365] ${tenant.displayName} : ${msg}`)
    }
  }

  return NextResponse.json({ ok: true, tenants: results.length, results })
}
