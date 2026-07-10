import { resolveNs } from 'dns/promises'
import { createConnection } from 'net'
import { connect as tlsConnect } from 'tls'

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

export interface SslCertInfo {
  issuer: string | null
  issuedDate: Date | null
  expiryDate: Date | null
}

export async function lookupSslCert(domain: string): Promise<SslCertInfo | null> {
  return new Promise(resolve => {
    const socket = tlsConnect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
    })
    const timer = setTimeout(() => { socket.destroy(); resolve(null) }, 8000)
    socket.on('secureConnect', () => {
      clearTimeout(timer)
      try {
        const cert = socket.getPeerCertificate()
        socket.destroy()
        if (!cert?.subject) { resolve(null); return }
        resolve({
          issuer:     (Array.isArray(cert.issuer?.O) ? cert.issuer.O[0] : cert.issuer?.O)
                        ?? (Array.isArray(cert.issuer?.CN) ? cert.issuer.CN[0] : cert.issuer?.CN)
                        ?? null,
          issuedDate: cert.valid_from ? new Date(cert.valid_from) : null,
          expiryDate: cert.valid_to   ? new Date(cert.valid_to)   : null,
        })
      } catch {
        socket.destroy()
        resolve(null)
      }
    })
    socket.on('error', () => { clearTimeout(timer); resolve(null) })
  })
}
