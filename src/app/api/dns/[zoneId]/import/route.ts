import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import axios from 'axios'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA', 'SRV', 'PTR']

async function queryDoh(domain: string, type: string): Promise<any[]> {
  try {
    const resp = await axios.get('https://dns.google/resolve', {
      params: { name: domain, type },
      headers: { Accept: 'application/dns-json' },
      timeout: 8000,
    })
    return resp.data?.Answer ?? []
  } catch {
    return []
  }
}

// Normalise la valeur selon le type
function normalizeValue(type: string, data: string): string {
  // Supprimer le point final sur les FQDN
  return data.replace(/\.$/, '').trim()
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { zoneId } = await params
  const zone = await prisma.dnsZone.findUnique({ where: { id: zoneId } })
  if (!zone) return NextResponse.json({ error: 'Zone introuvable' }, { status: 404 })

  // Requêter tous les types en parallèle
  const results = await Promise.all(
    RECORD_TYPES.map(async (type) => {
      const answers = await queryDoh(zone.domain, type)
      return answers.map((a: any) => ({ type, name: a.name, value: a.data, ttl: a.TTL }))
    })
  )
  const allRecords = results.flat()

  if (allRecords.length === 0) {
    return NextResponse.json({ error: `Aucun enregistrement trouvé pour ${zone.domain}. Le domaine existe-t-il ?` }, { status: 404 })
  }

  // Supprimer les enregistrements existants et remplacer
  await prisma.dnsRecord.deleteMany({ where: { zoneId } })

  const created = await prisma.dnsRecord.createMany({
    data: allRecords.map((r) => ({
      zoneId,
      type: r.type,
      name: normalizeValue(r.type, r.name).replace(zone.domain, '').replace(/\.$/, '') || '@',
      value: normalizeValue(r.type, r.value),
      ttl: r.ttl ?? null,
      priority: r.type === 'MX' || r.type === 'SRV'
        ? (() => {
            const match = r.value.match(/^(\d+)\s/)
            return match ? parseInt(match[1]) : null
          })()
        : null,
    })),
  })

  // Mettre à jour les NS de la zone si trouvés
  const nsRecords = allRecords.filter(r => r.type === 'NS')
  if (nsRecords.length > 0) {
    const nsValue = nsRecords.map(r => normalizeValue('NS', r.value)).join(', ')
    await prisma.dnsZone.update({ where: { id: zoneId }, data: { nameservers: nsValue } })
  }

  return NextResponse.json({ imported: created.count, types: [...new Set(allRecords.map(r => r.type))] })
}
