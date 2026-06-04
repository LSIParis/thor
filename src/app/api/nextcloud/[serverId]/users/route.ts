import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import axios from 'axios'

export interface NextcloudUser {
  id: string
  displayName: string
  email: string
  lastLogin: number
  enabled: boolean
  quota: { used: number; total: number; relative: number } | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serverId } = await params

  const server = await prisma.nextcloudServer.findUnique({
    where: { id: serverId },
  })
  if (!server) return NextResponse.json({ error: 'Serveur introuvable' }, { status: 404 })
  if (!server.adminUser || !server.adminPassword) {
    return NextResponse.json({ error: 'Identifiants admin non configurés pour ce serveur' }, { status: 400 })
  }

  const password = decrypt(server.adminPassword)
  const baseUrl = server.url.replace(/\/$/, '')

  // Récupérer la liste des utilisateurs avec détails via OCS API v2
  let ocsData: any
  try {
    const resp = await axios.get(`${baseUrl}/ocs/v2.php/cloud/users/details`, {
      params: { format: 'json' },
      headers: {
        Authorization: `Basic ${Buffer.from(`${server.adminUser}:${password}`).toString('base64')}`,
        'OCS-APIREQUEST': 'true',
      },
      timeout: 15000,
    })
    ocsData = resp.data
  } catch (err: any) {
    const detail = err?.response?.status
      ? `HTTP ${err.response.status}`
      : err?.code ?? err?.message ?? 'Unknown'
    return NextResponse.json({ error: `Nextcloud inaccessible : ${detail}` }, { status: 502 })
  }

  // Extraire les utilisateurs depuis la réponse OCS
  const rawUsers = ocsData?.ocs?.data?.users ?? {}
  const users: NextcloudUser[] = Object.entries(rawUsers).map(([id, u]: [string, any]) => ({
    id,
    displayName: u.displayname ?? id,
    email: u.email ?? '',
    lastLogin: u.lastLogin ?? 0,
    enabled: u.enabled !== false,
    quota: u.quota
      ? { used: u.quota.used ?? 0, total: u.quota.total ?? 0, relative: u.quota.relative ?? 0 }
      : null,
  }))

  return NextResponse.json({ users, total: users.length })
}
