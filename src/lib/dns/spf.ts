import { resolveTxt } from 'dns/promises'
import type { SpfResult } from './types'

export async function checkSpf(domain: string): Promise<SpfResult> {
  try {
    const records = await resolveTxt(domain)
    const spfRecord = records
      .map(chunks => chunks.join(''))
      .find(r => r.startsWith('v=spf1'))

    if (!spfRecord) {
      return { found: false, record: null, valid: false, error: 'No SPF record found' }
    }

    const hasAll = /[~\-+?]all/.test(spfRecord)
    return {
      found: true,
      record: spfRecord,
      valid: hasAll,
      ...(hasAll ? {} : { error: 'Missing "all" mechanism' }),
    }
  } catch (err) {
    return { found: false, record: null, valid: false, error: String(err) }
  }
}
