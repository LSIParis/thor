import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runFullCheck } from '@/lib/dns/checker'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { domain?: unknown; dkimSelectors?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const domain = body.domain
  if (typeof domain !== 'string' || !domain.trim()) {
    return NextResponse.json({ error: 'domain requis' }, { status: 400 })
  }

  const dkimSelectors = Array.isArray(body.dkimSelectors)
    ? (body.dkimSelectors as string[]).filter(s => typeof s === 'string')
    : undefined

  const result = await runFullCheck(domain.toLowerCase().trim(), dkimSelectors)
  return NextResponse.json(result)
}
