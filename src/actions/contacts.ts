'use server'

import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { fetchDesk365Contacts } from '@/lib/desk365'

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

export async function importContactsFromDesk365(clientId: string) {
  const session = await requireAuth()
  if (session.user.role === 'CLIENT') return { created: 0, updated: 0, error: 'Accès refusé' }

  const raw = await fetchDesk365Contacts()
  if (raw.length === 0) return { created: 0, updated: 0, error: 'Aucun contact récupéré depuis Desk365 (vérifiez la configuration)' }

  let created = 0
  let updated = 0

  for (const c of raw) {
    if (!c.name?.trim()) continue
    const parts = c.name.trim().split(/\s+/)
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ') || '—'
    const phone = c.mobile || c.work_phone || null
    const email = c.email || null
    const role = c.job_title || null

    if (email) {
      const existing = await prisma.contact.findFirst({ where: { clientId, email } })
      if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data: { firstName, lastName, phone, role } })
        updated++
      } else {
        await prisma.contact.create({ data: { clientId, firstName, lastName, email, phone, role } })
        created++
      }
    } else {
      await prisma.contact.create({ data: { clientId, firstName, lastName, email: null, phone, role } })
      created++
    }
  }

  revalidatePath(`/clients/${clientId}`)
  return { created, updated }
}
