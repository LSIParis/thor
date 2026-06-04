'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Services ──────────────────────────────────────────────

export async function createNextcloudService(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.nextcloudService.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=nextcloud`)
}

export async function deleteNextcloudService(serviceId: string, clientId: string) {
  await requireAdmin()
  await prisma.nextcloudService.delete({ where: { id: serviceId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=nextcloud`)
}

// ── Servers ───────────────────────────────────────────────

export async function createNextcloudServer(serviceId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  const userCountRaw = formData.get('userCount') as string
  await prisma.nextcloudServer.create({
    data: {
      serviceId,
      url: formData.get('url') as string,
      version: (formData.get('version') as string) || null,
      adminUser: (formData.get('adminUser') as string) || null,
      storageTotal: (formData.get('storageTotal') as string) || null,
      userCount: userCountRaw ? parseInt(userCountRaw, 10) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=nextcloud`)
}

export async function deleteNextcloudServer(serverId: string, clientId: string) {
  await requireAdmin()
  await prisma.nextcloudServer.delete({ where: { id: serverId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=nextcloud`)
}
