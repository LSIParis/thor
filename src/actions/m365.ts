'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Tenants ──────────────────────────────────────────────

export async function createM365Tenant(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.m365Tenant.create({
    data: {
      clientId,
      displayName: formData.get('displayName') as string,
      tenantId: (formData.get('tenantId') as string) || null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}

export async function deleteM365Tenant(tenantId: string, clientId: string) {
  await requireAdmin()
  await prisma.m365Tenant.delete({ where: { id: tenantId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}

// ── Domains ───────────────────────────────────────────────

export async function createM365Domain(tenantId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.m365Domain.create({
    data: {
      tenantId,
      domain: formData.get('domain') as string,
      isDefault: formData.get('isDefault') === 'on',
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}

export async function deleteM365Domain(domainId: string, clientId: string) {
  await requireAdmin()
  await prisma.m365Domain.delete({ where: { id: domainId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}

// ── Accounts ──────────────────────────────────────────────

export async function createM365Account(tenantId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.m365Account.create({
    data: {
      tenantId,
      displayName: formData.get('displayName') as string,
      userPrincipalName: formData.get('userPrincipalName') as string,
      jobTitle: (formData.get('jobTitle') as string) || null,
      licensed: formData.get('licensed') === 'on',
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}

export async function deleteM365Account(accountId: string, clientId: string) {
  await requireAdmin()
  await prisma.m365Account.delete({ where: { id: accountId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=m365`)
}
