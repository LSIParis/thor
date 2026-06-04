'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveOvhConfig(clientId: string, formData: FormData) {
  await requireAdmin()

  const applicationKey    = formData.get('applicationKey') as string
  const rawAppSecret      = formData.get('applicationSecret') as string
  const rawConsumerKey    = formData.get('consumerKey') as string
  const endpoint          = (formData.get('endpoint') as string) || 'ovh-eu'

  const applicationSecret = encrypt(rawAppSecret)
  const consumerKey       = encrypt(rawConsumerKey)

  await prisma.ovhConfig.upsert({
    where:  { clientId },
    update: { endpoint, applicationKey, applicationSecret, consumerKey },
    create: { clientId, endpoint, applicationKey, applicationSecret, consumerKey },
  })

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteOvhConfig(clientId: string) {
  await requireAdmin()
  await prisma.ovhConfig.delete({ where: { clientId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}
