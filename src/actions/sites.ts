'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { fetchRmmClients, fetchRmmAgents } from '@/lib/rmm-client'
import { decrypt } from '@/lib/crypto'

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

export async function importSitesFromRmm(
  clientId: string
): Promise<{ created: number; skipped: number; error?: string }> {
  await requireAdmin()

  const [urlSetting, keySetting, client] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
    prisma.client.findUnique({ where: { id: clientId }, select: { tacticalRmmId: true } }),
  ])

  if (!urlSetting?.value || !keySetting?.value) {
    return { created: 0, skipped: 0, error: 'RMM non configuré (voir Paramètres)' }
  }
  if (!client?.tacticalRmmId) {
    return { created: 0, skipped: 0, error: 'Ce client n\'est pas lié à TacticalRMM' }
  }

  const apiKey = decrypt(keySetting.value)

  // Resolve the RMM client name (agents are filtered by client_name, not by ID)
  let rmmClientName: string
  try {
    const rmmClients = await fetchRmmClients(urlSetting.value, apiKey)
    const match = rmmClients.find((c) => String(c.id) === client.tacticalRmmId)
    if (!match) return { created: 0, skipped: 0, error: 'Client introuvable dans TacticalRMM' }
    rmmClientName = match.name
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur RMM'
    return { created: 0, skipped: 0, error: msg }
  }

  let agents
  try {
    agents = await fetchRmmAgents(urlSetting.value, apiKey, rmmClientName)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur RMM'
    return { created: 0, skipped: 0, error: msg }
  }

  // Extract unique site names from agents
  const rmmSiteNames = [...new Set(agents.map((a) => a.site_name).filter(Boolean))]

  const existingSites = await prisma.site.findMany({
    where: { clientId },
    select: { name: true },
  })
  const existingNames = new Set(existingSites.map((s) => s.name.toLowerCase()))

  let created = 0
  let skipped = 0

  for (const siteName of rmmSiteNames) {
    if (existingNames.has(siteName.toLowerCase())) {
      skipped++
    } else {
      await prisma.site.create({ data: { clientId, name: siteName } })
      existingNames.add(siteName.toLowerCase())
      created++
    }
  }

  revalidatePath('/sites')
  return { created, skipped }
}
