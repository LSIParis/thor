const BASE_URL = () => {
  const sub = process.env.DESK365_SUBDOMAIN
  if (!sub) return null
  return `https://${sub}.desk365.io/apis/v3`
}

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.DESK365_API_KEY}`,
  'Content-Type': 'application/json',
})

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = []
  let nextUrl: string | null = url
  while (nextUrl) {
    let res: Response
    try {
      res = await fetch(nextUrl, { headers: authHeaders(), cache: 'no-store', signal: AbortSignal.timeout(10000) })
    } catch {
      break
    }
    if (!res.ok) break
    let json: { content?: T[]; next_page?: string | null }
    try {
      json = await res.json() as { content?: T[]; next_page?: string | null }
    } catch {
      break
    }
    const items = json.content ?? []
    if (items.length === 0) break
    all.push(...items)
    nextUrl = json.next_page ?? null
  }
  return all
}

export async function fetchDesk365Companies(): Promise<string[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  const companies = await fetchAllPages<{ name?: string }>(`${base}/companies`)
  return companies
    .map(c => c.name?.trim())
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

export async function createDesk365Company(name: string): Promise<{ ok: true } | { error: string }> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return { error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }

  let res: Response
  try {
    res = await fetch(`${base}/companies/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' }
  }
  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text) as { description?: string; errors?: { message: string }[] }
      return { error: json.errors?.[0]?.message ?? json.description ?? `HTTP ${res.status}` }
    } catch {
      return { error: `HTTP ${res.status}` }
    }
  }
  return { ok: true }
}

export interface Desk365ContactData {
  name: string
  primary_email?: string | null
  phone?: string | null
  title?: string | null
  company_name?: string | null
}

export async function fetchDesk365Contacts(): Promise<Desk365ContactData[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []
  return fetchAllPages<Desk365ContactData>(`${base}/contacts`)
}

export async function createDesk365Contact(contact: Desk365ContactData): Promise<{ ok: true } | { error: string }> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return { error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }

  let res: Response
  try {
    res = await fetch(`${base}/contacts/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(contact),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' }
  }
  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text) as { description?: string; errors?: { message: string }[] }
      return { error: json.errors?.[0]?.message ?? json.description ?? `HTTP ${res.status}` }
    } catch {
      return { error: `HTTP ${res.status}` }
    }
  }
  return { ok: true }
}

export function desk365Configured(): boolean {
  return !!(process.env.DESK365_SUBDOMAIN && process.env.DESK365_API_KEY)
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export type Desk365Ticket = {
  ticket_number: number
  subject: string
  status: string
  priority: number
  contact_name: string | null
  contact_email: string | null
  company_name: string | null
  assigned_to: string | null
  category: string | null
  created_on: string
  updated_on: string
  conversation_count: number
}

export async function fetchDesk365Tickets(maxPages = 3): Promise<Desk365Ticket[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  const all: Desk365Ticket[] = []
  let nextUrl: string | null = `${base}/tickets`
  let pages = 0

  while (nextUrl && pages < maxPages) {
    let res: Response
    try {
      res = await fetch(nextUrl, { headers: authHeaders(), cache: 'no-store', signal: AbortSignal.timeout(10000) })
    } catch { break }
    if (!res.ok) break
    let json: { tickets?: Desk365Ticket[]; next_page?: string | null }
    try { json = await res.json() as typeof json } catch { break }
    const items = json.tickets ?? []
    if (items.length === 0) break
    all.push(...items)
    nextUrl = json.next_page ?? null
    pages++
  }

  return all
}
