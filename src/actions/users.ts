'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  await requireAdmin()
  const password = formData.get('password') as string
  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      passwordHash: hash,
      role: formData.get('role') as 'ADMIN' | 'TECH',
    },
  })
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function assignClientToUser(userId: string, formData: FormData) {
  await requireAdmin()
  const clientId = formData.get('clientId') as string
  await prisma.userClient.upsert({
    where: { userId_clientId: { userId, clientId } },
    update: {},
    create: { userId, clientId },
  })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}

export async function unassignClientFromUser(userId: string, clientId: string) {
  await requireAdmin()
  await prisma.userClient.delete({
    where: { userId_clientId: { userId, clientId } },
  })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}
