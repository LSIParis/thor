import { checkSpf } from './spf'
import { checkDmarc } from './dmarc'
import { checkDkim } from './dkim'
import { checkBlacklists } from './blacklist'
import { checkBimi } from './bimi'
import { checkMtaSts } from './mta-sts'
import { checkTlsRpt } from './tls-rpt'
import { computeGlobalStatus } from './status'
import type { CheckPayload } from './types'

export async function runFullCheck(domain: string, dkimSelectors?: string[]): Promise<CheckPayload> {
  const [spf, dmarc, dkim, blacklists, bimi, mtaSts, tlsRpt] = await Promise.all([
    checkSpf(domain),
    checkDmarc(domain),
    checkDkim(domain, dkimSelectors),
    checkBlacklists(domain),
    checkBimi(domain),
    checkMtaSts(domain),
    checkTlsRpt(domain),
  ])

  const globalStatus = computeGlobalStatus(spf, dmarc, dkim, blacklists)
  return { domain, spf, dmarc, dkim, blacklists, bimi, mtaSts, tlsRpt, globalStatus }
}
