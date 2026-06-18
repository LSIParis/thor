'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fetchDesk365Contacts, createDesk365Contact, desk365Configured } from '@/lib/desk365'
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
      visible:   formData.get('visible') === 'true',
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
      visible:   formData.get('visible') === 'true',
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

export async function setContactsNoSync(ids: string[], noSync: boolean) {
  await requireAdmin()
  if (ids.length === 0) return
  await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { noSync } })
  revalidatePath('/contacts')
}

export async function setContactsVisible(ids: string[], visible: boolean) {
  await requireAdmin()
  if (ids.length === 0) return
  await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { visible } })
  revalidatePath('/contacts')
}

// ── Synchronisation vers Desk365 ─────────────────────────────────────────────

type ContactRef = { name: string; email: string; company: string }

export async function syncVisibleContactsToDesk365(): Promise<{
  created: number
  skipped: number
  toDelete: ContactRef[]
  orphans: ContactRef[]
  error?: string
}> {
  await requireAdmin()

  const empty = { created: 0, skipped: 0, toDelete: [], orphans: [] }

  if (!desk365Configured()) {
    return { ...empty, error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }
  }

  try {
    const [thorVisible, thorNoSync, thorAllEmails, desk365Contacts] = await Promise.all([
      prisma.contact.findMany({
        where: { visible: true },
        select: {
          firstName: true, lastName: true,
          email: true, phone: true, role: true,
          client: { select: { name: true } },
        },
      }),
      prisma.contact.findMany({
        where: { noSync: true, email: { not: null } },
        select: {
          firstName: true, lastName: true,
          email: true,
          client: { select: { name: true } },
        },
      }),
      prisma.contact.findMany({
        where: { email: { not: null } },
        select: { email: true },
      }),
      fetchDesk365Contacts(),
    ])

    const existingEmails = new Set(
      desk365Contacts.map(c => c.primary_email?.toLowerCase().trim()).filter(Boolean)
    )
    const thorEmails = new Set(
      thorAllEmails.map(c => c.email!.toLowerCase().trim())
    )

    let created = 0
    let skipped = 0

    for (const c of thorVisible) {
      const name = `${c.firstName} ${c.lastName}`.trim()
      const email = c.email?.toLowerCase().trim() || null
      const companyName = c.client.name

      if (!email) { skipped++; continue }
      if (existingEmails.has(email)) { skipped++; continue }

      let result = await createDesk365Contact({
        name,
        primary_email: email,
        phone: c.phone ?? null,
        title: c.role ?? null,
        company_name: companyName,
      })

      if ('error' in result && /company/i.test(result.error)) {
        result = await createDesk365Contact({
          name,
          primary_email: email,
          phone: c.phone ?? null,
          title: c.role ?? null,
        })
      }

      if ('error' in result) { skipped++; continue }
      created++
    }

    // Contacts noSync dans Thor présents dans Desk365 → à supprimer manuellement
    const toDelete = thorNoSync
      .filter(c => existingEmails.has(c.email!.toLowerCase().trim()))
      .map(c => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email!,
        company: c.client.name,
      }))

    // Contacts dans Desk365 absents de Thor (par email)
    const orphans = desk365Contacts
      .filter(c => {
        const e = c.primary_email?.toLowerCase().trim()
        return e && !thorEmails.has(e)
      })
      .map(c => ({
        name: c.name ?? '',
        email: c.primary_email!,
        company: c.company_name ?? '',
      }))

    return { created, skipped, toDelete, orphans }
  } catch (e) {
    console.error('[syncVisibleContactsToDesk365]', e)
    return { ...empty, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
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

