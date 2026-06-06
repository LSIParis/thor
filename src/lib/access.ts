import { auth } from './auth'
import { prisma } from './db'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  let session
  try {
    session = await auth()
  } catch {
    redirect('/login')
  }
  if (!session) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}

export async function getAccessibleClients(userId: string, role: string) {
  if (role === 'ADMIN') {
    return prisma.client.findMany({ orderBy: { name: 'asc' } })
  }
  // TECH and CLIENT: only assigned clients
  return prisma.client.findMany({
    where: { users: { some: { userId } } },
    orderBy: { name: 'asc' },
  })
}

export async function canAccessClient(userId: string, role: string, clientId: string) {
  if (role === 'ADMIN') return true
  const link = await prisma.userClient.findUnique({
    where: { userId_clientId: { userId, clientId } },
  })
  return !!link
}

export async function getClientLinkedToUser(userId: string) {
  const link = await prisma.userClient.findFirst({ where: { userId } })
  return link?.clientId ?? null
}
