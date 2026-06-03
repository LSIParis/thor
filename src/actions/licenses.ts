'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createLicense(clientId: string, formData: FormData) {
  await requireAdmin()
  const expiryRaw = formData.get('expiryDate') as string
  await prisma.license.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      publisher: (formData.get('publisher') as string) || null,
      expiryDate: expiryRaw ? new Date(expiryRaw) : null,
      seats: formData.get('seats') ? parseInt(formData.get('seats') as string, 10) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function deleteLicense(licenseId: string, clientId: string) {
  await requireAdmin()
  await prisma.license.delete({ where: { id: licenseId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}
