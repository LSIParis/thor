interface ZammadOrg {
  id: number
  name: string
  active: boolean
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
