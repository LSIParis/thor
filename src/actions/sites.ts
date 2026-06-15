'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'

const siteFields = (formData: FormData) => ({
  name:           formData.get('name') as string,
  address:        (formData.get('address') as string) || null,
  city:           (formData.get('city') as string) || null,
  postalCode:     (formData.get('postalCode') as string) || null,
  country:        (formData.get('country') as string) || 'France',
  phone:          (formData.get('phone') as string) || null,
  email:          (formData.get('email') as string) || null,
  digicode1:      (formData.get('digicode1') as string) || null,
  digicode2:      (formData.get('digicode2') as string) || null,
  interphone:     (formData.get('interphone') as string) || null,
  etage:          (formData.get('etage') as string) || null,
  heureOuverture: (formData.get('heureOuverture') as string) || null,
  heureFermeture: (formData.get('heureFermeture') as string) || null,
  isHeadquarters: formData.get('isHeadquarters') === 'true',
  isDefault:      formData.get('isDefault') === 'true',
  notes:          (formData.get('notes') as string) || null,
})

export async function createSite(formData: FormData) {
  await requireAdmin()
  await prisma.site.create({
    data: { clientId: formData.get('clientId') as string, ...siteFields(formData) },
  })
  revalidatePath('/sites')
}

export async function updateSite(siteId: string, formData: FormData) {
  await requireAdmin()
  await prisma.site.update({ where: { id: siteId }, data: siteFields(formData) })
  revalidatePath('/sites')
}

export async function deleteSite(siteId: string) {
  await requireAdmin()
  await prisma.site.delete({ where: { id: siteId } })
  revalidatePath('/sites')
}

export async function deleteSitesBulk(ids: string[]) {
  await requireAdmin()
  if (ids.length === 0) return
  await prisma.site.deleteMany({ where: { id: { in: ids } } })
  revalidatePath('/sites')
}
