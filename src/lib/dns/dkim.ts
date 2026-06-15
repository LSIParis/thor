import { resolveTxt } from 'dns/promises'
import type { DkimResult, DkimSelectorResult } from './types'

export const AUTO_SELECTORS = [
  'google', 'mail', 'default', 's1', 's2',
  'k1', 'dkim', 'email', 'selector1', 'selector2',
]

async function checkSelector(selector: string, domain: string): Promise<DkimSelectorResult> {
  try {
    const records = await resolveTxt(`${selector}._domainkey.${domain}`)
    const record = records.map(chunks => chunks.join('')).find(r => r.includes('p='))
    return { name: selector, found: !!record, record: record ?? null, valid: !!record }
  } catch {
    return { name: selector, found: false, record: null, valid: false }
  }
}

export async function checkDkim(domain: string, selectors?: string[]): Promise<DkimResult> {
  const toCheck = selectors ?? AUTO_SELECTORS
  const results = await Promise.all(toCheck.map(s => checkSelector(s, domain)))
  const anyFound = results.some(r => r.found)

  return {
    selectors: selectors ? results : results.filter(r => r.found),
    autoChecked: !selectors,
    anyFound,
  }
}
