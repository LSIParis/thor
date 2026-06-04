import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { OvhClient } from '@/lib/ovh-client'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clientId } = await params
  const config = await prisma.ovhConfig.findUnique({ where: { clientId } })
  if (!config) return NextResponse.json({ error: 'OVH non configuré' }, { status: 400 })

  const appSecret   = decrypt(config.applicationSecret)
  const consumerKey = decrypt(config.consumerKey)
  const ovh         = new OvhClient(config.endpoint, config.applicationKey, appSecret, consumerKey)

  try {
    // /me is the lightest authenticated endpoint
    const me = await ovh.get<{ nichandle: string; firstname: string; name: string }>('/me')
    return NextResponse.json({ ok: true, account: me.nichandle, name: `${me.firstname} ${me.name}` })
  } catch (err: any) {
    const status = err?.response?.status
    const ovhMsg = err?.response?.data?.message ?? ''
    if (status === 401) return NextResponse.json({ error: `401 — Application Key ou signature invalide. ${ovhMsg}` }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: `403 — Consumer Key sans droits sur /me. Ajoutez GET /me lors de la génération. ${ovhMsg}` }, { status: 403 })
    return NextResponse.json({ error: `OVH inaccessible : ${err?.code ?? err?.message}` }, { status: 502 })
  }
}
