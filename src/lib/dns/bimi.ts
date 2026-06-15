import { resolveTxt } from 'dns/promises'
import type { BimiResult } from './types'

export async function checkBimi(domain: string): Promise<BimiResult> {
  try {
    const records = await resolveTxt(`default._bimi.${domain}`)
    const bimiRecord = records
      .map(chunks => chunks.join(''))
      .find(r => r.startsWith('v=BIMI1'))

    if (!bimiRecord) {
      return { found: false, record: null, logoUrl: null, hasAuthority: false, valid: false, error: 'No BIMI record found' }
    }

    const logoMatch = bimiRecord.match(/l=([^;]+)/)
    const logoUrl = logoMatch ? logoMatch[1].trim() || null : null

    const authorityMatch = bimiRecord.match(/a=([^;]+)/)
    const hasAuthority = !!(authorityMatch && authorityMatch[1].trim())

    return {
      found: true,
      record: bimiRecord,
      logoUrl,
      hasAuthority,
      valid: !!logoUrl,
    }
  } catch (err) {
    return { found: false, record: null, logoUrl: null, hasAuthority: false, valid: false, error: String(err) }
  }
}
