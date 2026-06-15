import { resolveTxt } from 'dns/promises'
import type { DmarcResult } from './types'

export async function checkDmarc(domain: string): Promise<DmarcResult> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`)
    const dmarcRecord = records
      .map(chunks => chunks.join(''))
      .find(r => r.startsWith('v=DMARC1'))

    if (!dmarcRecord) {
      return { found: false, record: null, policy: null, rua: null, valid: false, error: 'No DMARC record found' }
    }

    const policyMatch = dmarcRecord.match(/p=(none|quarantine|reject)/)
    const policy = policyMatch ? (policyMatch[1] as 'none' | 'quarantine' | 'reject') : null

    const ruaMatch = dmarcRecord.match(/rua=([^;]+)/)
    const rua = ruaMatch
      ? ruaMatch[1].split(',').map(s => s.trim().replace(/^mailto:/, '')).join(', ')
      : null

    return {
      found: true,
      record: dmarcRecord,
      policy,
      rua,
      valid: policy !== null,
    }
  } catch (err) {
    return { found: false, record: null, policy: null, rua: null, valid: false, error: String(err) }
  }
}
