import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { OvhClient } from '@/lib/ovh-client'
import { Resolver } from 'dns/promises'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA'] as const
type RecordType = (typeof RECORD_TYPES)[number]

interface OvhZoneInfo {
  name: string
  nameServers: string[]
}

interface RecordRow {
  type: string
  name: string
  value: string
  ttl: number | null
  priority: number | null
}

async function resolveNsToIps(nsHostnames: string[]): Promise<string[]> {
  const defaultResolver = new Resolver()
  const ips: string[] = []
  await Promise.allSettled(
    nsHostnames.map(async (ns) => {
      try {
        const addrs = await defaultResolver.resolve4(ns)
        ips.push(...addrs)
      } catch {
        // unresolvable NS — skip
      }
    })
  )
  return ips.length > 0 ? ips : ['8.8.8.8']
}

async function queryRecordsFromNs(domain: string, nsIps: string[]): Promise<RecordRow[]> {
  const resolver = new Resolver()
  resolver.setServers(nsIps)
  const results: RecordRow[] = []

  await Promise.allSettled(
    RECORD_TYPES.map(async (type: RecordType) => {
      try {
        if (type === 'MX') {
          const records = await resolver.resolveMx(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r.exchange, ttl: null, priority: r.priority })
          }
        } else if (type === 'TXT') {
          const records = await resolver.resolveTxt(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r.join(''), ttl: null, priority: null })
          }
        } else if (type === 'NS') {
          const records = await resolver.resolveNs(domain)
          for (const r of records) {
            results.push({ type, name: '@', value: r, ttl: null, priority: null })
          }
        } else if (type === 'CAA') {
          const records = await resolver.resolveCaa(domain)
          for (const r of records) {
            const val = `${r.critical} ${(r as any).issue ?? (r as any).issuewild ?? (r as any).iodef ?? ''}`
            results.push({ type, name: '@', value: val.trim(), ttl: null, priority: null })
          }
        } else if (type === 'AAAA') {
          const records = await resolver.resolve6(domain)
          for (const v of records) {
            results.push({ type, name: '@', value: v, ttl: null, priority: null })
          }
        } else if (type === 'CNAME') {
          const records = await resolver.resolveCname(domain)
          for (const v of records) {
            results.push({ type, name: '@', value: v, ttl: null, priority: null })
          }
        } else {
          // A
          const records = await resolver.resolve4(domain)
          for (const v of records) {
            results.push({ type, name: '@', value: v, ttl: null, priority: null })
          }
        }
      } catch {
        // record type not found — normal
      }
    })
  )
  return results
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const config = await prisma.ovhConfig.findUnique({ where: { clientId } })
  if (!config) {
    return NextResponse.json({ error: 'OVH non configuré pour ce client' }, { status: 400 })
  }

  const appSecret   = decrypt(config.applicationSecret)
  const consumerKey = decrypt(config.consumerKey)
  const ovh         = new OvhClient(config.endpoint, config.applicationKey, appSecret, consumerKey)

  // 1. List zones
  let zoneNames: string[]
  try {
    zoneNames = await ovh.get<string[]>('/domain/zone')
  } catch (err: any) {
    const status = err?.response?.status
    const ovhMsg = err?.response?.data?.message ?? ''
    if (status === 401) {
      return NextResponse.json({
        error: `Application Key ou signature invalide (401). Vérifiez votre Application Key et Application Secret. Détail OVH : ${ovhMsg || 'INVALID_CREDENTIAL'}`,
      }, { status: 401 })
    }
    if (status === 403) {
      return NextResponse.json({
        error: `Consumer Key refusée (403) — droits insuffisants. La CK doit avoir GET sur /domain/zone et /domain/zone/*. Regénérez une CK avec les bons droits sur https://eu.api.ovh.com/createToken. Détail OVH : ${ovhMsg || 'NOT_GRANTED_CALL'}`,
      }, { status: 403 })
    }
    return NextResponse.json(
      { error: `OVH inaccessible : ${err?.code ?? err?.message ?? 'unknown'}` },
      { status: 502 },
    )
  }

  let totalZones   = 0
  let totalRecords = 0
  const errors: string[] = []

  // 2. Process each zone in parallel
  await Promise.allSettled(
    zoneNames.map(async (zoneName) => {
      try {
        const zoneInfo  = await ovh.get<OvhZoneInfo>(`/domain/zone/${zoneName}`)
        const nsHostnames = zoneInfo.nameServers ?? []
        const nsIps     = await resolveNsToIps(nsHostnames)
        const records   = await queryRecordsFromNs(zoneName, nsIps)

        const zone = await prisma.dnsZone.upsert({
          where:  { ovhZoneName_clientId: { ovhZoneName: zoneName, clientId } },
          update: { domain: zoneName, nameservers: nsHostnames.join(', '), source: 'ovh' },
          create: {
            clientId,
            domain:      zoneName,
            ovhZoneName: zoneName,
            nameservers: nsHostnames.join(', '),
            source:      'ovh',
          },
        })

        await prisma.dnsRecord.deleteMany({ where: { zoneId: zone.id } })
        if (records.length > 0) {
          await prisma.dnsRecord.createMany({
            data: records.map((r) => ({
              zoneId:   zone.id,
              type:     r.type,
              name:     r.name,
              value:    r.value,
              ttl:      r.ttl,
              priority: r.priority,
            })),
          })
        }

        totalZones++
        totalRecords += records.length
      } catch (err: any) {
        errors.push(`${zoneName}: ${err?.message ?? 'unknown'}`)
      }
    })
  )

  // 3. Delete OVH zones no longer present in OVH
  await prisma.dnsZone.deleteMany({
    where: { clientId, source: 'ovh', ovhZoneName: { notIn: zoneNames } },
  })

  // 4. Update lastSyncAt
  await prisma.ovhConfig.update({ where: { clientId }, data: { lastSyncAt: new Date() } })

  return NextResponse.json({ zones: totalZones, records: totalRecords, errors })
}
