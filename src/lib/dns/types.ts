import { DomainStatus } from '@prisma/client'
export type GlobalStatus = DomainStatus

export type SpfResult = {
  found: boolean
  record: string | null
  valid: boolean
  error?: string
}

export type DmarcResult = {
  found: boolean
  record: string | null
  policy: 'none' | 'quarantine' | 'reject' | null
  rua: string | null
  valid: boolean
  error?: string
}

export type DkimSelectorResult = {
  name: string
  found: boolean
  record: string | null
  valid: boolean
}

export type DkimResult = {
  selectors: DkimSelectorResult[]
  autoChecked: boolean
  anyFound: boolean
}

export type RblResult = {
  rbl: string
  listed: boolean
  major: boolean
}

export type BlacklistResult = {
  ip: string | null
  listed: RblResult[]
  cleanCount: number
  listedCount: number
  hasMajorListing: boolean
}

export type BimiResult = {
  found: boolean
  record: string | null
  logoUrl: string | null
  hasAuthority: boolean
  valid: boolean
  error?: string
}

export type MtaStsResult = {
  found: boolean
  record: string | null
  id: string | null
  valid: boolean
  error?: string
}

export type TlsRptResult = {
  found: boolean
  record: string | null
  rua: string | null
  valid: boolean
  error?: string
}

export type CheckPayload = {
  domain: string
  spf: SpfResult
  dmarc: DmarcResult
  dkim: DkimResult
  blacklists: BlacklistResult
  bimi: BimiResult
  mtaSts: MtaStsResult
  tlsRpt: TlsRptResult
  globalStatus: GlobalStatus
}
