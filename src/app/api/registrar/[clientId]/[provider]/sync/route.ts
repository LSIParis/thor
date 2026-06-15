import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Resolver } from 'dns/promises'
import { OvhDnsProvider } from '@/lib/dns-providers/ovh'
import { GandiDnsProvider } from '@/lib/dns-providers/gandi'
import { LwsDnsProvider } from '@/lib/dns-providers/lws'
import type { DnsProvider } from '@/lib/dns-providers/index'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA'] as const
type RecordType = (typeof RECORD_TYPES)[number]

type RecordRow = { type: string; name: string; value: string; ttl: number | null; priority: number | null }

async function discoverAuthoritativeNs(domain: string): Promise<string[]> {
  const r = new Resolver()
  r.setServers(['8.8.8.8', '1.1.1.1'])
  try { return await r.resolveNs(domain) } catch { return [] }
}

async function resolveNsToIps(nsHostnames: string[]): Promise<string[]> {
  const r = new Resolver()
  r.setServers(['8.8.8.8', '1.1.1.1'])
  const ips: string[] = []
  await Promise.allSettled(
    nsHostnames.map(async (ns) => {
      try { ips.push(...(await r.resolve4(ns))) } catch {}
    })
  )
  return ips.length > 0 ? ips : ['8.8.8.8']
}

async function queryRecordsFromNs(domain: string, nsIps: string[]): Promise<RecordRow[]> {
  const r = new Resolver()
  r.setServers(nsIps)
  const results: RecordRow[] = []
  await Promise.allSettled(
    RECORD_TYPES.map(async (type: RecordType) => {
      try {
        if (type === 'MX') {
          const recs = await r.resolveMx(domain)
          for (const x of recs) results.push({ type, name: '@', value: x.exchange, ttl: null, priority: x.priority })
        } else if (type === 'TXT') {
          const recs = await r.resolveTxt(domain)
          for (const x of recs) results.push({ type, name: '@', value: x.join(''), ttl: null, priority: null })
        } else if (type === 'NS') {
          const recs = await r.resolveNs(domain)
          for (const x of recs) results.push({ type, name: '@', value: x, ttl: null, priority: null })
        } else if (type === 'CAA') {
          const recs = await r.resolveCaa(domain)
          for (const x of recs) results.push({ type, name: '@', value: `${x.critical} ${(x as any).issue ?? (x as any).issuewild ?? (x as any).iodef ?? ''}`.trim(), ttl: null, priority: null })
        } else if (type === 'AAAA') {
          const recs = await r.resolve6(domain)
          for (const x of recs) results.push({ type, name: '@', value: x, ttl: null, priority: null })
        } else if (type === 'CNAME') {
          const recs = await r.resolveCname(domain)
          for (const x of recs) results.push({ type, name: '@', value: x, ttl: null, priority: null })
        } else {
          const recs = await r.resolve4(domain)
          for (const x of recs) results.push({ type, name: '@', value: x, ttl: null, priority: null })
        }
      } catch {}
    })
  )
  return results
}

function buildProvider(config: { provider: string; login?: string | null; apiKey?: string | null; apiSecret?: string | null; apiToken?: string | null; extra?: string | null }): DnsProvider {
  const provider = config.provider
  if (provider === 'ovh') {
    return new OvhDnsProvider(
      config.login ?? 'ovh-eu',
      config.apiKey ?? '',
      config.apiSecret ? decrypt(config.apiSecret) : '',
      config.apiToken ? decrypt(config.apiToken) : '',
    )
  }
  if (provider === 'gandi') {
    return new GandiDnsProvider(config.apiToken ? decrypt(config.apiToken) : '')
  }
  if (provider === 'lws') {
    const extra = config.extra ? JSON.parse(config.extra) : {}
    return new LwsDnsProvider(
      config.login ?? '',
      config.apiToken ? decrypt(config.apiToken) : '',
      extra.domains ?? [],
    )
  }
  throw new Error(`Unknown provider: ${provider}`)
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string; provider: string }> },
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId, provider } = await params
  const config = await prisma.registrarConfig.findUnique({
    where: { clientId_provider: { clientId, provider } },
  })
  if (!config) {
    return NextResponse.json({ error: `${provider.toUpperCase()} non configuré pour ce client` }, { status: 400 })
  }

  let dns: DnsProvider
  try {
    dns = buildProvider(config)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  let zoneNames: string[]
  try {
    zoneNames = await dns.listZones()
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 401) return NextResponse.json({ error: `401 — Credentials ${provider.toUpperCase()} invalides. Vérifiez vos clés API.` }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: `403 — Permissions insuffisantes. Vérifiez les droits de votre clé API ${provider.toUpperCase()}.` }, { status: 403 })
    return NextResponse.json({ error: `${provider.toUpperCase()} inaccessible : ${err?.code ?? err?.message ?? 'unknown'}` }, { status: 502 })
  }

  // Find or create the Registrar entry for this client+provider
  // Match by name (case-insensitive) so we reuse any manually-created registrar
  const providerLabel = provider.toUpperCase()
  const registrar =
    (await prisma.registrar.findFirst({
      where: { clientId, name: { equals: providerLabel, mode: 'insensitive' } },
    })) ??
    (await prisma.registrar.create({ data: { clientId, name: providerLabel } }))

  let totalZones = 0
  let totalRecords = 0
  const errors: string[] = []

  await Promise.allSettled(
    zoneNames.map(async (zoneName) => {
      try {
        let records: RecordRow[]
        let nsDisplay: string

        // LWS: try direct records first (faster, no NS resolution needed)
        if (dns.getZoneRecordsDirect) {
          try {
            records = await dns.getZoneRecordsDirect(zoneName)
            const registrarNs = await dns.getZoneNameservers(zoneName)
            nsDisplay = registrarNs.join(', ')
          } catch {
            records = []
            nsDisplay = ''
          }
          // If LWS returns no records (DNS hosted elsewhere), fall back to NS query
          if (records.length === 0) {
            const realNs = await discoverAuthoritativeNs(zoneName)
            const nsIps  = await resolveNsToIps(realNs)
            records      = await queryRecordsFromNs(zoneName, nsIps)
            nsDisplay    = realNs.join(', ')
          }
        } else {
          // OVH / Gandi: get declared NS from registrar, then discover real NS via public DNS
          const registrarNs = await dns.getZoneNameservers(zoneName)
          const realNs      = await discoverAuthoritativeNs(zoneName)
          const nsToUse     = realNs.length > 0 ? realNs : registrarNs
          const nsIps       = await resolveNsToIps(nsToUse)
          records           = await queryRecordsFromNs(zoneName, nsIps)
          nsDisplay         = nsToUse.join(', ')
        }

        const zone = await prisma.dnsZone.upsert({
          where:  { ovhZoneName_registrarId: { ovhZoneName: zoneName, registrarId: registrar.id } },
          update: { domain: zoneName, nameservers: nsDisplay, source: provider },
          create: { registrarId: registrar.id, domain: zoneName, ovhZoneName: zoneName, nameservers: nsDisplay, source: provider },
        })

        await prisma.dnsRecord.deleteMany({ where: { zoneId: zone.id } })
        if (records.length > 0) {
          await prisma.dnsRecord.createMany({
            data: records.map((r) => ({ zoneId: zone.id, type: r.type, name: r.name, value: r.value, ttl: r.ttl, priority: r.priority })),
          })
        }
        totalZones++
        totalRecords += records.length
      } catch (err: any) {
        errors.push(`${zoneName}: ${err?.message ?? 'unknown'}`)
      }
    })
  )

  // Delete zones no longer present
  await prisma.dnsZone.deleteMany({
    where: { registrarId: registrar.id, source: provider, ovhZoneName: { notIn: zoneNames } },
  })

  await prisma.registrarConfig.update({
    where: { clientId_provider: { clientId, provider } },
    data: { lastSyncAt: new Date() },
  })

  return NextResponse.json({ zones: totalZones, records: totalRecords, errors })
}
