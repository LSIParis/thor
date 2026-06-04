import axios from 'axios'
import type { DnsProvider } from './index'

const BASE_URL = 'https://api.lws.net/v1'

interface LwsDomainInfo { domain: string; dns1: string; dns2: string; dns3?: string; dns4?: string }
interface LwsDnsRecord  { id: string; type: string; name: string; value: string; ttl: number }
interface LwsResponse<T> { code: number; info: string; data: T }

export class LwsDnsProvider implements DnsProvider {
  constructor(
    private readonly clientId: string,
    private readonly apiKey: string,
    private readonly domains: string[],   // no list API → stored manually
  ) {}

  private get headers() {
    return {
      'X-Auth-Login': this.clientId,
      'X-Auth-Pass':  this.apiKey,
      Accept: 'application/json',
    }
  }

  async listZones(): Promise<string[]> {
    return this.domains
  }

  async getZoneNameservers(zone: string): Promise<string[]> {
    const resp = await axios.get<LwsResponse<LwsDomainInfo>>(
      `${BASE_URL}/domain/${zone}`,
      { headers: this.headers, timeout: 10000 },
    )
    const d = resp.data.data
    return [d.dns1, d.dns2, d.dns3, d.dns4].filter(Boolean) as string[]
  }

  /** LWS provides DNS records directly — no NS query needed for LWS-hosted zones */
  async getZoneRecordsDirect(zone: string): Promise<Array<{
    type: string; name: string; value: string; ttl: number | null; priority: number | null
  }>> {
    const resp = await axios.get<LwsResponse<LwsDnsRecord[]>>(
      `${BASE_URL}/domain/${zone}/zdns`,
      { headers: this.headers, timeout: 10000 },
    )
    if (resp.data.code !== 200 || !Array.isArray(resp.data.data)) return []
    return resp.data.data.map((r) => ({
      type:     r.type,
      name:     r.name || '@',
      value:    r.value,
      ttl:      r.ttl ?? null,
      priority: r.type === 'MX' ? (parseInt(r.value.split(' ')[0]) || null) : null,
    }))
  }
}
