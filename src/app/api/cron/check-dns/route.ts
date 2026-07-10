import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runFullCheck } from '@/lib/dns/checker'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const zones = await prisma.dnsZone.findMany({
    select: { id: true, domain: true },
  })

  let ok = 0, warning = 0, error = 0, failed = 0

  for (const zone of zones) {
    try {
      const result = await runFullCheck(zone.domain)
      const minorCount = result.blacklists.listed.filter(r => r.listed && !r.major).length
      await prisma.dnsCheckResult.create({
        data: {
          zoneId:             zone.id,
          spfValid:           result.spf.valid,
          dmarcValid:         result.dmarc.valid,
          dmarcPolicy:        result.dmarc.policy,
          dkimFound:          result.dkim.anyFound,
          blacklistClean:     !result.blacklists.hasMajorListing,
          blacklistMinorCount: minorCount,
          globalStatus:       result.globalStatus,
          details:            result as object,
        },
      })
      if (result.globalStatus === 'OK')      ok++
      else if (result.globalStatus === 'WARNING') warning++
      else error++
    } catch {
      failed++
      console.error(`[cron/check-dns] Erreur pour ${zone.domain}`)
    }
  }

  // Purger les résultats de plus de 90 jours
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  await prisma.dnsCheckResult.deleteMany({ where: { checkedAt: { lt: cutoff } } })

  console.log(`[cron/check-dns] ${zones.length} zones — OK:${ok} WARNING:${warning} ERROR:${error} FAILED:${failed}`)
  return NextResponse.json({ checked: zones.length, ok, warning, error, failed })
}
