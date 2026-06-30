import docuseal from '@docuseal/api'

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
  type?: 'ENTREE' | 'SORTIE'
}): Promise<SignatureRequestResult | null> {
  if (!configure()) {
    console.warn('[docuseal] DOCUSEAL_API_KEY non configuré — demande de signature ignorée')
    return null
  }

  const { pdfBuffer, firstName, lastName, clientName, email, baseFilename, type = 'ENTREE' } = opts
  const pdfBase64 = pdfBuffer.toString('base64')
  const docName = `Bon de prise en charge — ${firstName} ${lastName}`

  const isSortie = type === 'SORTIE'
  const emailSubject = isSortie
    ? `Signature requise : sortie de ${firstName} ${lastName}`
    : `Signature requise : ${docName}`
  const emailBody = isSortie
    ? `Bonjour,\n\nLa demande de sortie pour ${firstName} ${lastName} chez ${clientName} a été traitée.\n\nVeuillez signer le bon de prise en charge en cliquant sur le bouton ci-dessous.\n\nCordialement,\nLSI Maintenance\n\n{{submitter.link}}`
    : `Bonjour ${firstName},\n\nVeuillez signer votre bon de prise en charge en cliquant sur le bouton ci-dessous.\n\nCordialement,\nLSI Maintenance\n\n{{submitter.link}}`

  let submission: any
  try {
    submission = await (docuseal as any).createSubmissionFromPdf({
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
          metadata: { baseFilename },
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
  }
}
