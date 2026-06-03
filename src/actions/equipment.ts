'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEquipment(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.equipment.create({
    data: {
      clientId,
      type: formData.get('type') as string,
      brand: (formData.get('brand') as string) || null,
      model: (formData.get('model') as string) || null,
      serialNumber: (formData.get('serialNumber') as string) || null,
      ipAddress: (formData.get('ipAddress') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteEquipment(equipmentId: string, clientId: string) {
  await requireAdmin()
  await prisma.equipment.delete({ where: { id: equipmentId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
