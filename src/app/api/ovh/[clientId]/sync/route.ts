// Deprecated — redirects to new unified registrar sync route
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params
  const newUrl = new URL(`/api/registrar/${clientId}/ovh/sync`, req.url)
  const newReq = new Request(newUrl, { method: 'POST', headers: req.headers })
  const { POST: newHandler } = await import('@/app/api/registrar/[clientId]/[provider]/sync/route')
  return newHandler(newReq, { params: Promise.resolve({ clientId, provider: 'ovh' }) })
}
