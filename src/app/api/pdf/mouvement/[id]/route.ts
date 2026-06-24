import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/access'
import { prisma } from '@/lib/db'
import { generateHandoverHtml } from '@/lib/handover-html'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth()

  const { id } = await params
  const reprise = req.nextUrl.searchParams.get('reprise') ?? ''

  const m = await prisma.personnelMovement.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, email: true } },
      assignedEquipment: {
        select: { type: true, brand: true, model: true, serialNumber: true },
      },
    },
  })

  if (!m) {
    return new NextResponse('Mouvement introuvable', { status: 404 })
  }

  const html = generateHandoverHtml(m, reprise, true)

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
