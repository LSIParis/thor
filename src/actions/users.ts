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
  const role = (formData.get('role') as string) || 'TECH'
  const clientId = formData.get('clientId') as string | null

  const user = await prisma.user.create({
    data: {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      passwordHash: hash,
      role: role as 'ADMIN' | 'TECH' | 'CLIENT',
    },
  })

  if (clientId) {
    await prisma.userClient.upsert({
      where: { userId_clientId: { userId: user.id, clientId } },
      update: {},
      create: { userId: user.id, clientId },
    })
  }

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

export async function updateUser(userId: string, formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = (formData.get('role') as string) as 'ADMIN' | 'TECH' | 'CLIENT'
  await prisma.user.update({ where: { id: userId }, data: { name, email, role } })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}

export async function changePassword(userId: string, formData: FormData) {
  await requireAdmin()
  const password = formData.get('password') as string
  if (!password || password.length < 8) redirect(`/admin/users/${userId}`)
  const hash = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
  revalidatePath('/admin/users')
  redirect(`/admin/users/${userId}`)
}
