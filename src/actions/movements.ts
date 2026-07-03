'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { generateAttributionHtml, generateRepriseHtml, type Accessory, type EmailAccountAction } from '@/lib/handover-html'
import { htmlToPdf } from '@/lib/pdf'
import { sendMail } from '@/lib/mailer'
import { createHandoverSignatureRequest } from '@/lib/docuseal'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

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
  const session = await requireAuth()

  const data = parseMovementData(clientId, formData)
  await prisma.personnelMovement.create({ data: { ...data, requestedByEmail: session.user.email } })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function transmitMovement(clientId: string, formData: FormData) {
  const session = await requireAuth()

  const data = parseMovementData(clientId, formData, 'DEMANDE_EFFECTUEE')
  await prisma.personnelMovement.create({ data: { ...data, requestedByEmail: session.user.email } })

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
    data: {
      status: 'DEMANDE_EFFECTUEE',
      requestedByEmail: session.user.email ?? m.requestedByEmail,
    },
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

export async function validateMovement(
  movementId: string,
  clientId: string,
  equipmentId?: string | null,
  reprise?: string,
  accessories?: Accessory[],
  emailAccount?: EmailAccountAction,
): Promise<{ saved: boolean; attributionPath: string | null; reprisePath: string | null; emailSent: boolean; to: string | null; signingUrl: string | null }> {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return { saved: false, attributionPath: null, reprisePath: null, emailSent: false, to: null, signingUrl: null }

  const m = await prisma.personnelMovement.findUnique({
    where: { id: movementId, status: 'DEMANDE_EFFECTUEE' },
  })
  if (!m || m.clientId !== clientId) return { saved: false, attributionPath: null, reprisePath: null, emailSent: false, to: null, signingUrl: null }

  const nextStatus = m.type === 'SORTIE' ? 'TERMINE' : 'ACTIF'
  await prisma.personnelMovement.update({
    where: { id: movementId },
    data: { status: nextStatus, assignedEquipmentId: equipmentId ?? null },
  })

  const full = await prisma.personnelMovement.findUnique({
    where: { id: movementId },
    include: {
      client: { select: { name: true, email: true } },
      assignedEquipment: {
        select: { type: true, brand: true, model: true, serialNumber: true },
      },
    },
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')

  if (!full) return { saved: false, attributionPath: null, reprisePath: null, emailSent: false, to: null, signingUrl: null }

  const safeName = `${full.lastName}-${full.firstName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const timestamp = Date.now()
  const dir = join(process.cwd(), 'public', 'handovers')
  await mkdir(dir, { recursive: true })

  const firstName = full.firstName
  const lastName = full.lastName
  const clientName = full.client.name
  let emailSent = false
  let signingUrl: string | null = null
  let attributionPath: string | null = null
  let reprisePath: string | null = null

  if (full.type === 'SORTIE') {
    // Bon de reprise — document principal pour une sortie
    const repriseHtml = generateRepriseHtml(full, reprise ?? '', emailAccount ?? null)
    const reprisePdf = await htmlToPdf(repriseHtml)
    const repriseFilename = `bon-reprise-${safeName}-${timestamp}.pdf`
    await writeFile(join(dir, repriseFilename), reprisePdf)
    reprisePath = `/handovers/${repriseFilename}`

    const recipient = full.requestedByEmail
    if (recipient) {
      const sigResult = await createHandoverSignatureRequest({
        pdfBuffer: reprisePdf,
        firstName,
        lastName,
        clientName,
        email: recipient,
        clientEmail: full.client.email ?? undefined,
        baseFilename: repriseFilename.replace('.pdf', ''),
        type: 'SORTIE',
      })
      signingUrl = sigResult?.signingUrl ?? null

      if (sigResult) {
        emailSent = true
        await prisma.personnelMovement.update({
          where: { id: movementId },
          data: { docusealSlug: sigResult.slug, docusealSubmissionId: sigResult.submissionId },
        })
      } else {
        const emailBody = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:0;padding:0">
<div style="max-width:560px;margin:32px auto;padding:0 16px">
  <p style="margin:0 0 16px">Bonjour,</p>
  <p style="margin:0 0 16px">
    La demande de sortie pour <strong>${firstName} ${lastName}</strong>
    chez <strong>${clientName}</strong> a été traitée par LSI Maintenance.
  </p>
  <p style="margin:0 0 16px">
    Veuillez trouver en pièce jointe le <strong>bon de reprise de matériel</strong> correspondant.
  </p>
  <p style="margin:0">Cordialement,<br><strong>LSI Maintenance</strong></p>
</div>
</body></html>`
        await sendMail({
          to: recipient,
          subject: `Demande de sortie traitée — ${firstName} ${lastName} (${clientName})`,
          html: emailBody,
          attachment: {
            data: reprisePdf,
            filename: `bon-reprise-${safeName}.pdf`,
            contentType: 'application/pdf',
          },
        })
        emailSent = true
      }
    }
  } else {
    // Bon d'attribution — document principal pour une entrée
    const attrHtml = generateAttributionHtml(full, accessories ?? [])
    const attrPdf = await htmlToPdf(attrHtml)
    const attrFilename = `bon-attribution-${safeName}-${timestamp}.pdf`
    await writeFile(join(dir, attrFilename), attrPdf)
    attributionPath = `/handovers/${attrFilename}`

    // Bon de reprise si du matériel est récupéré lors de l'entrée
    if (reprise?.trim()) {
      const repriseHtml = generateRepriseHtml(full, reprise, null)
      const reprisePdf = await htmlToPdf(repriseHtml)
      const repriseFilename = `bon-reprise-${safeName}-${timestamp}.pdf`
      await writeFile(join(dir, repriseFilename), reprisePdf)
      reprisePath = `/handovers/${repriseFilename}`
    }

    const recipient = full.email
    if (recipient) {
      const sigResult = await createHandoverSignatureRequest({
        pdfBuffer: attrPdf,
        firstName,
        lastName,
        clientName,
        email: recipient,
        clientEmail: full.client.email ?? undefined,
        baseFilename: attrFilename.replace('.pdf', ''),
        type: 'ENTREE',
      })
      signingUrl = sigResult?.signingUrl ?? null

      if (sigResult) {
        emailSent = true
        await prisma.personnelMovement.update({
          where: { id: movementId },
          data: { docusealSlug: sigResult.slug, docusealSubmissionId: sigResult.submissionId },
        })
      } else {
        const emailBody = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:0;padding:0">
<div style="max-width:560px;margin:32px auto;padding:0 16px">
  <p style="margin:0 0 16px">Bonjour ${firstName},</p>
  <p style="margin:0 0 16px">
    Veuillez trouver en pièce jointe le <strong>bon d'attribution de matériel</strong>
    établi pour votre intégration chez <strong>${clientName}</strong>.
  </p>
  <p style="margin:0 0 24px">
    Ce document est au format PDF. Vous pouvez l'ouvrir, le signer et le retourner
    à votre interlocuteur LSI Maintenance.
  </p>
  <p style="margin:0">Cordialement,<br><strong>LSI Maintenance</strong></p>
</div>
</body></html>`
        await sendMail({
          to: recipient,
          subject: `Votre bon d'attribution de matériel — ${firstName} ${lastName} (${clientName})`,
          html: emailBody,
          attachment: {
            data: attrPdf,
            filename: `bon-attribution-${safeName}.pdf`,
            contentType: 'application/pdf',
          },
        })
        emailSent = true
      }
    }
  }

  const emailTo = full.type === 'SORTIE' ? (full.requestedByEmail ?? null) : (full.email ?? null)
  return { saved: true, attributionPath, reprisePath, emailSent, to: emailTo, signingUrl }
}

export async function getClientPCs(clientId: string) {
  await requireAuth()
  return prisma.equipment.findMany({
    where: { clientId },
    select: {
      id: true,
      type: true,
      brand: true,
      model: true,
      serialNumber: true,
      assignedTo: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }],
  })
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
