'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/access'
import { revalidatePath } from 'next/cache'

function parseMovementData(clientId: string, formData: FormData, overrideStatus?: string) {
  const type = formData.get('type') as string
  const entryType = type === 'ENTREE' ? ((formData.get('entryType') as string) || null) : null
  const monthsStr = formData.get('internshipMonths') as string
  const internshipMonths = entryType === 'STAGE' && monthsStr ? parseInt(monthsStr, 10) : null
  const dateVal = formData.get('date') as string
  return {
    clientId,
    type,
    entryType,
    internshipMonths,
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    role: (formData.get('role') as string) || null,
    mobile: (formData.get('mobile') as string) || null,
    email: (formData.get('email') as string) || null,
    accessVPN: formData.get('accessVPN') === 'true',
    accessServer: formData.get('accessServer') === 'true',
    status: overrideStatus ?? ((formData.get('status') as string) || 'EN_ATTENTE'),
    date: dateVal ? new Date(dateVal) : new Date(),
    notes: (formData.get('notes') as string) || null,
  }
}

function buildTypeLabel(type: string, entryType: string | null, internshipMonths: number | null) {
  if (type !== 'ENTREE') return 'Sortie'
  return entryType === 'STAGE'
    ? `Entrée — Stage${internshipMonths ? ` (${internshipMonths} mois)` : ''}`
    : 'Entrée — Emploi'
}


export async function createMovement(clientId: string, formData: FormData) {
  await requireAuth()

  const data = parseMovementData(clientId, formData)
  await prisma.personnelMovement.create({ data })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function transmitMovement(clientId: string, formData: FormData) {
  await requireAuth()

  const data = parseMovementData(clientId, formData, 'DEMANDE_EFFECTUEE')
  await prisma.personnelMovement.create({ data })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function sendMovementRequest(movementId: string, clientId: string) {
  const session = await requireAuth()

  if (session.user.role === 'CLIENT') {
    const access = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId: session.user.id, clientId } },
    })
    if (!access) return
  }

  const m = await prisma.personnelMovement.findUnique({
    where: { id: movementId, status: 'EN_ATTENTE' },
    include: { client: { select: { name: true } } },
  })
  if (!m || m.clientId !== clientId) return

  await prisma.personnelMovement.update({
    where: { id: movementId },
    data: { status: 'DEMANDE_EFFECTUEE' },
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function cancelMovementRequest(movementId: string, clientId: string) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return

  await prisma.personnelMovement.update({
    where: { id: movementId, status: 'DEMANDE_EFFECTUEE' },
    data: { status: 'EN_ATTENTE' },
  })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function validateMovement(movementId: string, clientId: string) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return

  const m = await prisma.personnelMovement.findUnique({
    where: { id: movementId, status: 'DEMANDE_EFFECTUEE' },
  })
  if (!m || m.clientId !== clientId) return

  const nextStatus = m.type === 'SORTIE' ? 'TERMINE' : 'ACTIF'
  await prisma.personnelMovement.update({
    where: { id: movementId },
    data: { status: nextStatus },
  })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function updateMovement(movementId: string, clientId: string, formData: FormData) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return

  const existing = await prisma.personnelMovement.findUnique({ where: { id: movementId } })
  if (!existing || existing.status !== 'EN_ATTENTE') return

  const data = parseMovementData(clientId, formData)
  await prisma.personnelMovement.update({ where: { id: movementId }, data })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function deleteMovement(movementId: string, clientId: string) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return
  await prisma.personnelMovement.delete({ where: { id: movementId } })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}
