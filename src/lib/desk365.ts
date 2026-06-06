const BASE_URL = () => {
  const sub = process.env.DESK365_SUBDOMAIN
  if (!sub) return null
  return `https://${sub}.desk365.io/apis/v3`
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
