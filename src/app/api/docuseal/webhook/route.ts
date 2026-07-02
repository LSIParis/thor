import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { buildSignatureConfirmation, verifyDocusealSignature, type FormCompletedData } from '@/lib/docuseal'
import { sendMail, LSI_EMAIL } from '@/lib/mailer'
import { prisma } from '@/lib/db'

type FormWebhookPayload = {
  event_type: string
  data: FormCompletedData & {
    submission?: { id?: number; combined_document_url?: string }
  }
}

export async function POST(req: NextRequest) {
  // Corps brut requis : la signature HMAC porte sur les octets exacts envoyés.
  const rawBody = await req.text()

  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET
  if (secret) {
    const ok = verifyDocusealSignature({
      rawBody,
      signatureHeader: req.headers.get('x-docuseal-signature'),
      secret,
      nowMs: Date.now(),
    })
    if (!ok) {
      console.warn('[docuseal/webhook] Signature HMAC invalide — requête rejetée')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[docuseal/webhook] DOCUSEAL_WEBHOOK_SECRET non configuré — webhook non vérifié')
  }

  let payload: FormWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event_type !== 'form.completed') {
    return NextResponse.json({ ok: true })
  }

  const { data } = payload

  // Marque le mouvement correspondant comme signé (lien via l'id de submission).
  const submissionId = data.submission?.id
  if (submissionId) {
    const { count } = await prisma.personnelMovement.updateMany({
      where: { docusealSubmissionId: submissionId },
      data: { docusealSignedAt: new Date() },
    })
    if (count > 0) console.log(`[docuseal/webhook] Mouvement marqué signé (submission #${submissionId})`)
  }

  const confirmation = buildSignatureConfirmation(data, LSI_EMAIL)
  const docUrl = confirmation.documentUrl ?? data.submission?.combined_document_url ?? null
  if (!docUrl) {
    console.warn('[docuseal/webhook] form.completed sans URL de document')
    return NextResponse.json({ ok: true })
  }

  let pdfBuffer: Buffer
  try {
    const pdfResp = await fetch(docUrl)
    if (!pdfResp.ok) throw new Error(`Échec téléchargement document signé : ${pdfResp.status}`)
    pdfBuffer = Buffer.from(await pdfResp.arrayBuffer())

    const dir = join(process.cwd(), 'public', 'handovers')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, confirmation.filename), pdfBuffer)
    console.log(`[docuseal/webhook] Document signé enregistré : ${confirmation.filename}`)
  } catch (err) {
    console.error('[docuseal/webhook] Erreur enregistrement :', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  // Confirmation de signature : une copie du document signé à LSI, au signataire et au client.
  const attachment = {
    data: pdfBuffer,
    filename: confirmation.filename,
    contentType: 'application/pdf',
  }
  for (const to of confirmation.recipients) {
    await sendMail({ to, subject: confirmation.subject, html: confirmation.html, attachment })
  }
  console.log(
    `[docuseal/webhook] Confirmation envoyée à : ${confirmation.recipients.join(', ') || '(aucun destinataire)'}`,
  )

  return NextResponse.json({ ok: true })
}
