interface ZammadOrg {
  id: number
  name: string
  active: boolean
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

type StateType = { id: number; name: string }
type State     = { id: number; name: string; state_type_id: number }
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

function buildQuery(stateIds: number[], orgName?: string): string {
  const parts: string[] = []
  if (stateIds.length > 0) {
    parts.push(stateIds.map((id) => `state_id:${id}`).join(' OR '))
  }
  if (orgName) {
    parts.push(`organization.name:"${orgName.replace(/"/g, '')}"`)
  }
  return parts.join(' AND ') || '*'
}

async function searchTickets(b: string, query: string, limit = 25): Promise<{
  tickets: ZammadTicket[]
  count: number
  stateTypes: StateType[]
  states: State[]
  priorities: Priority[]
  users: Record<number, User>
  orgs: Record<number, Org>
}> {
  const [searchRes, stateTypesRes, statesRes, prioritiesRes] = await Promise.all([
    fetch(`${b}/tickets/search?query=${encodeURIComponent(query)}&limit=${limit}&sort_by=updated_at&order_by=desc`, {
      headers: authHeaders(), cache: 'no-store',
    }),
    fetch(`${b}/ticket_state_types`, { headers: authHeaders(), cache: 'no-store' }),
    fetch(`${b}/ticket_states`,      { headers: authHeaders(), cache: 'no-store' }),
    fetch(`${b}/ticket_priorities`,  { headers: authHeaders(), cache: 'no-store' }),
  ])

  const stateTypes:  StateType[]  = stateTypesRes.ok  ? await stateTypesRes.json()  : []
  const states:      State[]      = statesRes.ok      ? await statesRes.json()       : []
  const priorities:  Priority[]   = prioritiesRes.ok  ? await prioritiesRes.json()   : []

  if (!searchRes.ok) {
    return { tickets: [], count: 0, stateTypes, states, priorities, users: {}, orgs: {} }
  }

  const data = await searchRes.json() as {
    tickets: number[]
    tickets_count: number
    assets?: {
      Ticket?:         Record<string, any>
      TicketState?:    Record<string, any>
      TicketPriority?: Record<string, any>
      Organization?:   Record<string, any>
      User?:           Record<string, any>
    }
  }

  const assets    = data.assets ?? {}
  const rawTickets: Record<string, any> = assets.Ticket ?? {}
  const rawOrgs:    Record<string, any> = assets.Organization ?? {}
  const rawUsers:   Record<string, any> = assets.User ?? {}

  const stateTypeMap  = new Map(stateTypes.map((st) => [st.id, st.name]))
  const stateMap      = new Map(states.map((s)  => [s.id, s]))
  const priorityMap   = new Map(priorities.map((p) => [p.id, p]))

  const users: Record<number, User> = {}
  for (const [id, u] of Object.entries(rawUsers)) {
    users[Number(id)] = u as User
  }
  const orgs: Record<number, Org> = {}
  for (const [id, o] of Object.entries(rawOrgs)) {
    orgs[Number(id)] = o as Org
  }

  const tickets: ZammadTicket[] = (data.tickets ?? []).map((id) => {
    const raw = rawTickets[String(id)] ?? {}
    const state    = stateMap.get(raw.state_id)
    const priority = priorityMap.get(raw.priority_id)
    const stTypeName = state ? (stateTypeMap.get(state.state_type_id) ?? 'unknown') : 'unknown'

    const customer = raw.customer_id ? users[raw.customer_id] : null
    const owner    = raw.owner_id    ? users[raw.owner_id]    : null

    return {
      id:             raw.id,
      number:         raw.number ?? String(id),
      title:          raw.title  ?? '—',
      state_id:       raw.state_id,
      priority_id:    raw.priority_id,
      organization_id: raw.organization_id ?? null,
      created_at:     raw.created_at ?? '',
      updated_at:     raw.updated_at ?? '',
      stateName:      state?.name    ?? '—',
      stateCategory:  stateCategory(stTypeName),
      priorityName:   priority?.name ?? '—',
      priorityColor:  priority?.ui_color ?? null,
      orgName:        raw.organization_id ? (orgs[raw.organization_id]?.name ?? null) : null,
      customerName:   customer ? `${customer.firstname} ${customer.lastname}`.trim() : null,
      ownerName:      owner?.login && owner.login !== '-'
                        ? `${owner.firstname} ${owner.lastname}`.trim()
                        : null,
    }
  })

  return { tickets, count: data.tickets_count ?? 0, stateTypes, states, priorities, users, orgs }
}

// ── Fonction principale ────────────────────────────────────────────────────────

export async function fetchZammadDashboard(orgName?: string): Promise<ZammadDashboard> {
  const b = base()
  if (!b || !process.env.ZAMMAD_TOKEN) {
    return { configured: false, tickets: [], totalCount: 0, countOpen: 0, countPending: 0, countClosed: 0 }
  }

  try {
    // Fetch states + state types first to build category buckets
    const [stateTypesRes, statesRes] = await Promise.all([
      fetch(`${b}/ticket_state_types`, { headers: authHeaders(), cache: 'no-store' }),
      fetch(`${b}/ticket_states`,      { headers: authHeaders(), cache: 'no-store' }),
    ])
    const stateTypes: StateType[] = stateTypesRes.ok ? await stateTypesRes.json() : []
    const states:     State[]     = statesRes.ok     ? await statesRes.json()     : []

    const stateTypeMap = new Map(stateTypes.map((st) => [st.id, st.name]))
    const openIds:    number[] = []
    const pendingIds: number[] = []
    const closedIds:  number[] = []
    for (const s of states) {
      const cat = stateCategory(stateTypeMap.get(s.state_type_id) ?? '')
      if (cat === 'open')    openIds.push(s.id)
      if (cat === 'pending') pendingIds.push(s.id)
      if (cat === 'closed')  closedIds.push(s.id)
    }

    // Parallel: recent tickets list + 3 count queries
    const recentQuery  = orgName ? `organization.name:"${orgName.replace(/"/g, '')}"` : '*'
    const openQuery    = buildQuery(openIds,    orgName)
    const pendingQuery = buildQuery(pendingIds, orgName)
    const closedQuery  = buildQuery(closedIds,  orgName)

    const [recent, openCount, pendingCount, closedCount] = await Promise.all([
      searchTickets(b, recentQuery, 25),
      fetch(`${b}/tickets/search?query=${encodeURIComponent(openQuery)}&limit=1`,
        { headers: authHeaders(), cache: 'no-store' })
        .then((r) => r.ok ? r.json() : { tickets_count: 0 })
        .then((d: any) => (d.tickets_count ?? 0) as number),
      fetch(`${b}/tickets/search?query=${encodeURIComponent(pendingQuery)}&limit=1`,
        { headers: authHeaders(), cache: 'no-store' })
        .then((r) => r.ok ? r.json() : { tickets_count: 0 })
        .then((d: any) => (d.tickets_count ?? 0) as number),
      fetch(`${b}/tickets/search?query=${encodeURIComponent(closedQuery)}&limit=1`,
        { headers: authHeaders(), cache: 'no-store' })
        .then((r) => r.ok ? r.json() : { tickets_count: 0 })
        .then((d: any) => (d.tickets_count ?? 0) as number),
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

async function fetchAllOrgs(): Promise<ZammadOrg[]> {
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
