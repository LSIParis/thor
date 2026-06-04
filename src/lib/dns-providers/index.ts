export interface DnsProvider {
  /** Returns all zone names managed by this registrar account */
  listZones(): Promise<string[]>
  /** Returns the declared NS hostnames for a zone (from registrar API) */
  getZoneNameservers(zone: string): Promise<string[]>
  /** Optional: returns DNS records directly from the registrar (no NS query needed) */
  getZoneRecordsDirect?(zone: string): Promise<Array<{
    type: string; name: string; value: string; ttl: number | null; priority: number | null
  }>>
}
