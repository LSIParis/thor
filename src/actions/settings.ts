'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { encrypt } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function saveRmmSettings(formData: FormData) {
  await requireAdmin()
  const url = formData.get('rmmUrl') as string
  const rawKey = formData.get('rmmApiKey') as string

  await prisma.appSetting.upsert({
    where: { key: 'RMM_BASE_URL' },
    update: { value: url },
    create: { key: 'RMM_BASE_URL', value: url },
  })

  if (rawKey && rawKey !== '••••••••') {
    await prisma.appSetting.upsert({
      where: { key: 'RMM_API_KEY' },
      update: { value: encrypt(rawKey) },
      create: { key: 'RMM_API_KEY', value: encrypt(rawKey) },
    })
  }
  revalidatePath('/admin/settings')
}
