const BASE_URL = 'https://axonaut.com/api/v2'

type AxonautCompany = { id: number; name: string }
type AxonautContact = { id: number; firstname: string; lastname: string }

async function fetchAllAxonaut<T>(endpoint: string, label: string): Promise<{ data: T[]; error?: string }> {
  const apiKey = process.env.AXONAUT_API_KEY
  if (!apiKey) return { data: [], error: 'AXONAUT_API_KEY non configuré' }

  const all: T[] = []
  let start = 0
  const count = 50

  try {
    while (true) {
      const res = await fetch(`${BASE_URL}/${endpoint}?start=${start}&count=${count}`, {
        headers: { userApiKey: apiKey },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(15_000),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[axonaut] ${label} error`, res.status, text.slice(0, 200))
        return { data: all, error: `Axonaut API: HTTP ${res.status}` }
      }

      const batch = await res.json() as T[]
      if (!Array.isArray(batch) || batch.length === 0) break
      all.push(...batch)
      if (batch.length < count) break
      start += count
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[axonaut] ${label} exception:`, msg)
    return { data: all, error: `Axonaut inaccessible : ${msg}` }
  }

  return { data: all }
}

// ── Factures ──────────────────────────────────────────────────────────────────

export interface AxonautInvoice {
  id: number
  invoice_number: string
  title: string | null
  status: string
  date: string
  due_date: string | null
  total_without_taxes: number
  total_taxes: number
  total_with_taxes: number
  currency: string
  company: AxonautCompany | null
  contact: AxonautContact | null
}

export async function fetchAxonautInvoices(): Promise<{ invoices: AxonautInvoice[]; error?: string }> {
  const { data, error } = await fetchAllAxonaut<AxonautInvoice>('invoices', 'fetchInvoices')
  return { invoices: data, error }
}

// ── Devis ─────────────────────────────────────────────────────────────────────

export interface AxonautQuotation {
  id: number
  quotation_number: string
  title: string | null
  status: string
  date: string
  expiry_date: string | null
  total_without_taxes: number
  total_taxes: number
  total_with_taxes: number
  currency: string
  company: AxonautCompany | null
  contact: AxonautContact | null
}

export async function fetchAxonautQuotations(): Promise<{ quotations: AxonautQuotation[]; error?: string }> {
  const { data, error } = await fetchAllAxonaut<AxonautQuotation>('quotations', 'fetchQuotations')
  return { quotations: data, error }
}

// ── Commandes ─────────────────────────────────────────────────────────────────

export interface AxonautOrder {
  id: number
  order_number: string
  title: string | null
  status: string
  date: string
  delivery_date: string | null
  total_without_taxes: number
  total_taxes: number
  total_with_taxes: number
  currency: string
  company: AxonautCompany | null
  contact: AxonautContact | null
}

export async function fetchAxonautOrders(): Promise<{ orders: AxonautOrder[]; error?: string }> {
  const { data, error } = await fetchAllAxonaut<AxonautOrder>('orders', 'fetchOrders')
  return { orders: data, error }
}
