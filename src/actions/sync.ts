'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { fetchDesk365Companies, createDesk365Company } from '@/lib/desk365'
import { fetchRmmClients, createRmmClient } from '@/lib/rmm-client'
import { decrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export interface SyncClient {
  id: string
  name: string
  tacticalRmmId: string | null
  desk365Company: string | null
}

export interface SyncData {
  rmmClients: { id: string; name: string }[]
  desk365Companies: { name: string }[]
  localClients: SyncClient[]
  rmmError?: string
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export async function loadSyncData(): Promise<SyncData> {
  await requireAdmin()

  const [urlSetting, keySetting, localClients] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, tacticalRmmId: true, desk365Company: true },
    }),
  ])

  let rmmClients: { id: string; name: string }[] = []
  let rmmError: string | undefined

  if (urlSetting?.value && keySetting?.value) {
    try {
      const raw = await fetchRmmClients(urlSetting.value, decrypt(keySetting.value))
      rmmClients = raw.map((c) => ({ id: String(c.id), name: c.name }))
    } catch (err: unknown) {
      rmmError = err instanceof Error ? err.message : 'Erreur RMM'
    }
  } else {
    rmmError = 'RMM non configuré (voir Paramètres)'
  }

  const desk365Companies = await fetchDesk365Companies()

  return {
    rmmClients,
    desk365Companies: desk365Companies.map((c) => ({ name: c.name })),
    localClients,
    rmmError,
  }
}

export async function reconcileClients(
  links: { localClientId: string; rmmId: string | null; desk365Company: string | null }[]
) {
  await requireAdmin()

  for (const link of links) {
    await prisma.client.update({
      where: { id: link.localClientId },
      data: {
        tacticalRmmId: link.rmmId,
        desk365Company: link.desk365Company,
      },
    })
  }
  revalidatePath('/clients')
}

export async function createClientInRmm(
  localClientId: string,
  name: string
): Promise<{ rmmId: string | null; error?: string }> {
  await requireAdmin()
  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])
  if (!urlSetting?.value || !keySetting?.value) {
    return { rmmId: null, error: 'RMM non configuré' }
  }
  const rmmId = await createRmmClient(urlSetting.value, decrypt(keySetting.value), name)
  if (!rmmId) return { rmmId: null, error: 'Échec création RMM' }
  await prisma.client.update({ where: { id: localClientId }, data: { tacticalRmmId: rmmId } })
  revalidatePath('/clients')
  return { rmmId }
}

export async function createClientInDesk365(
  localClientId: string,
  name: string
): Promise<{ companyName: string | null; error?: string }> {
  await requireAdmin()
  const result = await createDesk365Company(name)
  if ('error' in result) return { companyName: null, error: result.error }
  await prisma.client.update({ where: { id: localClientId }, data: { desk365Company: result.name } })
  revalidatePath('/clients')
  return { companyName: result.name }
}

export async function autoReconcile(): Promise<{ linked: number; created: number }> {
  await requireAdmin()

  const data = await loadSyncData()
  const locals = data.localClients

  let linked = 0
  let created = 0

  // Link RMM clients to local clients by name
  for (const rmm of data.rmmClients) {
    const existing = locals.find(
      (l) => normalize(l.name) === normalize(rmm.name) || l.tacticalRmmId === rmm.id
    )
    if (existing) {
      if (existing.tacticalRmmId !== rmm.id) {
        await prisma.client.update({
          where: { id: existing.id },
          data: { tacticalRmmId: rmm.id },
        })
        linked++
      }
    } else {
      await prisma.client.create({ data: { name: rmm.name, tacticalRmmId: rmm.id } })
      created++
    }
  }

  // Link Desk365 companies to local clients by name
  const refreshed = await prisma.client.findMany({
    select: { id: true, name: true, desk365Company: true },
  })
  for (const company of data.desk365Companies) {
    const match = refreshed.find(
      (l) => !l.desk365Company && normalize(l.name) === normalize(company.name)
    )
    if (match) {
      await prisma.client.update({
        where: { id: match.id },
        data: { desk365Company: company.name },
      })
      linked++
    }
  }

  revalidatePath('/clients')
  return { linked, created }
}
