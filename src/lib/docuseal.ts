import docuseal from '@docuseal/api'
import { createHmac, timingSafeEqual } from 'crypto'

function configure(): boolean {
  const key = process.env.DOCUSEAL_API_KEY
  if (!key) return false
  const url = process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.eu'
  console.log(`[docuseal] configure → ${url}`)
  docuseal.configure({ key, url })
  return true
}

export type SignatureRequestResult = {
  submissionId: number
  signingUrl: string
  slug: string | null
}

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook DocuSeal.
 * En-tête `X-Docuseal-Signature` au format `timestamp.signature` ; le contenu
 * signé est `timestamp.rawBody` (octets bruts). Rejette les horodatages périmés
 * (> tolérance, 5 min par défaut) et compare en temps constant.
 * Le secret `whsec_…` se récupère sur la page du webhook (Security → HMAC).
 */
export function verifyDocusealSignature(opts: {
  rawBody: string
  signatureHeader: string | null | undefined
  secret: string
  nowMs: number
  toleranceSec?: number
}): boolean {
  const { rawBody, signatureHeader, secret, nowMs, toleranceSec = 300 } = opts
  if (!signatureHeader || !secret) return false

  const dot = signatureHeader.indexOf('.')
  if (dot <= 0) return false
  const timestamp = signatureHeader.slice(0, dot)
  const signature = signatureHeader.slice(dot + 1)
  if (!/^\d+$/.test(timestamp) || !signature) return false

  const ageSec = Math.abs(Math.floor(nowMs / 1000) - Number(timestamp))
  if (ageSec > toleranceSec) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Métadonnées attachées au submitter, renvoyées telles quelles dans le webhook form.completed. */
export type HandoverMetadata = {
  baseFilename?: string
  clientEmail?: string
  firstName?: string
  lastName?: string
  clientName?: string
  type?: 'ENTREE' | 'SORTIE'
}

/** Sous-ensemble du payload `form.completed` de DocuSeal que l'on exploite. */
export type FormCompletedData = {
  email?: string | null
  name?: string | null
  completed_at?: string | null
  metadata?: HandoverMetadata
  submission?: { id?: number }
  documents?: Array<{ name?: string; url?: string }>
}

export type SignatureConfirmation = {
  recipients: string[]
  subject: string
  html: string
  documentUrl: string | null
  filename: string
}

/**
 * À partir du payload `form.completed`, construit l'e-mail de confirmation :
 * destinataires (LSI + signataire + client, dédupliqués sans casse), sujet,
 * corps HTML, ainsi que l'URL et le nom du document signé.
 * Fonction pure — aucun effet de bord, testable isolément.
 */
export function buildSignatureConfirmation(
  data: FormCompletedData,
  lsiEmail: string,
): SignatureConfirmation {
  const meta = data.metadata ?? {}

  const recipients: string[] = []
  const seen = new Set<string>()
  for (const raw of [lsiEmail, data.email, meta.clientEmail]) {
    const email = raw?.trim()
    if (!email || !email.includes('@')) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    recipients.push(email)
  }

  const who = [meta.firstName, meta.lastName].filter(Boolean).join(' ').trim() || (data.name ?? '').trim()
  const subject = who
    ? `Bon de prise en charge signé — ${who}`
    : 'Bon de prise en charge signé'

  const submissionId = data.submission?.id
  const filename = meta.baseFilename
    ? `${meta.baseFilename}-signe.pdf`
    : `signe-submission-${submissionId ?? 'inconnu'}.pdf`

  const documentUrl = data.documents?.[0]?.url ?? null

  const clientLine = meta.clientName
    ? ` chez <strong>${meta.clientName}</strong>`
    : ''
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:0;padding:0">
<div style="max-width:560px;margin:32px auto;padding:0 16px">
  <p style="margin:0 0 16px">Bonjour,</p>
  <p style="margin:0 0 16px">
    Le <strong>bon de prise en charge</strong>${who ? ` de <strong>${who}</strong>` : ''}${clientLine}
    a été <strong>signé électroniquement</strong>.
  </p>
  <p style="margin:0 0 16px">
    Vous trouverez le document signé en pièce jointe.
  </p>
  <p style="margin:0">Cordialement,<br><strong>LSI Maintenance</strong></p>
</div>
</body></html>`

  return { recipients, subject, html, documentUrl, filename }
}

/**
 * Crée une demande de signature DocuSeal pour un bon de prise en charge.
 * Retourne null si DOCUSEAL_API_KEY n'est pas configuré.
 *
 * Coordonnées de la zone signature (normalisées 0-1, origin top-left) :
 * la boîte "Signature du réceptionnaire" est dans la moitié gauche du bas de page.
 * À ajuster si le contenu du document est très court ou très long.
 */
export async function createHandoverSignatureRequest(opts: {
  pdfBuffer: Buffer
  firstName: string
  lastName: string
  clientName: string
  email: string
  clientEmail?: string
  baseFilename: string
  type?: 'ENTREE' | 'SORTIE'
}): Promise<SignatureRequestResult | null> {
  if (!configure()) {
    console.warn('[docuseal] DOCUSEAL_API_KEY non configuré — demande de signature ignorée')
    return null
  }

  const { pdfBuffer, firstName, lastName, clientName, email, clientEmail, baseFilename, type = 'ENTREE' } = opts
  const pdfBase64 = pdfBuffer.toString('base64')
  const docName = `Bon de prise en charge — ${firstName} ${lastName}`

  const isSortie = type === 'SORTIE'
  const emailSubject = isSortie
    ? `Signature requise : sortie de ${firstName} ${lastName}`
    : `Signature requise : ${docName}`
  const emailBody = isSortie
    ? `Bonjour,\n\nLa demande de sortie pour ${firstName} ${lastName} chez ${clientName} a été traitée.\n\nVeuillez signer le bon de prise en charge en cliquant sur le bouton ci-dessous.\n\nCordialement,\nLSI Maintenance\n\n{{submitter.link}}`
    : `Bonjour ${firstName},\n\nVeuillez signer votre bon de prise en charge en cliquant sur le bouton ci-dessous.\n\nCordialement,\nLSI Maintenance\n\n{{submitter.link}}`

  let submission: Awaited<ReturnType<typeof docuseal.createSubmissionFromPdf>>
  try {
    submission = await docuseal.createSubmissionFromPdf({
      name: `${docName} (${clientName})`,
      send_email: true,
      message: {
        subject: emailSubject,
        body: emailBody,
      },
      documents: [
        {
          name: docName,
          file: pdfBase64,
          fields: [
            {
              name: 'Signature réceptionnaire',
              type: 'signature',
              role: 'Signataire',
              required: true,
              areas: [
                {
                  // Zone "Signature du réceptionnaire" (colonne gauche, bas de page A4)
                  x: 0.05,
                  y: 0.75,
                  w: 0.40,
                  h: 0.09,
                  page: 1,
                },
              ],
            },
          ],
        },
      ],
      submitters: [
        {
          name: `${firstName} ${lastName}`,
          email,
          role: 'Signataire',
          metadata: {
            baseFilename,
            clientEmail,
            firstName,
            lastName,
            clientName,
            type,
          } satisfies HandoverMetadata,
        },
      ],
    })
  } catch (err) {
    console.error('[docuseal] Erreur lors de la création de la demande de signature:', err)
    return null
  }

  const submitter = submission?.submitters?.[0]
  if (!submitter) {
    console.error('[docuseal] Réponse inattendue — pas de submitter:', JSON.stringify(submission))
    return null
  }

  const signingUrl = submitter.embed_src ?? `https://docuseal.eu/s/${submitter.slug}`
  console.log(`[docuseal] Demande créée — submission #${submission.id}, lien: ${signingUrl}`)
  return {
    submissionId: submission.id,
    signingUrl,
    slug: submitter.slug ?? null,
  }
}
