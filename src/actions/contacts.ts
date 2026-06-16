'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fetchAllZammadUsers, fetchAllOrgs, upsertZammadUser } from '@/lib/zammad'

export async function createContact(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.contact.create({
    data: {
      clientId,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      role: (formData.get('role') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function updateContact(contactId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      role: (formData.get('role') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteContact(contactId: string, clientId: string) {
  await requireAdmin()
  await prisma.contact.delete({ where: { id: contactId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

// ── Actions pour la page /contacts (pas de redirect) ─────────────────────────

export async function createContactFromPage(formData: FormData) {
  await requireAdmin()
  const clientId = formData.get('clientId') as string
  const siteId   = (formData.get('siteId') as string) || null
  await prisma.contact.create({
    data: {
      clientId,
      siteId,
      firstName: formData.get('firstName') as string,
      lastName:  formData.get('lastName') as string,
      email:     (formData.get('email') as string) || null,
      phone:     (formData.get('phone') as string) || null,
      role:      (formData.get('role') as string) || null,
      notes:     (formData.get('notes') as string) || null,
      noSync:    formData.get('noSync') === 'true',
    },
  })
  revalidatePath('/contacts')
}

export async function updateContactFromPage(contactId: string, formData: FormData) {
  await requireAdmin()
  const siteId = (formData.get('siteId') as string) || null
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      siteId,
      firstName: formData.get('firstName') as string,
      lastName:  formData.get('lastName') as string,
      email:     (formData.get('email') as string) || null,
      phone:     (formData.get('phone') as string) || null,
      role:      (formData.get('role') as string) || null,
      notes:     (formData.get('notes') as string) || null,
      noSync:    formData.get('noSync') === 'true',
    },
  })
  revalidatePath('/contacts')
}

export async function deleteContactFromPage(contactId: string) {
  await requireAdmin()
  await prisma.contact.delete({ where: { id: contactId } })
  revalidatePath('/contacts')
}

export async function deleteContactsBulk(ids: string[]) {
  await requireAdmin()
  if (ids.length === 0) return
  await prisma.contact.deleteMany({ where: { id: { in: ids } } })
  revalidatePath('/contacts')
}

// ── Synchronisation bidirectionnelle Zammad ────────────────────────────────────

export async function syncContactsWithZammad(): Promise<{
  pushed: number
  imported: number
  historical: number
  error?: string
}> {
  await requireAdmin()

  const zammadConfigured = !!process.env.ZAMMAD_URL && !!process.env.ZAMMAD_TOKEN
  if (!zammadConfigured) {
    return { pushed: 0, imported: 0, historical: 0, error: 'ZAMMAD_URL ou ZAMMAD_TOKEN non configuré' }
  }

  // Charger en parallèle : contacts Thor, orgs Zammad, users Zammad
  const [thorContacts, zammadOrgs, zammadUsers] = await Promise.all([
    prisma.contact.findMany({
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, zammadUserId: true, noSync: true,
        client: { select: { name: true, noSync: true } },
      },
    }),
    fetchAllOrgs(),
    fetchAllZammadUsers(),
  ])

  // Index par email (lowercase) pour la correspondance
  const orgByName  = new Map(zammadOrgs.map(o => [o.name.toLowerCase().trim(), o.id]))
  const userByEmail = new Map(zammadUsers.filter(u => u.email).map(u => [u.email!.toLowerCase(), u]))
  const thorByEmail = new Map(
    thorContacts.filter(c => c.email).map(c => [c.email!.toLowerCase(), c]),
  )
  const thorByZammadId = new Map(
    thorContacts.filter(c => c.zammadUserId).map(c => [c.zammadUserId!, c]),
  )

  let pushed     = 0
  let imported   = 0
  let historical = 0

  // ── Thor → Zammad : pousser chaque contact avec email ──────────────────────
  for (const contact of thorContacts) {
    if (!contact.email || contact.noSync || contact.client.noSync) continue
    const email = contact.email.toLowerCase()
    const existing = userByEmail.get(email)
    const orgId = orgByName.get(contact.client.name.toLowerCase().trim()) ?? null

    const newId = await upsertZammadUser({
      zammadId:       existing?.id,
      firstname:      contact.firstName,
      lastname:       contact.lastName,
      email:          contact.email,
      phone:          contact.phone,
      organizationId: orgId,
    })

    if (newId) {
      // Enregistrer le lien Zammad si nouveau
      if (!contact.zammadUserId) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { zammadUserId: newId },
        })
      }
      pushed++
    }
  }

  // ── Zammad → Thor : importer les users absents de Thor ─────────────────────
  // Récupérer tous les clients Thor pour la résolution org → client
  const thorClients = await prisma.client.findMany({ select: { id: true, name: true, noSync: true } })
  const clientByName = new Map(
    thorClients.filter(c => !c.noSync).map(c => [c.name.toLowerCase().trim(), c.id]),
  )

  for (const zUser of zammadUsers) {
    if (!zUser.email) continue
    const email = zUser.email.toLowerCase()

    // Déjà dans Thor (par email ou par zammadUserId)
    if (thorByEmail.has(email) || thorByZammadId.has(zUser.id)) continue

    // Trouver le client Thor correspondant à l'organisation Zammad
    const org = zUser.organization_id
      ? zammadOrgs.find(o => o.id === zUser.organization_id)
      : null
    const clientId = org ? (clientByName.get(org.name.toLowerCase().trim()) ?? null) : null
    if (!clientId) continue  // client absent ou noSync, on ne peut pas importer

    await prisma.contact.create({
      data: {
        clientId,
        firstName:    zUser.firstname,
        lastName:     zUser.lastname,
        email:        zUser.email,
        phone:        zUser.phone ?? null,
        zammadUserId: zUser.id,
      },
    })
    imported++
  }

  // ── Marquer historique : contacts avec zammadUserId dont le user n'existe plus ─
  const activeZammadIds = new Set(zammadUsers.map(u => u.id))
  for (const contact of thorContacts) {
    if (!contact.zammadUserId) continue
    if (contact.noSync || contact.client.noSync) continue  // ne pas toucher les contacts noSync
    if (!activeZammadIds.has(contact.zammadUserId)) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { isHistorical: true },
      })
      historical++
    }
  }

  revalidatePath('/contacts')
  return { pushed, imported, historical }
}

// ── Synchronisation depuis Microsoft 365 ─────────────────────────────────────

export async function syncContactsFromM365(
  clientId: string
): Promise<{ created: number; updated: number; skipped: number; error?: string }> {
  await requireAdmin()

  const clientCheck = await prisma.client.findUnique({ where: { id: clientId }, select: { noSync: true } })
  if (clientCheck?.noSync) {
    return { created: 0, updated: 0, skipped: 0, error: 'Synchronisation désactivée pour ce client.' }
  }

  const [accounts, defaultSite] = await Promise.all([
    prisma.m365Account.findMany({
      where: { tenant: { clientId }, accountEnabled: true },
      select: { displayName: true, userPrincipalName: true, jobTitle: true },
    }),
    prisma.site.findFirst({
      where: { clientId, isDefault: true },
      select: { id: true },
    }),
  ])

  if (accounts.length === 0) {
    return { created: 0, updated: 0, skipped: 0, error: "Aucun compte M365 actif trouvé. Synchronisez d'abord les tenants M365." }
  }

  const defaultSiteId = defaultSite?.id ?? null

  let created = 0
  let updated = 0
  let skipped = 0

  for (const acc of accounts) {
    if (!acc.displayName?.trim()) { skipped++; continue }

    const email = acc.userPrincipalName.includes('#EXT#')
      ? null
      : acc.userPrincipalName.toLowerCase()

    const parts     = acc.displayName.trim().split(/\s+/)
    const firstName = parts[0] ?? ''
    const lastName  = parts.slice(1).join(' ') || '—'
    const role      = acc.jobTitle || null

    if (email) {
      const existing = await prisma.contact.findFirst({ where: { clientId, email } })
      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            firstName, lastName, role,
            ...(existing.siteId === null && defaultSiteId ? { siteId: defaultSiteId } : {}),
          },
        })
        updated++
      } else {
        await prisma.contact.create({ data: { clientId, firstName, lastName, email, role, siteId: defaultSiteId } })
        created++
      }
    } else {
      const existing = await prisma.contact.findFirst({ where: { clientId, firstName, lastName } })
      if (!existing) {
        await prisma.contact.create({ data: { clientId, firstName, lastName, role, siteId: defaultSiteId } })
        created++
      } else {
        skipped++
      }
    }
  }

  revalidatePath('/contacts')
  return { created, updated, skipped }
}

