import docuseal from '@docuseal/api'

function configure(): boolean {
  const key = process.env.DOCUSEAL_API_KEY
  if (!key) return false
  const url = process.env.DOCUSEAL_API_URL ?? 'https://api.docuseal.eu'
  docuseal.configure({ key, url })
  return true
}

export type SignatureRequestResult = {
  submissionId: number
  signingUrl: string
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
  baseFilename: string
}): Promise<SignatureRequestResult | null> {
  if (!configure()) {
    console.warn('[docuseal] DOCUSEAL_API_KEY non configuré — demande de signature ignorée')
    return null
  }

  const { pdfBuffer, firstName, lastName, clientName, email, baseFilename } = opts
  const pdfBase64 = pdfBuffer.toString('base64')
  const docName = `Bon de prise en charge — ${firstName} ${lastName}`

  const submission = await (docuseal as any).createSubmissionFromPdf({
    name: `${docName} (${clientName})`,
    send_email: true,
    message: {
      subject: `Signature requise : ${docName}`,
      body: `Bonjour ${firstName},\n\nVeuillez signer votre bon de prise en charge en cliquant sur le bouton ci-dessous.\n\nCordialement,\nLSI Maintenance\n\n{{submitter.link}}`,
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
        metadata: { baseFilename },
      },
    ],
  })

  const submitter = submission?.submitters?.[0]
  if (!submitter) return null

  return {
    submissionId: submission.id,
    signingUrl: submitter.embed_src ?? `https://docuseal.eu/s/${submitter.slug}`,
  }
}
