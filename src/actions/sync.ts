'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { fetchRmmClients, createRmmClient, renameRmmClient, deleteRmmClient, getRmmConfig } from '@/lib/rmm-client'
import { revalidatePath } from 'next/cache'

export interface SyncClient {
  id: string
  name: string
  tacticalRmmId: string | null
}

export interface SyncData {
  rmmClients: { id: string; name: string }[]
  localClients: SyncClient[]
  rmmError?: string
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export async function loadSyncData(): Promise<SyncData> {
  await requireAdmin()

  const [localClients] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, tacticalRmmId: true },
    }),
  ])

  let rmmClients: { id: string; name: string }[] = []
  let rmmError: string | undefined

  const rmm = getRmmConfig()
  if (rmm) {
    try {
      const raw = await fetchRmmClients(rmm.baseUrl, rmm.apiKey)
      rmmClients = raw.map((c) => ({ id: String(c.id), name: c.name }))
    } catch (err: unknown) {
      rmmError = err instanceof Error ? err.message : 'Erreur RMM'
    }
  } else {
    rmmError = 'RMM non configuré'
  }

  return { rmmClients, localClients, rmmError }
}

export async function reconcileClients(
  links: { localClientId: string; rmmId: string | null }[]
) {
  await requireAdmin()
  for (const link of links) {
    await prisma.client.update({
      where: { id: link.localClientId },
      data: { tacticalRmmId: link.rmmId },
    })
  }
  revalidatePath('/clients')
}

export async function createClientInRmm(
  localClientId: string,
  name: string
): Promise<{ rmmId: string | null; error?: string }> {
  await requireAdmin()
  const rmm = getRmmConfig()
  if (!rmm) return { rmmId: null, error: 'RMM non configuré' }
  const rmmId = await createRmmClient(rmm.baseUrl, rmm.apiKey, name)
  if (!rmmId) return { rmmId: null, error: 'Échec création RMM' }
  await prisma.client.update({ where: { id: localClientId }, data: { tacticalRmmId: rmmId } })
  revalidatePath('/clients')
  return { rmmId }
}

export async function renameClientInRmm(
  localClientId: string,
  rmmId: string,
  newName: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const rmm = getRmmConfig()
  if (!rmm) return { error: 'RMM non configuré' }
  const result = await renameRmmClient(rmm.baseUrl, rmm.apiKey, rmmId, newName)
  if ('error' in result) return { error: result.error }
  revalidatePath('/clients')
  return {}
}

export async function deleteClientFromRmm(
  localClientId: string,
  rmmId: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const rmm = getRmmConfig()
  if (!rmm) return { error: 'RMM non configuré' }
  const result = await deleteRmmClient(rmm.baseUrl, rmm.apiKey, rmmId)
  if ('error' in result) return { error: result.error }
  await prisma.client.update({ where: { id: localClientId }, data: { tacticalRmmId: null } })
  revalidatePath('/clients')
  return {}
}

export async function autoReconcile(): Promise<{ linked: number; created: number }> {
  await requireAdmin()

  const data = await loadSyncData()
  const locals = data.localClients

  let linked = 0
  let created = 0

  for (const rmm of data.rmmClients) {
    const existing = locals.find(
      (l) => normalize(l.name) === normalize(rmm.name) || l.tacticalRmmId === rmm.id
    )
    if (existing) {
      if (existing.tacticalRmmId !== rmm.id) {
        await prisma.client.update({ where: { id: existing.id }, data: { tacticalRmmId: rmm.id } })
        linked++
      }
    } else {
      await prisma.client.create({ data: { name: rmm.name, tacticalRmmId: rmm.id } })
      created++
    }
  }

  revalidatePath('/clients')
  return { linked, created }
}
