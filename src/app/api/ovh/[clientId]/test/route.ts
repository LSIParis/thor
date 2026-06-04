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
  const config = await prisma.registrarConfig.findUnique({
    where: { clientId_provider: { clientId, provider: 'ovh' } },
  })
  if (!config) return NextResponse.json({ error: 'OVH non configuré' }, { status: 400 })

  const appSecret   = config.apiSecret ? decrypt(config.apiSecret) : ''
  const consumerKey = config.apiToken  ? decrypt(config.apiToken)  : ''
  const ovh         = new OvhClient(config.login ?? 'ovh-eu', config.apiKey ?? '', appSecret, consumerKey)

  try {
    const me = await ovh.get<{ nichandle: string; firstname: string; name: string }>('/me')
    return NextResponse.json({ ok: true, account: me.nichandle, name: `${me.firstname} ${me.name}` })
  } catch (err: any) {
    const status = err?.response?.status
    const msg    = err?.response?.data?.message ?? ''
    if (status === 401) return NextResponse.json({ error: `401 — Application Key ou signature invalide. ${msg}` }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: `403 — Consumer Key refusée. ${msg}` }, { status: 403 })
    return NextResponse.json({ error: `OVH inaccessible : ${err?.code ?? err?.message}` }, { status: 502 })
  }
}
