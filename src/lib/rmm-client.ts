import axios from 'axios'

export interface RmmClient {
  id: number
  name: string
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
