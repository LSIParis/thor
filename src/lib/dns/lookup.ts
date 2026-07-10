import { resolveNs } from 'dns/promises'
import { createConnection } from 'net'

export async function lookupNs(domain: string): Promise<string | null> {
  try {
    const ns = await resolveNs(domain)
    return ns.sort().join(', ')
  } catch {
    return null
  }
}

function whoisQuery(server: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: server, port: 43 })
    let data = ''
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('timeout')) }, 8000)
    socket.on('connect', () => socket.write(`${query}\r\n`))
    socket.on('data', chunk => { data += chunk.toString('latin1') })
    socket.on('end', () => { clearTimeout(timer); resolve(data) })
    socket.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

function parseExpiryFromWhois(raw: string): Date | null {
  const patterns = [
    /Registry Expiry Date:\s*(\S+)/i,
    /Expiry Date:\s*(\S+)/i,
    /Expiration Date:\s*(\S+)/i,
    /paid-till:\s*(\S+)/i,
    /Expiration Time:\s*(\S+)/i,
    /expires:\s*(\S+)/i,
    /Expiry:\s*(\S+)/i,
    /expire:\s*(\S+)/i,
    /anniversary:\s*(\S+)/i,
  ]
  for (const re of patterns) {
    const m = raw.match(re)
    if (!m) continue
    const d = new Date(m[1])
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export async function lookupExpiryDate(domain: string): Promise<Date | null> {
  try {
    const tld = domain.split('.').slice(-1)[0]
    const ianaResp = await whoisQuery('whois.iana.org', tld)
    const serverMatch = ianaResp.match(/whois:\s+(\S+)/i)
    if (!serverMatch) return null

    const whoisServer = serverMatch[1].trim()
    const resp = await whoisQuery(whoisServer, domain)
    return parseExpiryFromWhois(resp)
  } catch {
    return null
  }
}
