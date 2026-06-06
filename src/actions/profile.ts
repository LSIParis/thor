'use server'

import { prisma } from '@/lib/db'
import { requireAuth, getClientLinkedToUser } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function updateUserProfile(formData: FormData) {
  const session = await requireAuth()
  const userId = session.user.id

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()
  const confirm = (formData.get('confirmPassword') as string)?.trim()

  const data: Record<string, string> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) {
    if (password !== confirm) throw new Error('Les mots de passe ne correspondent pas')
    if (password.length < 8) throw new Error('Mot de passe trop court (min. 8 caractères)')
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: userId }, data })
  }

  revalidatePath('/profil')
}

export async function updateClientProfile(formData: FormData) {
  const session = await requireAuth()
  const clientId = await getClientLinkedToUser(session.user.id)
  if (!clientId) throw new Error('Aucun client associé')

  const email = (formData.get('clientEmail') as string)?.trim() || null
  const logoPath = formData.get('logoPath') as string | null

  await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(email !== undefined ? { email } : {}),
      ...(logoPath ? { logoPath } : {}),
    },
  })

  revalidatePath('/profil')
}
