import axios from 'axios'

export interface RmmClient {
  id: number
  name: string
}

export async function fetchRmmClients(baseUrl: string, apiKey: string): Promise<RmmClient[]> {
  const response = await axios.get<RmmClient[]>(`${baseUrl}/api/v3/clients/`, {
    headers: { 'X-API-KEY': apiKey },
  })
  return response.data
}
