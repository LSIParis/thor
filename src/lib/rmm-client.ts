import axios from 'axios'

export interface RmmClient {
  id: number
  name: string
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
