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
    body: JSON.stringify({ name }),
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
  const companyName = json.name ?? name

  // Create a placeholder contact so the company appears in /contacts responses
  await createDesk365PlaceholderContact(companyName)

  return { name: companyName }
}

async function createDesk365PlaceholderContact(companyName: string): Promise<void> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return

  const res = await fetch(`${base}/contacts/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: companyName, company_name: companyName }),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    console.warn('[desk365] createPlaceholderContact error', res.status, text.slice(0, 200))
  } else {
    console.log('[desk365] placeholder contact created for', companyName)
  }
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

async function fetchAllPages<T>(url: string, apiKey: string): Promise<T[]> {
  const all: T[] = []
  let page = 1
  let prevSignature = ''
  while (true) {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) break
    const json = await res.json() as { content?: T[] }
    const items = json.content ?? []
    if (items.length === 0) break
    const sig = JSON.stringify(items)
    if (sig === prevSignature) break  // API repeating same page — stop
    prevSignature = sig
    all.push(...items)
    page++
  }
  return all
}

export async function fetchDesk365Companies(): Promise<Desk365Company[]> {
  const base = BASE_URL()
  const apiKey = process.env.DESK365_API_KEY
  if (!base || !apiKey) return []

  // Combine /companies (explicit objects) + company_name from /contacts
  const [companiesRaw, contactsRaw] = await Promise.all([
    fetchAllPages<{ name?: string }>(`${base}/companies`, apiKey),
    fetchAllPages<{ company_name?: string | null }>(`${base}/contacts`, apiKey),
  ])

  const seen = new Set<string>()
  const result: Desk365Company[] = []
  const add = (name: string | undefined | null) => {
    const n = name?.trim()
    if (n && !seen.has(n)) { seen.add(n); result.push({ name: n }) }
  }
  for (const c of companiesRaw) add(c.name)
  for (const c of contactsRaw) add(c.company_name)

  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
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
  return fetchAllPages<Desk365Contact>(`${base}/contacts`, apiKey)
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
