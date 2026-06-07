import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function authorize(credentials: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: credentials.email } })
  if (!user) return null
  if (!user.emailVerified) return null
  const valid = await bcrypt.compare(credentials.password, user.passwordHash)
  if (!valid) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
