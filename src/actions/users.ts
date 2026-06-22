'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { sendMail } from '@/lib/mailer'

function generateToken() {
  return randomBytes(32).toString('hex')
}

function tokenExpiry() {
  const d = new Date()
  d.setHours(d.getHours() + 72)
  return d
}

async function sendActivationEmail(name: string, email: string, token: string) {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${base}/verify/${token}`
  await sendMail({
    to: email,
    subject: 'Activez votre compte LSI Portal',
    html: `
      <p>Bonjour ${name},</p>
      <p>Votre compte a été créé sur le portail LSI Maintenance.</p>
      <p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et activer votre compte :</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;border-radius:6px;text-decoration:none">Activer mon compte</a></p>
      <p style="color:#888;font-size:12px">Ce lien expire dans 72 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `,
  })
}

export async function createUser(formData: FormData) {
  await requireAdmin()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = ((formData.get('role') as string) || 'TECH') as 'ADMIN' | 'TECH' | 'CLIENT'
  const clientId = formData.get('clientId') as string | null

  const token = generateToken()
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: '',
      role,
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpiry: tokenExpiry(),
    },
  })

  if (clientId) {
    await prisma.userClient.upsert({
      where: { userId_clientId: { userId: user.id, clientId } },
      update: {},
      create: { userId: user.id, clientId },
    })
  }

  await sendActivationEmail(name, email, token)
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

export async function resendVerificationEmail(userId: string) {
  await requireAdmin()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.emailVerified) return
  const token = generateToken()
  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken: token, verificationTokenExpiry: tokenExpiry() },
  })
  await sendActivationEmail(user.name, user.email, token)
  revalidatePath(`/admin/users/${userId}`)
  redirect(`/admin/users/${userId}`)
}

export async function manuallyVerifyUser(userId: string) {
  await requireAdmin()
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null },
  })
  revalidatePath(`/admin/users/${userId}`)
  redirect(`/admin/users/${userId}`)
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) redirect('/forgot-password')

  const user = await prisma.user.findUnique({ where: { email } })
  if (user && user.emailVerified) {
    const token = generateToken()
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 1)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    })
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const link = `${base}/reset-password/${token}`
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[reset-password] Lien de réinitialisation pour ${email} : ${link}`)
    }
    await sendMail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe LSI Portal',
      html: `
        <p>Bonjour ${user.name},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur le portail LSI Maintenance.</p>
        <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable 1 heure) :</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;border-radius:6px;text-decoration:none">Réinitialiser mon mot de passe</a></p>
        <p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `,
    })
  }
  redirect('/forgot-password?sent=1')
}

export async function resetPassword(token: string, formData: FormData) {
  const password = formData.get('password') as string
  if (!password || password.length < 8) redirect(`/reset-password/${token}?error=weak`)

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })
  if (!user) redirect('/login?reset=invalid')
  if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
    redirect(`/reset-password/${token}?error=expired`)
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, passwordResetToken: null, passwordResetExpiry: null },
  })
  redirect('/login?reset=1')
}

export async function activateAccount(token: string, formData: FormData) {
  const password = formData.get('password') as string
  if (!password || password.length < 8) redirect(`/verify/${token}?error=weak`)

  const user = await prisma.user.findUnique({ where: { verificationToken: token } })
  if (!user) redirect('/verify/invalid')
  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    redirect(`/verify/${token}?error=expired`)
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })
  redirect('/login?activated=1')
}
