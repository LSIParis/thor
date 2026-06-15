'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { syncOrgsToZammad } from '@/lib/zammad'

export async function createClient(formData: FormData) {
  await requireAdmin()
  await prisma.client.create({
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath('/clients')
  redirect('/clients')
}

export async function updateClient(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteClient(clientId: string) {
  await requireAdmin()
  await prisma.client.delete({ where: { id: clientId } })
  revalidatePath('/clients')
  redirect('/clients')
}

export async function syncClientsToZammad(): Promise<{
  created: number
  updated: number
  error?: string
}> {
  await requireAdmin()
  const clients = await prisma.client.findMany({ select: { name: true }, orderBy: { name: 'asc' } })
  return syncOrgsToZammad(clients.map(c => c.name))
}
