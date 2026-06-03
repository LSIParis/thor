import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchRmmClients } from '@/lib/rmm-client'

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])

  if (!urlSetting?.value || !keySetting?.value) {
    return NextResponse.json({ error: 'RMM not configured' }, { status: 400 })
  }

  const apiKey = decrypt(keySetting.value)

  let rmmClients
  try {
    rmmClients = await fetchRmmClients(urlSetting.value, apiKey)
  } catch {
    return NextResponse.json({ error: 'Failed to reach Tactical RMM' }, { status: 502 })
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
