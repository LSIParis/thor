const BASE_URL = () => {
  const sub = process.env.DESK365_SUBDOMAIN
  if (!sub) return null
  return `https://${sub}.desk365.io/apis/v3`
}

export interface Desk365Company {
  id?: number
  name: string
}

export async function createDesk365Company(name: string): Promise<{ name: string } | { error: string }> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return { error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }

  const res = await fetch(`${base}/companies/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, custom_fields: { cf_tenant_365: true } }),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    console.error('[desk365] createCompany error', res.status, text)
    try {
      const json = JSON.parse(text) as { description?: string; errors?: { message: string }[] }
      const msg = json.errors?.[0]?.message ?? json.description ?? `HTTP ${res.status}`
      return { error: msg }
    } catch {
      return { error: `HTTP ${res.status}` }
    }
  }
  const json = JSON.parse(text) as { name?: string }
  return { name: json.name ?? name }
}

export async function renameDesk365Company(oldName: string, newName: string): Promise<{ name: string } | { error: string }> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return { error: 'DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré' }

  const encoded = encodeURIComponent(oldName)
  // Desk365 identifies companies by name (no numeric id in API).
  // Try PATCH then POST on /companies/{name}.
  const attempts: { method: string; url: string; body: unknown }[] = [
    { method: 'PATCH', url: `${base}/companies/${encoded}`, body: { name: newName } },
    { method: 'POST',  url: `${base}/companies/${encoded}`, body: { name: newName } },
    { method: 'PUT',   url: `${base}/companies/${encoded}`, body: { name: newName } },
    { method: 'PATCH', url: `${base}/companies/update`,     body: { name: oldName, new_name: newName } },
    { method: 'POST',  url: `${base}/companies/update`,     body: { name: oldName, new_name: newName } },
  ]

  for (const { method, url, body } of attempts) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const text = await res.text()
    console.log(`[desk365] renameCompany ${method} ${url}:`, res.status, text.slice(0, 200))
    if (res.status === 405 || res.status === 404) continue
    if (!res.ok) {
      try {
        const json = JSON.parse(text) as { description?: string; errors?: { message: string }[] }
        const msg = json.errors?.[0]?.message ?? json.description ?? `HTTP ${res.status}`
        return { error: msg }
      } catch {
        return { error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
      }
    }
    return { name: newName }
  }

  return { error: "L'API Desk365 ne permet pas de renommer une société (aucun endpoint accepté)" }
}

export async function fetchDesk365Companies(): Promise<Desk365Company[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  const all: Desk365Company[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${base}/companies?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) break
    const json = await res.json() as { content?: Desk365Company[]; count?: number }
    const companies = json.content ?? []
    all.push(...companies)
    if (companies.length < 100) break
    page++
  }
  return all
}

export interface Desk365Contact {
  name: string
  primary_email?: string | null
  mobile?: string | null
  phone?: string | null
  title?: string | null
  company_name?: string | null  // société dans Desk365
}

export async function fetchDesk365Contacts(): Promise<Desk365Contact[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  const all: Desk365Contact[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${base}/contacts?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) break
    const json = await res.json() as { content?: Desk365Contact[]; count?: number }
    const contacts = json.content ?? []
    all.push(...contacts)
    if (contacts.length < 100) break
    page++
  }
  return all
}

// Priority values: 1=Low, 5=Medium, 10=High, 20=Urgent
const PRIORITY = { low: 1, medium: 5, high: 10, urgent: 20 } as const

export interface Desk365TicketOpts {
  subject: string
  description: string
  contactEmail?: string | null
  priority?: keyof typeof PRIORITY
  type?: string
  group?: string
  category?: string
  customFields?: Record<string, string | boolean>
}

export async function createDesk365Ticket(opts: Desk365TicketOpts) {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) {
    console.warn('[desk365] DESK365_SUBDOMAIN ou DESK365_API_KEY non configuré — ticket non créé')
    return
  }

  const body: Record<string, unknown> = {
    subject: opts.subject,
    description: opts.description,
    status: 'open',
    priority: PRIORITY[opts.priority ?? 'medium'],
    type: opts.type ?? (process.env.DESK365_TICKET_TYPE ?? 'Demande'),
    group: opts.group ?? process.env.DESK365_GROUP ?? undefined,
    category: opts.category ?? process.env.DESK365_CATEGORY ?? undefined,
  }
  if (opts.contactEmail) body.email = opts.contactEmail
  if (opts.customFields) body.custom_fields = opts.customFields

  try {
    const res = await fetch(`${base}/tickets/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[desk365] Erreur création ticket: ${res.status} ${text}`)
    } else {
      const json = await res.json() as { ticket_number?: number }
      console.log(`[desk365] Ticket créé #${json.ticket_number ?? '?'}`)
    }
  } catch (err) {
    console.error('[desk365] Erreur réseau:', err)
  }
}
