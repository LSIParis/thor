import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchRmmClients, getRmmConfig } from '@/lib/rmm-client'

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rmm = getRmmConfig()
  if (!rmm) {
    return NextResponse.json({ error: 'RMM not configured' }, { status: 400 })
  }

  let rmmClients
  try {
    rmmClients = await fetchRmmClients(rmm.baseUrl, rmm.apiKey)
    if (!Array.isArray(rmmClients)) {
      return NextResponse.json({ error: "L'URL RMM renvoie une page HTML — vérifiez l'URL (doit être le domaine api., ex: https://api.lsiparis.tech)" }, { status: 502 })
    }
  } catch (err: any) {
    const detail = err?.response?.status
      ? `HTTP ${err.response.status} — ${err.response.statusText}`
      : err?.code
      ? err.code
      : err?.message ?? 'Unknown error'
    return NextResponse.json({ error: `Tactical RMM unreachable: ${detail}` }, { status: 502 })
  }

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const rc of rmmClients) {
    const existing = await prisma.client.findUnique({
      where: { tacticalRmmId: String(rc.id) },
    })
    if (!existing) {
      await prisma.client.create({
        data: { name: rc.name, tacticalRmmId: String(rc.id) },
      })
      created++
    } else if (existing.name !== rc.name) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { name: rc.name },
      })
      updated++
    } else {
      unchanged++
    }
  }

  return NextResponse.json({ created, updated, unchanged })
}
