import { NextResponse } from 'next/server'
import axios from 'axios'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchRmmClients, fetchRmmAgents, rmmAgentToEquipmentType } from '@/lib/rmm-client'

// GET: diagnostic — try each candidate path and report status
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const [urlSetting, keySetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
    prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
  ])

  if (!urlSetting?.value || !keySetting?.value) {
    return NextResponse.json({ error: 'RMM non configuré' }, { status: 400 })
  }

  const apiKey = decrypt(keySetting.value)
  const base = urlSetting.value.replace(/\/$/, '')
  const candidates = ['/api/v3/agents/', '/api/v3/agents', '/agents/', '/agents', '/api/v2/agents/', '/api/v2/agents']
  const results: Record<string, string> = {}

  for (const path of candidates) {
    try {
      const r = await axios.get(`${base}${path}`, {
        headers: { 'X-API-KEY': apiKey },
        params: { client_id: client.tacticalRmmId },
        timeout: 8000,
        validateStatus: () => true,
      })
      const isHtml = typeof r.data === 'string' && r.data.trim().startsWith('<')
      if (isHtml) {
        results[path] = `${r.status} HTML (mauvaise URL)`
      } else if (Array.isArray(r.data) && r.data.length > 0) {
        const sample = r.data[0]
        results[path] = `${r.status} OK — ${r.data.length} agents — sample keys: ${Object.keys(sample).join(', ')} — sample: ${JSON.stringify(sample).slice(0, 300)}`
      } else {
        results[path] = `${r.status} ${JSON.stringify(r.data).slice(0, 200)}`
      }
    } catch (err: any) {
      results[path] = err?.code ?? err?.message ?? 'network error'
    }
  }

  return NextResponse.json({ base, rmmClientId: client.tacticalRmmId, results })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { clientId } = await params

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    if (!client.tacticalRmmId) {
      return NextResponse.json({ error: "Ce client n'est pas lié à Tactical RMM" }, { status: 400 })
    }

    const [urlSetting, keySetting] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'RMM_BASE_URL' } }),
      prisma.appSetting.findUnique({ where: { key: 'RMM_API_KEY' } }),
    ])

    if (!urlSetting?.value || !keySetting?.value) {
      return NextResponse.json({ error: 'RMM non configuré dans les paramètres' }, { status: 400 })
    }

    const apiKey = decrypt(keySetting.value)

    // Resolve RMM client name (agents are filtered by client_name, not client_id)
    let rmmClientName: string
    try {
      const rmmClients = await fetchRmmClients(urlSetting.value, apiKey)
      const rmmClient = rmmClients.find((c) => String(c.id) === client.tacticalRmmId)
      if (!rmmClient) {
        return NextResponse.json(
          { error: `Client RMM id=${client.tacticalRmmId} introuvable dans Tactical RMM` },
          { status: 404 },
        )
      }
      rmmClientName = rmmClient.name
    } catch (err: any) {
      const detail = err?.response?.status
        ? `HTTP ${err.response.status} — ${err.response.statusText}`
        : err?.code ?? err?.message ?? 'Unknown error'
      return NextResponse.json({ error: `RMM clients : ${detail}` }, { status: 502 })
    }

    let agents
    try {
      agents = await fetchRmmAgents(urlSetting.value, apiKey, rmmClientName)
    } catch (err: any) {
      const detail = err?.response?.status
        ? `HTTP ${err.response.status} — ${err.response.statusText}`
        : err?.code ?? err?.message ?? 'Unknown error'
      return NextResponse.json({ error: `RMM agents : ${detail}` }, { status: 502 })
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const agent of agents) {
      if (!agent.agent_id) continue
      const type = rmmAgentToEquipmentType(agent)
      const localIp = agent.local_ips?.split(',')[0]?.trim() || agent.public_ip || null
      const brand = agent.make_model?.split(' ')[0] || null
      const model = agent.make_model || agent.hostname

      const existing = await prisma.equipment.findUnique({ where: { rmmAgentId: agent.agent_id } })

      if (!existing) {
        await prisma.equipment.create({
          data: {
            clientId,
            rmmAgentId: agent.agent_id,
            type,
            brand,
            model,
            serialNumber: agent.serial_number || null,
            operatingSystem: agent.operating_system || null,
            ipAddress: localIp,
            notes: agent.description || null,
          },
        })
        created++
      } else {
        const changed =
          existing.type !== type ||
          existing.model !== model ||
          existing.operatingSystem !== (agent.operating_system || null) ||
          existing.ipAddress !== localIp

        if (changed) {
          await prisma.equipment.update({
            where: { id: existing.id },
            data: {
              type,
              brand,
              model,
              serialNumber: agent.serial_number || null,
              operatingSystem: agent.operating_system || null,
              ipAddress: localIp,
            },
          })
          updated++
        } else {
          unchanged++
        }
      }
    }

    return NextResponse.json({ created, updated, unchanged, total: agents.length })
  } catch (err: any) {
    console.error('[RMM agents import]', err)
    return NextResponse.json(
      { error: `Erreur interne : ${err?.message ?? String(err)}` },
      { status: 500 },
    )
  }
}
