import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'

function cell(value: string | null | undefined): string {
  const s = (value ?? '').replace(/"/g, '""')
  return `"${s}"`
}

function row(cols: (string | null | undefined)[]): string {
  return cols.map(cell).join(',')
}

export async function GET(req: NextRequest) {
  const session = await requireAuth()
  const userId  = session.user.id
  const role    = session.user.role
  const isAdmin = role === 'ADMIN'

  const { searchParams } = req.nextUrl
  const selectedClientId = searchParams.get('client') ?? undefined

  const accessFilter = isAdmin ? {} : { users: { some: { userId } } }

  const clientFilter = selectedClientId
    ? isAdmin
      ? { id: selectedClientId }
      : { id: selectedClientId, users: { some: { userId } } }
    : accessFilter

  const contacts = await prisma.contact.findMany({
    where: { client: clientFilter },
    select: {
      lastName: true, firstName: true,
      email: true, phone: true, role: true, notes: true,
      client: { select: { name: true } },
      site:   { select: { name: true } },
    },
    orderBy: [{ client: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
  })

  const withClient = !selectedClientId

  const headers = [
    ...(withClient ? ['Client'] : []),
    'Nom', 'Prénom', 'Email', 'Téléphone', 'Fonction', 'Site', 'Notes',
  ]

  const lines = [
    headers.join(','),
    ...contacts.map(c =>
      row([
        ...(withClient ? [c.client.name] : []),
        c.lastName, c.firstName,
        c.email, c.phone, c.role,
        c.site?.name ?? '',
        c.notes,
      ])
    ),
  ]

  const csv = '﻿' + lines.join('\r\n') // BOM UTF-8 pour Excel

  const clientName = selectedClientId
    ? contacts[0]?.client.name ?? 'client'
    : 'tous'
  const filename = `contacts-${clientName.toLowerCase().replace(/\s+/g, '-')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
