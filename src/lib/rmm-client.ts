import axios from 'axios'

export interface RmmClient {
  id: number
  name: string
}

export interface RmmSite {
  id: number
  name: string
  client: number
  client_name: string
}

export interface RmmAgent {
  agent_id: string
  hostname: string
  description: string
  operating_system: string
  public_ip: string
  local_ips: string
  cpu_model: string[]
  physical_disks: unknown[]
  plat: 'windows' | 'linux' | 'darwin'
  version: string
  last_seen: string
  status: string
  client_name: string
  site_name: string
  monitoring_type: string
  make_model: string
  serial_number: string
}

const CANDIDATE_PATHS = [
  '/api/v3/clients/',
  '/clients/',
  '/api/v2/clients/',
]

const SITE_CANDIDATE_PATHS = [
  '/api/v3/sites/',
  '/sites/',
  '/api/v2/sites/',
]

export async function fetchRmmSites(baseUrl: string, apiKey: string, rmmClientId: string): Promise<RmmSite[]> {
  const url = baseUrl.replace(/\/$/, '')
  const headers = { 'X-API-KEY': apiKey }
  let lastError: any

  for (const path of SITE_CANDIDATE_PATHS) {
    try {
      const response = await axios.get<RmmSite[]>(`${url}${path}`, { headers, timeout: 10000 })
      if (Array.isArray(response.data)) {
        return response.data.filter((s) => String(s.client) === rmmClientId)
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('No valid sites endpoint found')
}

export async function renameRmmClient(baseUrl: string, apiKey: string, rmmId: string, newName: string): Promise<{ ok: true } | { error: string }> {
  const url = baseUrl.replace(/\/$/, '')
  try {
    await axios.patch(
      `${url}/clients/${rmmId}/`,
      { client: { name: newName } },
      { headers: { 'X-API-KEY': apiKey }, timeout: 10000 }
    )
    return { ok: true }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 405 || status === 404) {
      try {
        await axios.put(
          `${url}/clients/${rmmId}/`,
          { client: { name: newName } },
          { headers: { 'X-API-KEY': apiKey }, timeout: 10000 }
        )
        return { ok: true }
      } catch (err2: unknown) {
        const msg = (err2 as { message?: string })?.message ?? 'Erreur inconnue'
        return { error: `Échec renommage RMM: ${msg}` }
      }
    }
    const msg = (err as { message?: string })?.message ?? 'Erreur inconnue'
    return { error: `Échec renommage RMM: ${msg}` }
  }
}

export async function deleteRmmClient(baseUrl: string, apiKey: string, rmmId: string): Promise<{ ok: true } | { error: string }> {
  const url = baseUrl.replace(/\/$/, '')
  try {
    await axios.delete(`${url}/clients/${rmmId}/`, {
      headers: { 'X-API-KEY': apiKey },
      timeout: 10000,
    })
    return { ok: true }
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message ?? 'Erreur inconnue'
    return { error: `Échec suppression RMM: ${msg}` }
  }
}

export async function createRmmClient(baseUrl: string, apiKey: string, name: string): Promise<string | null> {
  const url = baseUrl.replace(/\/$/, '')
  try {
    await axios.post(
      `${url}/clients/`,
      { client: { name }, site: { name: 'Default' } },
      { headers: { 'X-API-KEY': apiKey }, timeout: 10000 }
    )
    // Fetch clients to find the new ID
    const clients = await fetchRmmClients(baseUrl, apiKey)
    const found = clients.find((c) => c.name === name)
    return found ? String(found.id) : null
  } catch {
    return null
  }
}

export async function fetchRmmClients(baseUrl: string, apiKey: string): Promise<RmmClient[]> {
  const url = baseUrl.replace(/\/$/, '')
  let lastError: any

  for (const path of CANDIDATE_PATHS) {
    try {
      const response = await axios.get<RmmClient[]>(`${url}${path}`, {
        headers: { 'X-API-KEY': apiKey },
        timeout: 10000,
      })
      if (Array.isArray(response.data)) return response.data
    } catch (err: any) {
      if (err?.response?.status === 404) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('No valid clients endpoint found')
}

const AGENT_CANDIDATE_PATHS = [
  '/api/v3/agents/',
  '/api/v3/agents',
  '/agents/',
  '/agents',
  '/api/v2/agents/',
  '/api/v2/agents',
]

function extractAgents(data: unknown): RmmAgent[] | null {
  if (typeof data === 'string') return null
  if (Array.isArray(data)) return data as RmmAgent[]
  // Some versions wrap in { agents: [...] } or { results: [...] }
  const d = data as Record<string, unknown>
  if (Array.isArray(d?.agents)) return d.agents as RmmAgent[]
  if (Array.isArray(d?.results)) return d.results as RmmAgent[]
  return null
}

export async function fetchRmmAgents(
  baseUrl: string,
  apiKey: string,
  rmmClientName: string,
): Promise<RmmAgent[]> {
  const url = baseUrl.replace(/\/$/, '')
  const headers = { 'X-API-KEY': apiKey }
  let lastError: any

  for (const path of AGENT_CANDIDATE_PATHS) {
    try {
      const response = await axios.get(`${url}${path}`, { headers, timeout: 15000 })
      const agents = extractAgents(response.data)
      if (agents === null) continue // HTML — wrong path
      return agents.filter((a) => a.client_name === rmmClientName)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('No valid agents endpoint found')
}

export function rmmAgentToEquipmentType(agent: RmmAgent): string {
  if (agent.plat === 'darwin') return 'Mac'
  if (agent.plat === 'linux') return 'Serveur Linux'
  const os = agent.operating_system?.toLowerCase() ?? ''
  if (os.includes('server')) return 'Serveur Windows'
  if (agent.monitoring_type === 'server') return 'Serveur Windows'
  return 'Poste de travail'
}
