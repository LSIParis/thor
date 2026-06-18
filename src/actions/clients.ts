'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  const current = await prisma.client.findUnique({ where: { id: clientId }, select: { noSync: true } })
  const noSyncChanged = current?.noSync !== noSync

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
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
