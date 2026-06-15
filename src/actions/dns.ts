'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Registrars ────────────────────────────────────────────

export async function createRegistrarFromPage(formData: FormData) {
  await requireAdmin()
  const clientId = formData.get('clientId') as string
  await prisma.registrar.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath('/dns')
}

export async function deleteRegistrarFromPage(registrarId: string) {
  await requireAdmin()
  await prisma.registrar.delete({ where: { id: registrarId } })
  revalidatePath('/dns')
}

export async function updateRegistrarFromPage(registrarId: string, formData: FormData) {
  await requireAdmin()
  await prisma.registrar.update({
    where: { id: registrarId },
    data: {
      name:  formData.get('name') as string,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath('/dns')
}

export async function createRegistrar(clientId: string, formData: FormData) {
  await requireAdmin()
  await prisma.registrar.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteRegistrar(registrarId: string, clientId: string) {
  await requireAdmin()
  await prisma.registrar.delete({ where: { id: registrarId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

// ── DNS Zones ─────────────────────────────────────────────

export async function createDnsZoneFromPage(formData: FormData) {
  await requireAdmin()
  const registrarId = formData.get('registrarId') as string
  const exp = formData.get('expiryDate') as string
  await prisma.dnsZone.create({
    data: {
      registrarId,
      domain: formData.get('domain') as string,
      nameservers: (formData.get('nameservers') as string) || null,
      expiryDate: exp ? new Date(exp) : null,
      autoRenew: formData.get('autoRenew') === 'on',
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath('/dns')
}

export async function createDnsZone(registrarId: string, formData: FormData) {
  await requireAdmin()
  const reg = formData.get('registrationDate') as string
  const exp = formData.get('expiryDate') as string
  const zone = await prisma.dnsZone.create({
    data: {
      registrarId,
      domain: formData.get('domain') as string,
      nameservers: (formData.get('nameservers') as string) || null,
      registrationDate: reg ? new Date(reg) : null,
      expiryDate: exp ? new Date(exp) : null,
      autoRenew: formData.get('autoRenew') === 'on',
      notes: (formData.get('notes') as string) || null,
    },
    include: { registrar: { select: { clientId: true } } },
  })
  revalidatePath(`/clients/${zone.registrar.clientId}`)
  redirect(`/clients/${zone.registrar.clientId}?tab=dns`)
}

export async function deleteDnsZoneFromPage(zoneId: string) {
  await requireAdmin()
  await prisma.dnsZone.delete({ where: { id: zoneId } })
  revalidatePath('/dns')
}

export async function deleteDnsZone(zoneId: string, clientId: string) {
  await requireAdmin()
  await prisma.dnsZone.delete({ where: { id: zoneId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

// ── DNS Records ───────────────────────────────────────────

export async function createDnsRecord(zoneId: string, clientId: string, formData: FormData) {
  await requireAdmin()
  const ttlRaw = formData.get('ttl') as string
  const prioRaw = formData.get('priority') as string
  await prisma.dnsRecord.create({
    data: {
      zoneId,
      type: formData.get('type') as string,
      name: formData.get('name') as string,
      value: formData.get('value') as string,
      ttl: ttlRaw ? parseInt(ttlRaw, 10) : null,
      priority: prioRaw ? parseInt(prioRaw, 10) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteDnsRecord(recordId: string, clientId: string) {
  await requireAdmin()
  await prisma.dnsRecord.delete({ where: { id: recordId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

// ── SSL Certificates ──────────────────────────────────────

export async function createSslCertificate(clientId: string, formData: FormData) {
  await requireAdmin()
  const issued = formData.get('issuedDate') as string
  const exp = formData.get('expiryDate') as string
  await prisma.sslCertificate.create({
    data: {
      clientId,
      domain: formData.get('domain') as string,
      issuer: (formData.get('issuer') as string) || null,
      type: (formData.get('type') as string) || null,
      issuedDate: issued ? new Date(issued) : null,
      expiryDate: exp ? new Date(exp) : null,
      autoRenew: formData.get('autoRenew') === 'on',
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteSslCertificate(certId: string, clientId: string) {
  await requireAdmin()
  await prisma.sslCertificate.delete({ where: { id: certId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

// ── Hosting ───────────────────────────────────────────────

export async function createHosting(clientId: string, formData: FormData) {
  await requireAdmin()
  const renewal = formData.get('renewalDate') as string
  await prisma.hosting.create({
    data: {
      clientId,
      name: formData.get('name') as string,
      type: (formData.get('type') as string) || null,
      provider: (formData.get('provider') as string) || null,
      url: (formData.get('url') as string) || null,
      ipAddress: (formData.get('ipAddress') as string) || null,
      plan: (formData.get('plan') as string) || null,
      renewalDate: renewal ? new Date(renewal) : null,
      notes: (formData.get('notes') as string) || null,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}

export async function deleteHosting(hostingId: string, clientId: string) {
  await requireAdmin()
  await prisma.hosting.delete({ where: { id: hostingId } })
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=dns`)
}
