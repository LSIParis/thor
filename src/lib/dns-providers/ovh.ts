import { OvhClient } from '@/lib/ovh-client'
import type { DnsProvider } from './index'

interface OvhZoneInfo { nameServers: string[] }

export class OvhDnsProvider implements DnsProvider {
  private client: OvhClient

  constructor(endpoint: string, appKey: string, appSecret: string, consumerKey: string) {
    this.client = new OvhClient(endpoint, appKey, appSecret, consumerKey)
  }

  async listZones(): Promise<string[]> {
    return this.client.get<string[]>('/domain/zone')
  }

  async getZoneNameservers(zone: string): Promise<string[]> {
    const info = await this.client.get<OvhZoneInfo>(`/domain/zone/${zone}`)
    return info.nameServers ?? []
  }
}
