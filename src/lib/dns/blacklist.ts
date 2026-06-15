import { resolve4, resolveMx } from 'dns/promises'
import type { BlacklistResult, RblResult } from './types'

const RBLS: { host: string; major: boolean }[] = [
  { host: 'zen.spamhaus.org', major: true },
  { host: 'b.barracudacentral.org', major: false },
  { host: 'bl.spamcop.net', major: false },
  { host: 'dnsbl.sorbs.net', major: false },
  { host: 'spam.dnsbl.sorbs.net', major: false },
  { host: 'bl.emailbasura.org', major: false },
  { host: 'dnsbl-1.uceprotect.net', major: false },
  { host: 'dnsbl-2.uceprotect.net', major: false },
  { host: 'db.wpbl.info', major: false },
  { host: 'ix.dnsbl.manitu.net', major: false },
  { host: 'dnsbl.dronebl.org', major: false },
  { host: 'singular.ttk.pte.hu', major: false },
  { host: 'spam.dnsbl.anonmails.de', major: false },
  { host: 'ubl.unsubscore.com', major: false },
  { host: 'hostkarma.junkemailfilter.com', major: false },
]

async function resolveIp(domain: string): Promise<string | null> {
  try {
    const addrs = await resolve4(domain)
    return addrs[0] ?? null
  } catch {
    try {
      const mx = await resolveMx(domain)
      if (!mx.length) return null
      const sorted = mx.sort((a, b) => a.priority - b.priority)
      const addrs = await resolve4(sorted[0].exchange)
      return addrs[0] ?? null
    } catch {
      return null
    }
  }
}

function reverseIp(ip: string): string {
  return ip.split('.').reverse().join('.')
}

export async function checkBlacklists(domain: string): Promise<BlacklistResult> {
  const ip = await resolveIp(domain)
  if (!ip) {
    return { ip: null, listed: [], cleanCount: 0, listedCount: 0, hasMajorListing: false }
  }
  if (ip.startsWith('127.')) {
    return { ip, listed: [], cleanCount: 0, listedCount: 0, hasMajorListing: false }
  }

  const reversed = reverseIp(ip)
  const results: RblResult[] = await Promise.all(
    RBLS.map(async ({ host, major }) => {
      try {
        const addrs = await resolve4(`${reversed}.${host}`)
        // 127.0.0.1 and 127.255.x.x are DNSBL error codes (resolver blocked / query refused),
        // not genuine listings — treat them as clean.
        const response = addrs[0] ?? ''
        if (response === '127.0.0.1' || response.startsWith('127.255.')) {
          return { rbl: host, listed: false, major }
        }
        return { rbl: host, listed: true, major }
      } catch {
        return { rbl: host, listed: false, major }
      }
    })
  )

  const listedResults = results.filter(r => r.listed)
  return {
    ip,
    listed: results,
    cleanCount: results.filter(r => !r.listed).length,
    listedCount: listedResults.length,
    hasMajorListing: listedResults.some(r => r.major),
  }
}
