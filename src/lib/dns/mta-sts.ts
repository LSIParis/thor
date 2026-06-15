import { resolveTxt } from 'dns/promises'
import type { MtaStsResult } from './types'

export async function checkMtaSts(domain: string): Promise<MtaStsResult> {
  try {
    const records = await resolveTxt(`_mta-sts.${domain}`)
    const stsRecord = records
      .map(chunks => chunks.join(''))
      .find(r => r.startsWith('v=STSv1'))

    if (!stsRecord) {
      return { found: false, record: null, id: null, valid: false, error: 'No MTA-STS record found' }
    }

    const idMatch = stsRecord.match(/id=([^;]+)/)
    const id = idMatch ? idMatch[1].trim() : null

    return { found: true, record: stsRecord, id, valid: true }
  } catch (err) {
    return { found: false, record: null, id: null, valid: false, error: String(err) }
  }
}
