'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { createDesk365Ticket } from '@/lib/desk365'

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

function buildDesk365CustomFields(opts: {
  type: string
  entryType: string | null
  internshipMonths: number | null
  firstName: string
  lastName: string
  date: Date
  email: string | null
  accessVPN: boolean
  accessServer: boolean
  role: string | null
}) {
  const arrivalType =
    opts.type === 'ENTREE'
      ? opts.entryType === 'STAGE' ? 'Stagiaire' : 'Permanent'
      : null

  const fields: Record<string, string | boolean> = {
    "cf_Prénom de l'arrivant": opts.firstName,
    "cf_Nom de l'arrivant": opts.lastName,
    "cf_Date d'arrivée": opts.date.toISOString().split('T')[0],
    "cf_Accès VPN": opts.accessVPN,
  }
  if (arrivalType) fields["cf_Type d'arrivée"] = arrivalType
  if (opts.email) fields["cf_Email"] = opts.email
  if (opts.role) fields["cf_ID du poste"] = opts.role
  fields["cf_Accès serveur"] = opts.accessServer
  return fields
}

function buildEmailHtml(data: ReturnType<typeof parseMovementData>, clientName: string) {
  const typeLabel =
    data.type === 'ENTREE'
      ? data.entryType === 'STAGE'
        ? `Entrée — Stage${data.internshipMonths ? ` (${data.internshipMonths} mois)` : ''}`
        : 'Entrée — Emploi'
      : 'Sortie'

  return `
    <h2 style="color:#1a1a1a">Nouvelle demande de mouvement de personnel</h2>
    <p><strong>Client :</strong> ${clientName}</p>
    <table style="border-collapse:collapse;width:100%;max-width:500px">
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Type</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${typeLabel}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Prénom</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.firstName}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Nom</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.lastName}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Poste</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.role ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Date</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.date.toLocaleDateString('fr-FR')}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Mobile</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.mobile ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Email souhaité</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.email ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Accès VPN</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.accessVPN ? 'Oui' : 'Non'}</td></tr>
      ${data.notes ? `<tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Notes</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${data.notes}</td></tr>` : ''}
    </table>
  `
}

export async function createMovement(clientId: string, formData: FormData) {
  await requireAuth()

  const data = parseMovementData(clientId, formData)
  await prisma.personnelMovement.create({ data })
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function transmitMovement(clientId: string, formData: FormData) {
  const session = await requireAuth()

  const data = parseMovementData(clientId, formData, 'DEMANDE_EFFECTUEE')
  await prisma.personnelMovement.create({ data })

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })
  const clientName = client?.name ?? clientId

  await createDesk365Ticket({
    subject: `[Demande] Mouvement de personnel — ${clientName} — ${data.firstName} ${data.lastName}`,
    description: buildEmailHtml(data, clientName),
    contactEmail: session.user.email,
    customFields: buildDesk365CustomFields({ ...data, accessServer: data.accessServer }),
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/mouvements')
}

export async function sendMovementRequest(movementId: string, clientId: string) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return

  const m = await prisma.personnelMovement.findUnique({
    where: { id: movementId, status: 'EN_ATTENTE' },
    include: { client: { select: { name: true } } },
  })
  if (!m) return

  await prisma.personnelMovement.update({
    where: { id: movementId },
    data: { status: 'DEMANDE_EFFECTUEE' },
  })

  const clientName = m.client.name
  const typeLabel = buildTypeLabel(m.type, m.entryType, m.internshipMonths)
  const date = new Date(m.date)

  const html = `
    <h2 style="color:#1a1a1a">Nouvelle demande de mouvement de personnel</h2>
    <p><strong>Client :</strong> ${clientName}</p>
    <table style="border-collapse:collapse;width:100%;max-width:500px">
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Type</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${typeLabel}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Prénom</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.firstName}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Nom</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.lastName}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Poste</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.role ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Date</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${date.toLocaleDateString('fr-FR')}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Mobile</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.mobile ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Email souhaité</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.email ?? '—'}</td></tr>
      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Accès VPN</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.accessVPN ? 'Oui' : 'Non'}</td></tr>
      ${m.notes ? `<tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f5f5f5"><strong>Notes</strong></td><td style="padding:6px 12px;border:1px solid #ddd">${m.notes}</td></tr>` : ''}
    </table>
  `

  await createDesk365Ticket({
    subject: `[Demande] Mouvement de personnel — ${clientName} — ${m.firstName} ${m.lastName}`,
    description: html,
    contactEmail: session.user.email,
    customFields: buildDesk365CustomFields({
      type: m.type,
      entryType: m.entryType,
      internshipMonths: m.internshipMonths,
      firstName: m.firstName,
      lastName: m.lastName,
      date,
      email: m.email,
      accessVPN: m.accessVPN,
      accessServer: m.accessServer,
      role: m.role,
    }),
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
