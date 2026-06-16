'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

// ── Données pour le dialog d'édition ─────────────────────────────────────────

export async function getEquipmentFormData(clientId: string) {
  await requireAdmin()
  const [sites, unsitedContacts] = await Promise.all([
    prisma.site.findMany({
      where: { clientId },
      orderBy: [{ isDefault: 'desc' }, { isHeadquarters: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true,
        contacts: {
          orderBy: { lastName: 'asc' },
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.contact.findMany({
      where: { clientId, siteId: null },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ])
  return { sites, unsitedContacts }
}

// ── Mise à jour depuis le dialog (sans redirect) ──────────────────────────────

export async function updateEquipmentInPlace(
  equipmentId: string,
  clientId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  try {
    await requireAdmin()
    const purchaseRaw = formData.get('purchaseDate') as string
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        type:             formData.get('type') as string,
        operatingSystem:  (formData.get('operatingSystem') as string) || null,
        brand:            (formData.get('brand') as string) || null,
        model:            (formData.get('model') as string) || null,
        serialNumber:     (formData.get('serialNumber') as string) || null,
        ipAddress:        (formData.get('ipAddress') as string) || null,
        ipType:           (formData.get('ipType') as string) || null,
        purchaseDate:     purchaseRaw ? new Date(purchaseRaw) : null,
        warrantyDuration: (formData.get('warrantyDuration') as string) || null,
        siteId:           (formData.get('siteId') as string) || null,
        assignedToId:     (formData.get('assignedToId') as string) || null,
        notes:            (formData.get('notes') as string) || null,
      },
    })
    revalidatePath('/parc')
    return { success: true }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

async function savePhoto(photo: File | null): Promise<string | null> {
  if (!photo || photo.size === 0) return null
  const ext = extname(photo.name) || '.jpg'
  const filename = `${randomUUID()}${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'equipment')
  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await photo.arrayBuffer())
  await writeFile(join(uploadDir, filename), buffer)
  return `/uploads/equipment/${filename}`
}

export async function createEquipment(clientId: string, formData: FormData) {
  await requireAdmin()
  const purchaseRaw = formData.get('purchaseDate') as string
  const photo = formData.get('photo') as File | null
  const photoPath = await savePhoto(photo)

  await prisma.equipment.create({
    data: {
      clientId,
      type: formData.get('type') as string,
      operatingSystem: (formData.get('operatingSystem') as string) || null,
      brand: (formData.get('brand') as string) || null,
      model: (formData.get('model') as string) || null,
      serialNumber: (formData.get('serialNumber') as string) || null,
      ipAddress: (formData.get('ipAddress') as string) || null,
      ipType: (formData.get('ipType') as string) || null,
      purchaseDate: purchaseRaw ? new Date(purchaseRaw) : null,
      warrantyDuration: (formData.get('warrantyDuration') as string) || null,
      photoPath,
      assignedToId: (formData.get('assignedToId') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function updateEquipment(equipmentId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  const purchaseRaw = formData.get('purchaseDate') as string
  const photo = formData.get('photo') as File | null
  const newPhotoPath = await savePhoto(photo)

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: {
      type:             formData.get('type') as string,
      operatingSystem:  (formData.get('operatingSystem') as string) || null,
      brand:            (formData.get('brand') as string) || null,
      model:            (formData.get('model') as string) || null,
      serialNumber:     (formData.get('serialNumber') as string) || null,
      ipAddress:        (formData.get('ipAddress') as string) || null,
      ipType:           (formData.get('ipType') as string) || null,
      purchaseDate:     purchaseRaw ? new Date(purchaseRaw) : null,
      warrantyDuration: (formData.get('warrantyDuration') as string) || null,
      siteId:           (formData.get('siteId') as string) || null,
      assignedToId:     (formData.get('assignedToId') as string) || null,
      notes:            (formData.get('notes') as string) || null,
      ...(newPhotoPath ? { photoPath: newPhotoPath } : {}),
    },
  })
  revalidatePath('/parc')
  redirect(`/parc?client=${clientId}`)
}

export async function deleteEquipment(equipmentId: string, clientId: string) {
  await requireAdmin()
  await prisma.equipment.delete({ where: { id: equipmentId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteEquipmentBulk(ids: string[]) {
  await requireAdmin()
  if (ids.length === 0) return
  await prisma.equipment.deleteMany({ where: { id: { in: ids } } })
  revalidatePath('/parc')
}
