import type { SpfResult, DmarcResult, DkimResult, BlacklistResult, GlobalStatus } from './types'

export function computeGlobalStatus(
  spf: SpfResult,
  dmarc: DmarcResult,
  dkim: DkimResult,
  blacklists: BlacklistResult,
): GlobalStatus {
  if (!spf.valid || !dmarc.valid || blacklists.hasMajorListing) return 'ERROR'
  if (!dkim.anyFound || blacklists.listedCount > 0) return 'WARNING'
  return 'OK'
}
