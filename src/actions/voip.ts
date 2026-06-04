'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Services ──────────────────────────────────────────────

export async function createVoipService(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.voipService.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      provider: (formData.get('provider') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

export async function deleteVoipService(serviceId: string, clientId: string) {
  await requireAdmin()
  await prisma.voipService.delete({ where: { id: serviceId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

// ── Equipment ─────────────────────────────────────────────

export async function createVoipEquipment(serviceId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.voipEquipment.create({
    data: {
      serviceId,
      type: formData.get('type') as string,
      brand: (formData.get('brand') as string) || null,
      model: (formData.get('model') as string) || null,
      macAddress: (formData.get('macAddress') as string) || null,
      ipAddress: (formData.get('ipAddress') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

export async function deleteVoipEquipment(equipmentId: string, clientId: string) {
  await requireAdmin()
  await prisma.voipEquipment.delete({ where: { id: equipmentId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

// ── Trunks ────────────────────────────────────────────────

export async function createVoipTrunk(serviceId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  const channelsRaw = formData.get('channels') as string
  await prisma.voipTrunk.create({
    data: {
      serviceId,
      name: formData.get('name') as string,
      provider: (formData.get('provider') as string) || null,
      sipServer: (formData.get('sipServer') as string) || null,
      sipUser: (formData.get('sipUser') as string) || null,
      channels: channelsRaw ? parseInt(channelsRaw, 10) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

export async function deleteVoipTrunk(trunkId: string, clientId: string) {
  await requireAdmin()
  await prisma.voipTrunk.delete({ where: { id: trunkId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

// ── Extensions ────────────────────────────────────────────

export async function createVoipExtension(serviceId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.voipExtension.create({
    data: {
      serviceId,
      number: formData.get('number') as string,
      name: (formData.get('name') as string) || null,
      type: (formData.get('type') as string) || null,
      device: (formData.get('device') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}

export async function deleteVoipExtension(extensionId: string, clientId: string) {
  await requireAdmin()
  await prisma.voipExtension.delete({ where: { id: extensionId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=voip`)
}
