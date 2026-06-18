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
  let page = 1
  let prevSignature = ''
  while (true) {
    const res = await fetch(
      `${url}${url.includes('?') ? '&' : '?'}page=${page}&per_page=100`,
      { headers: authHeaders(), cache: 'no-store', signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) break
    const json = await res.json() as { content?: T[] }
    const items = json.content ?? []
    if (items.length === 0) break
    const sig = JSON.stringify(items)
    if (sig === prevSignature) break
    prevSignature = sig
    all.push(...items)
    page++
  }
  return all
}

export async function fetchDesk365Companies(): Promise<string[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  const [companies, contacts] = await Promise.all([
    fetchAllPages<{ name?: string }>(`${base}/companies`),
    fetchAllPages<{ company_name?: string | null }>(`${base}/contacts`),
  ])

  const seen = new Set<string>()
  for (const c of companies) { if (c.name?.trim()) seen.add(c.name.trim()) }
  for (const c of contacts)  { if (c.company_name?.trim()) seen.add(c.company_name.trim()) }
  return [...seen].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

export async function createDesk365Company(name: string): Promise<{ ok: true } | { error: string }> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return { error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }

  const res = await fetch(`${base}/companies/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text) as { description?: string; errors?: { message: string }[] }
      return { error: json.errors?.[0]?.message ?? json.description ?? `HTTP ${res.status}` }
    } catch {
      return { error: `HTTP ${res.status}` }
    }
  }
  // Create a placeholder contact so the company appears in /contacts responses
  await fetch(`${base}/contacts/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, company_name: name }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  return { ok: true }
}

export function desk365Configured(): boolean {
  return !!(process.env.DESK365_SUBDOMAIN && process.env.DESK365_API_KEY)
}
