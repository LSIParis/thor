import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

type FormCompletedPayload = {
  event_type: string
  data: {
    metadata?: { baseFilename?: string }
    submission: { id: number }
    documents: Array<{ name: string; url: string }>
  }
}

export async function POST(req: NextRequest) {
  let payload: FormCompletedPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event_type !== 'form.completed') {
    return NextResponse.json({ ok: true })
  }

  const { data } = payload
  const docUrl = data.documents?.[0]?.url
  if (!docUrl) {
    console.warn('[docuseal/webhook] form.completed sans URL de document')
    return NextResponse.json({ ok: true })
  }

  try {
    const pdfResp = await fetch(docUrl)
    if (!pdfResp.ok) throw new Error(`Échec téléchargement document signé : ${pdfResp.status}`)
    const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer())

    const base = data.metadata?.baseFilename
    const filename = base
      ? `${base}-signe.pdf`
      : `signe-submission-${data.submission.id}.pdf`

    const dir = join(process.cwd(), 'public', 'handovers')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), pdfBuffer)

    console.log(`[docuseal/webhook] Document signé enregistré : ${filename}`)
  } catch (err) {
    console.error('[docuseal/webhook] Erreur enregistrement :', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
