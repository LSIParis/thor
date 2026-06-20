'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fetchDesk365Companies, createDesk365Company, desk365Configured } from '@/lib/desk365'
import { encrypt } from '@/lib/crypto'

export async function createClient(formData: FormData) {
  await requireAdmin()
  await prisma.client.create({
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
      noSync: formData.get('noSync') === 'true',
    },
  })
  revalidatePath('/clients')
  redirect('/clients')
}

export async function updateClient(clientId: string, formData: FormData) {
  await requireAdmin()
  const noSync = formData.get('noSync') === 'true'

  const current = await prisma.client.findUnique({ where: { id: clientId }, select: { noSync: true, cometPassword: true } })
  const noSyncChanged = current?.noSync !== noSync

  const newPassword = (formData.get('cometPassword') as string) || null
  const cometPassword = newPassword
    ? encrypt(newPassword)
    : current?.cometPassword ?? null

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name:          formData.get('name') as string,
      address:       (formData.get('address') as string) || null,
      phone:         (formData.get('phone') as string) || null,
      email:         (formData.get('email') as string) || null,
      notes:         (formData.get('notes') as string) || null,
      cometUsername: (formData.get('cometUsername') as string) || null,
      cometPassword,
      noSync,
    },
  })

  if (noSyncChanged) {
    await Promise.all([
      prisma.site.updateMany({ where: { clientId }, data: { noSync } }),
      prisma.contact.updateMany({ where: { clientId }, data: { noSync } }),
    ])
  }

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteClient(clientId: string) {
  await requireAdmin()
  await prisma.client.delete({ where: { id: clientId } })
  revalidatePath('/clients')
  redirect('/clients')
}

export async function syncClientsToDesk365(): Promise<{
  created: number
  skipped: number
  error?: string
}> {
  await requireAdmin()

  if (!desk365Configured()) {
    return { created: 0, skipped: 0, error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }
  }

  try {
    const [thorClients, desk365Names] = await Promise.all([
      prisma.client.findMany({ where: { noSync: false }, select: { name: true }, orderBy: { name: 'asc' } }),
      fetchDesk365Companies(),
    ])

    const existing = new Set(desk365Names.map(n => n.toLowerCase().trim()))

    let created = 0
    let skipped = 0
    for (const client of thorClients) {
      if (existing.has(client.name.toLowerCase().trim())) {
        skipped++
        continue
      }
      const result = await createDesk365Company(client.name)
      if ('error' in result) { skipped++; continue }
      created++
    }

    return { created, skipped }
  } catch (e) {
    console.error('[syncClientsToDesk365]', e)
    return { created: 0, skipped: 0, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateClientBilling(clientId: string, formData: FormData) {
  await requireAdmin()
  const billingPeriod = formData.get('billingPeriod') as string
  await prisma.client.update({ where: { id: clientId }, data: { billingPeriod } })
  revalidatePath(`/clients/${clientId}/parametres`)
}

export async function addClientUser(clientId: string, formData: FormData) {
  await requireAdmin()
  const userId = formData.get('userId') as string
  if (!userId) return
  await prisma.userClient.upsert({
    where: { userId_clientId: { userId, clientId } },
    create: { userId, clientId },
    update: {},
  })
  revalidatePath(`/clients/${clientId}/parametres`)
}

export async function removeClientUser(clientId: string, userId: string) {
  await requireAdmin()
  await prisma.userClient.delete({ where: { userId_clientId: { userId, clientId } } })
  revalidatePath(`/clients/${clientId}/parametres`)
}
