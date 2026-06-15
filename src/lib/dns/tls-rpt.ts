import { resolveTxt } from 'dns/promises'
import type { TlsRptResult } from './types'

export async function checkTlsRpt(domain: string): Promise<TlsRptResult> {
  try {
    const records = await resolveTxt(`_smtp._tls.${domain}`)
    const tlsRecord = records
      .map(chunks => chunks.join(''))
      .find(r => r.startsWith('v=TLSRPTv1'))

    if (!tlsRecord) {
      return { found: false, record: null, rua: null, valid: false, error: 'No TLS-RPT record found' }
    }

    const ruaMatch = tlsRecord.match(/rua=([^;]+)/)
    const rua = ruaMatch
      ? ruaMatch[1].split(',').map(s => s.trim().replace(/^mailto:/, '')).join(', ')
      : null

    return { found: true, record: tlsRecord, rua, valid: !!rua }
  } catch (err) {
    return { found: false, record: null, rua: null, valid: false, error: String(err) }
  }
}
