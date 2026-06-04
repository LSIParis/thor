import axios from 'axios'
import type { DnsProvider } from './index'

const BASE_URL = 'https://api.gandi.net/v5'

interface GandiDomain { fqdn: string; nameservers: string[] }

export class GandiDnsProvider implements DnsProvider {
  constructor(private readonly apiKey: string) {}

  private get headers() {
    return {
      Authorization: `Apikey ${this.apiKey}`,
      Accept: 'application/json',
    }
  }

  async listZones(): Promise<string[]> {
    const resp = await axios.get<GandiDomain[]>(`${BASE_URL}/domain/domains`, {
      headers: this.headers,
      timeout: 15000,
    })
    return resp.data.map((d) => d.fqdn)
  }

  async getZoneNameservers(zone: string): Promise<string[]> {
    const resp = await axios.get<GandiDomain>(`${BASE_URL}/domain/domains/${zone}`, {
      headers: this.headers,
      timeout: 10000,
    })
    return resp.data.nameservers ?? []
  }
}
