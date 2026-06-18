interface ZammadOrg {
  id: number
  name: string
  active: boolean
}

export interface ZammadUser {
  id: number
  firstname: string
  lastname: string
  email: string | null
  phone: string | null
  organization_id: number | null
  active: boolean
  login: string
}

// ── Types publics ──────────────────────────────────────────────────────────────

export interface ZammadTicket {
  id: number
  number: string
  title: string
  state_id: number
  priority_id: number
  organization_id: number | null
  created_at: string
  updated_at: string
  // Résolus depuis les assets
  stateName:     string
  stateCategory: 'open' | 'pending' | 'closed' | 'unknown'
  priorityName:  string
  priorityColor: string | null
  orgName:       string | null
  customerName:  string | null
  ownerName:     string | null
}

export interface ZammadDashboard {
  configured:   boolean
  tickets:      ZammadTicket[]
  totalCount:   number
  countOpen:    number
  countPending: number
  countClosed:  number
  error?:       string
}

// ── Helpers internes ───────────────────────────────────────────────────────────

type State = { id: number; name: string }
type Priority  = { id: number; name: string; ui_color: string | null }
type User      = { id: number; firstname: string; lastname: string }
type Org       = { id: number; name: string }

function stateCategory(stateTypeName: string): ZammadTicket['stateCategory'] {
  switch (stateTypeName) {
    case 'new':
    case 'open':
      return 'open'
    case 'pending reminder':
    case 'pending close':
      return 'pending'
    case 'closed':
    case 'merged':
    case 'removed':
      return 'closed'
    default:
      return 'unknown'
  }
}

function buildQuery(stateIds: number[], orgName?: string, since?: Date): string {
  const parts: string[] = []
  if (stateIds.length > 0) {
    const stateClause = stateIds.map((id) => `state_id:${id}`).join(' OR ')
    parts.push(stateIds.length > 1 ? `(${stateClause})` : stateClause)
  }
  if (orgName) {
    parts.push(`organization.name:"${orgName.replace(/"/g, '')}"`)
  }
  if (since) {
    const iso = since.toISOString().split('T')[0]
    parts.push(`close_at:[${iso} TO *]`)
  }
  return parts.join(' AND ') || '*'
}

async function searchTickets(b: string, query: string, limit = 25): Promise<{
  tickets: ZammadTicket[]
  count: number
}> {
  const [searchRes, statesRes, prioritiesRes] = await Promise.all([
    // full=true → réponse { record_ids: [...], assets: { Ticket, User, Organization } }
    fetch(`${b}/tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc&full=true`, {
      headers: authHeaders(), cache: 'no-store',
    }),
    fetch(`${b}/ticket_states`,     { headers: authHeaders(), cache: 'no-store' }),
    fetch(`${b}/ticket_priorities`, { headers: authHeaders(), cache: 'no-store' }),
  ])

  const states:     State[]    = statesRes.ok     ? await statesRes.json()    : []
  const priorities: Priority[] = prioritiesRes.ok ? await prioritiesRes.json() : []

  if (!searchRes.ok) {
    return { tickets: [], count: 0 }
  }

  const data = await searchRes.json() as {
    record_ids?: number[]
    assets?: {
      Ticket?:       Record<string, any>
      Organization?: Record<string, any>
      User?:         Record<string, any>
    }
  }

  const recordIds  = data.record_ids ?? []
  const assets     = data.assets ?? {}
  const rawTickets: Record<string, any> = assets.Ticket       ?? {}
  const rawOrgs:    Record<string, any> = assets.Organization ?? {}
  const rawUsers:   Record<string, any> = assets.User         ?? {}

  const stateMap    = new Map(states.map((s) => [s.id, s]))
  const priorityMap = new Map(priorities.map((p) => [p.id, p]))

  const users: Record<number, User> = {}
  for (const [id, u] of Object.entries(rawUsers)) {
    users[Number(id)] = u as User
  }
  const orgs: Record<number, Org> = {}
  for (const [id, o] of Object.entries(rawOrgs)) {
    orgs[Number(id)] = o as Org
  }

  const tickets: ZammadTicket[] = recordIds.map((id) => {
    const raw      = rawTickets[String(id)] ?? {}
    const state    = stateMap.get(raw.state_id)
    const priority = priorityMap.get(raw.priority_id)
    const customer = raw.customer_id ? users[raw.customer_id] : null
    const owner    = raw.owner_id    ? users[raw.owner_id]    : null

    return {
      id:              raw.id,
      number:          raw.number ?? String(id),
      title:           raw.title  ?? '—',
      state_id:        raw.state_id,
      priority_id:     raw.priority_id,
      organization_id: raw.organization_id ?? null,
      created_at:      raw.created_at ?? '',
      updated_at:      raw.updated_at ?? '',
      stateName:       state?.name    ?? '—',
      stateCategory:   stateCategory(state?.name ?? ''),
      priorityName:    priority?.name ?? '—',
      priorityColor:   priority?.ui_color ?? null,
      orgName:         raw.organization_id ? (orgs[raw.organization_id]?.name ?? null) : null,
      customerName:    customer ? `${customer.firstname} ${customer.lastname}`.trim() : null,
      ownerName:       owner?.login && owner.login !== '-'
                         ? `${owner.firstname} ${owner.lastname}`.trim()
                         : null,
    }
  })

  return { tickets, count: recordIds.length }
}

// ── Fonction principale ────────────────────────────────────────────────────────

export async function fetchZammadDashboard(orgName?: string): Promise<ZammadDashboard> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) {
    return { configured: false, tickets: [], totalCount: 0, countOpen: 0, countPending: 0, countClosed: 0 }
  }

  try {
    // Fetch states — derive category from name (ticket_state_types n'est pas dispo dans toutes les versions)
    const statesRes = await fetch(`${b}/ticket_states`, { headers: authHeaders(), cache: 'no-store' })
    const states: State[] = statesRes.ok ? await statesRes.json() : []

    const openIds:    number[] = []
    const pendingIds: number[] = []
    const closedIds:  number[] = []
    for (const s of states) {
      const cat = stateCategory(s.name)
      if (cat === 'open')    openIds.push(s.id)
      if (cat === 'pending') pendingIds.push(s.id)
      if (cat === 'closed')  closedIds.push(s.id)
    }

    // Parallel: recent tickets list + 3 count queries
    const activeIds    = [...openIds, ...pendingIds]
    const recentQuery  = buildQuery(activeIds, orgName)
    const openQuery    = buildQuery(openIds,    orgName)
    const pendingQuery = buildQuery(pendingIds, orgName)
    const closedQuery  = buildQuery(closedIds,  orgName)

    const countQuery = (q: string) =>
      fetch(`${b}/tickets/search?query=${encodeURIComponent(q)}&limit=1000`,
        { headers: authHeaders(), cache: 'no-store' })
        .then((r) => r.ok ? r.json() : [])
        .then((d: unknown) => Array.isArray(d) ? d.length : 0)

    const [recent, openCount, pendingCount, closedCount] = await Promise.all([
      searchTickets(b, recentQuery, 25),
      countQuery(openQuery),
      countQuery(pendingQuery),
      countQuery(closedQuery),
    ])

    return {
      configured:   true,
      tickets:      recent.tickets,
      totalCount:   openCount + pendingCount + closedCount,
      countOpen:    openCount,
      countPending: pendingCount,
      countClosed:  closedCount,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return { configured: true, tickets: [], totalCount: 0, countOpen: 0, countPending: 0, countClosed: 0, error: msg }
  }
}

export async function countClosedTicketsSince(
  orgName: string | undefined,
  since: Date
): Promise<number> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) return 0
  try {
    const statesRes = await fetch(`${b}/ticket_states`, { headers: authHeaders(), cache: 'no-store' })
    const states: State[] = statesRes.ok ? await statesRes.json() : []
    const closedIds = states.filter(s => stateCategory(s.name) === 'closed').map(s => s.id)
    if (closedIds.length === 0) return 0
    const query = buildQuery(closedIds, orgName, since)
    const res = await fetch(
      `${b}/tickets/search?query=${encodeURIComponent(query)}&limit=1000`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (!res.ok) return 0
    const d = await res.json() as unknown
    return Array.isArray(d) ? d.length : 0
  } catch {
    return 0
  }
}

function base() {
  const url = process.env.ZAMMAD_URL
  if (!url) return null
  return `${url.replace(/\/$/, '')}/api/v1`
}

function authHeaders() {
  return {
    Authorization: `Token token=${process.env.ZAMMAD_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchAllOrgs(): Promise<ZammadOrg[]> {
  const b = base()
  if (!b) return []

  const all: ZammadOrg[] = []
  let page = 1

  while (true) {
    const res = await fetch(`${b}/organizations?limit=500&page=${page}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) break
    const items = (await res.json()) as ZammadOrg[]
    if (!Array.isArray(items) || items.length === 0) break
    all.push(...items)
    if (items.length < 500) break
    page++
  }

  return all
}

export async function fetchAllZammadUsers(): Promise<ZammadUser[]> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) return []

  const all: ZammadUser[] = []
  let page = 1

  while (true) {
    const res = await fetch(`${b}/users?per_page=500&page=${page}`, {
      headers: authHeaders(), cache: 'no-store',
    })
    if (!res.ok) break
    const items = (await res.json()) as ZammadUser[]
    if (!Array.isArray(items) || items.length === 0) break
    all.push(...items)
    if (items.length < 500) break
    page++
  }

  // Exclure le compte système (login='-') et les inactifs
  return all.filter(u => u.active && u.email && u.login !== '-')
}

export async function upsertZammadUser(u: {
  zammadId?: number
  firstname: string
  lastname: string
  email: string
  phone?: string | null
  organizationId?: number | null
}): Promise<number | null> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) return null

  const body = {
    firstname:       u.firstname,
    lastname:        u.lastname,
    email:           u.email,
    phone:           u.phone ?? '',
    organization_id: u.organizationId ?? null,
    login:           u.email,
    roles:           ['Customer'],
  }

  const url    = u.zammadId ? `${b}/users/${u.zammadId}` : `${b}/users`
  const method = u.zammadId ? 'PUT' : 'POST'

  const res = await fetch(url, {
    method, headers: authHeaders(), body: JSON.stringify(body), cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json() as { id?: number }
  return data.id ?? null
}

export async function syncOrgsToZammad(
  names: string[]
): Promise<{ created: number; updated: number; error?: string }> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) {
    return { created: 0, updated: 0, error: 'ZAMMAD_URL ou ZAMMAD_TOKEN non configuré dans .env.local' }
  }

  const existing = await fetchAllOrgs()
  const byName = new Map(existing.map(o => [o.name.toLowerCase().trim(), o]))

  let created = 0
  let updated = 0

  for (const name of names) {
    const found = byName.get(name.toLowerCase().trim())

    if (found) {
      // Réactiver si inactif, sinon considérer comme synchronisé
      if (!found.active) {
        await fetch(`${b}/organizations/${found.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ active: true }),
          cache: 'no-store',
        })
        updated++
      } else {
        updated++ // déjà présent et actif
      }
    } else {
      const res = await fetch(`${b}/organizations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, active: true }),
        cache: 'no-store',
      })
      if (res.ok) created++
    }
  }

  return { created, updated }
}
