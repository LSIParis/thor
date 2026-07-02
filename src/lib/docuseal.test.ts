import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { buildSignatureConfirmation, verifyDocusealSignature, type FormCompletedData } from './docuseal'

const LSI = 'contact@lsi-maintenance.fr'

function makeData(overrides: Partial<FormCompletedData> = {}): FormCompletedData {
  return {
    email: 'jean.dupont@example.com',
    name: 'Jean Dupont',
    completed_at: '2026-07-02T10:00:00Z',
    submission: { id: 42 },
    documents: [{ name: 'bon', url: 'https://docuseal.eu/blobs/doc.pdf' }],
    metadata: {
      baseFilename: 'bon-prise-en-charge-dupont-jean-123',
      clientEmail: 'contact@clientcorp.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      clientName: 'ClientCorp',
      type: 'ENTREE',
    },
    ...overrides,
  }
}

describe('buildSignatureConfirmation', () => {
  it('inclut LSI, le signataire et le client dans les destinataires', () => {
    const r = buildSignatureConfirmation(makeData(), LSI)
    expect(r.recipients).toContain(LSI)
    expect(r.recipients).toContain('jean.dupont@example.com')
    expect(r.recipients).toContain('contact@clientcorp.fr')
    expect(r.recipients).toHaveLength(3)
  })

  it('déduplique sans tenir compte de la casse et ignore les adresses vides', () => {
    const r = buildSignatureConfirmation(
      makeData({ email: 'CONTACT@LSI-maintenance.fr', metadata: { ...makeData().metadata, clientEmail: '' } }),
      LSI,
    )
    expect(r.recipients).toEqual([LSI])
  })

  it('construit un sujet à partir du nom du signataire', () => {
    const r = buildSignatureConfirmation(makeData(), LSI)
    expect(r.subject).toContain('Jean Dupont')
    expect(r.subject.toLowerCase()).toContain('signé')
  })

  it('déduit le nom de fichier du baseFilename des métadonnées', () => {
    const r = buildSignatureConfirmation(makeData(), LSI)
    expect(r.filename).toBe('bon-prise-en-charge-dupont-jean-123-signe.pdf')
  })

  it('se rabat sur l\'id de submission quand baseFilename manque', () => {
    const r = buildSignatureConfirmation(makeData({ metadata: {} }), LSI)
    expect(r.filename).toBe('signe-submission-42.pdf')
  })

  it('extrait l\'URL du document signé', () => {
    const r = buildSignatureConfirmation(makeData(), LSI)
    expect(r.documentUrl).toBe('https://docuseal.eu/blobs/doc.pdf')
    expect(buildSignatureConfirmation(makeData({ documents: [] }), LSI).documentUrl).toBeNull()
  })
})

describe('verifyDocusealSignature', () => {
  const secret = 'whsec_test_secret'
  const body = '{"event_type":"form.completed","data":{"id":1}}'
  const nowMs = 1_700_000_000_000
  const nowSec = Math.floor(nowMs / 1000)

  function header(ts: number, b: string, s = secret): string {
    const sig = createHmac('sha256', s).update(`${ts}.${b}`).digest('hex')
    return `${ts}.${sig}`
  }

  it('accepte une signature valide et récente', () => {
    expect(
      verifyDocusealSignature({ rawBody: body, signatureHeader: header(nowSec, body), secret, nowMs }),
    ).toBe(true)
  })

  it('rejette une signature falsifiée', () => {
    expect(
      verifyDocusealSignature({ rawBody: body, signatureHeader: `${nowSec}.deadbeef`, secret, nowMs }),
    ).toBe(false)
  })

  it('rejette un corps modifié', () => {
    expect(
      verifyDocusealSignature({ rawBody: body + 'tampered', signatureHeader: header(nowSec, body), secret, nowMs }),
    ).toBe(false)
  })

  it('rejette un mauvais secret', () => {
    expect(
      verifyDocusealSignature({ rawBody: body, signatureHeader: header(nowSec, body, 'whsec_wrong'), secret, nowMs }),
    ).toBe(false)
  })

  it('rejette un timestamp périmé (> 5 min)', () => {
    expect(
      verifyDocusealSignature({ rawBody: body, signatureHeader: header(nowSec - 600, body), secret, nowMs }),
    ).toBe(false)
  })

  it('rejette un en-tête manquant ou malformé', () => {
    expect(verifyDocusealSignature({ rawBody: body, signatureHeader: null, secret, nowMs })).toBe(false)
    expect(verifyDocusealSignature({ rawBody: body, signatureHeader: 'sans-point', secret, nowMs })).toBe(false)
    expect(verifyDocusealSignature({ rawBody: body, signatureHeader: '', secret, nowMs })).toBe(false)
  })
})
