'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveRegistrarConfig(clientId: string, provider: string, formData: FormData) {
  await requireAdmin()

  let login:     string | null = null
  let apiKey:    string | null = null
  let apiSecret: string | null = null
  let apiToken:  string | null = null
  let extra:     string | null = null

  if (provider === 'ovh') {
    login     = (formData.get('endpoint') as string) || 'ovh-eu'
    apiKey    = (formData.get('applicationKey') as string) || null
    apiSecret = formData.get('applicationSecret') ? encrypt(formData.get('applicationSecret') as string) : null
    apiToken  = formData.get('consumerKey') ? encrypt(formData.get('consumerKey') as string) : null
  } else if (provider === 'gandi') {
    apiToken  = formData.get('apiKey') ? encrypt(formData.get('apiKey') as string) : null
  } else if (provider === 'lws') {
    login    = (formData.get('clientId') as string) || null
    apiToken = formData.get('apiKey') ? encrypt(formData.get('apiKey') as string) : null
    const domainsRaw = (formData.get('domains') as string) || ''
    const domains    = domainsRaw.split(/[\n,]+/).map(d => d.trim()).filter(Boolean)
    extra = JSON.stringify({ domains })
  }

  await prisma.registrarConfig.upsert({
    where:  { clientId_provider: { clientId, provider } },
    update: { login, apiKey, apiSecret, apiToken, extra },
    create: { clientId, provider, login, apiKey, apiSecret, apiToken, extra },
  })

  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function saveRegistrarConfigFromDnsPage(clientId: string, provider: string, formData: FormData) {
  await requireAdmin()

  let login:     string | null = null
  let apiKey:    string | null = null
  let apiSecret: string | null = null
  let apiToken:  string | null = null
  let extra:     string | null = null

  if (provider === 'ovh') {
    login     = (formData.get('endpoint') as string) || 'ovh-eu'
    apiKey    = (formData.get('applicationKey') as string) || null
    apiSecret = formData.get('applicationSecret') ? encrypt(formData.get('applicationSecret') as string) : null
    apiToken  = formData.get('consumerKey') ? encrypt(formData.get('consumerKey') as string) : null
  } else if (provider === 'gandi') {
    apiToken  = formData.get('apiKey') ? encrypt(formData.get('apiKey') as string) : null
  } else if (provider === 'lws') {
    login    = (formData.get('clientId') as string) || null
    apiToken = formData.get('apiKey') ? encrypt(formData.get('apiKey') as string) : null
    const domainsRaw = (formData.get('domains') as string) || ''
    const domains    = domainsRaw.split(/[\n,]+/).map(d => d.trim()).filter(Boolean)
    extra = JSON.stringify({ domains })
  }

  await prisma.registrarConfig.upsert({
    where:  { clientId_provider: { clientId, provider } },
    update: { login, apiKey, apiSecret, apiToken, extra },
    create: { clientId, provider, login, apiKey, apiSecret, apiToken, extra },
  })

  revalidatePath('/dns')
}

export async function deleteRegistrarConfig(clientId: string, provider: string) {
  await requireAdmin()
  await prisma.registrarConfig.delete({
    where: { clientId_provider: { clientId, provider } },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}
