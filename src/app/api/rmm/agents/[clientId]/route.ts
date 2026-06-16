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
    if (client.noSync) {
      return NextResponse.json({ error: 'Synchronisation désactivée pour ce client.' }, { status: 400 })
    }
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

    // Build site lookup: lowercase name → site id
    const clientSites = await prisma.site.findMany({
      where: { clientId },
      select: { id: true, name: true },
    })
    const siteMap = new Map(clientSites.map((s) => [s.name.toLowerCase(), s.id]))

    // Build contact lookup for description-based user matching
    const clientContacts = await prisma.contact.findMany({
      where: { clientId },
      select: { id: true, firstName: true, lastName: true },
    })

    function matchContactFromDescription(description: string | null): string | null {
      if (!description) return null
      const desc = description.toLowerCase()
      for (const c of clientContacts) {
        const fn = c.firstName.toLowerCase()
        const ln = c.lastName.toLowerCase()
        if (
          desc.includes(`${fn} ${ln}`) ||
          desc.includes(`${ln} ${fn}`) ||
          desc.includes(`${ln}, ${fn}`)
        ) return c.id
      }
      return null
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const agent of agents) {
      if (!agent.agent_id) continue
      const type   = rmmAgentToEquipmentType(agent)
      const localIp = agent.local_ips?.split(',')[0]?.trim() || agent.public_ip || null
      const brand   = agent.make_model?.split(' ')[0] || null
      const model   = agent.make_model || agent.hostname
      const siteId  = agent.site_name ? (siteMap.get(agent.site_name.toLowerCase()) ?? null) : null
      const assignedToId = matchContactFromDescription(agent.description)

      const existing = await prisma.equipment.findUnique({
        where: { rmmAgentId: agent.agent_id },
        select: { id: true, noSync: true, model: true, operatingSystem: true, ipAddress: true, siteId: true, assignedToId: true },
      })

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
            siteId,
            assignedToId,
            notes: agent.description || null,
          },
        })
        created++
      } else if (existing.noSync) {
        unchanged++
      } else {
        // type is intentionally excluded from updates — preserve manual classification from Parc
        const changed =
          existing.model !== model ||
          existing.operatingSystem !== (agent.operating_system || null) ||
          existing.ipAddress !== localIp ||
          existing.siteId !== siteId ||
          (assignedToId !== null && existing.assignedToId !== assignedToId)

        if (changed) {
          await prisma.equipment.update({
            where: { id: existing.id },
            data: {
              brand,
              model,
              serialNumber: agent.serial_number || null,
              operatingSystem: agent.operating_system || null,
              ipAddress: localIp,
              siteId,
              ...(assignedToId !== null ? { assignedToId } : {}),
            },
          })
          updated++
        } else {
          unchanged++
        }
      }
    }

    // Bidirectional: remove Thor equipment whose RMM agent no longer exists
    const activeAgentIds = new Set(agents.map((a) => a.agent_id).filter(Boolean))
    const rmmLinked = await prisma.equipment.findMany({
      where: { clientId, rmmAgentId: { not: null } },
      select: { id: true, rmmAgentId: true, noSync: true },
    })
    let deleted = 0
    for (const eq of rmmLinked) {
      if (eq.rmmAgentId && !activeAgentIds.has(eq.rmmAgentId) && !eq.noSync) {
        await prisma.equipment.delete({ where: { id: eq.id } })
        deleted++
      }
    }

    return NextResponse.json({ created, updated, unchanged, deleted, total: agents.length })
  } catch (err: any) {
    console.error('[RMM agents import]', err)
    return NextResponse.json(
      { error: `Erreur interne : ${err?.message ?? String(err)}` },
      { status: 500 },
    )
  }
}
