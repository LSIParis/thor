export interface ScoreInput {
  spfValid: boolean
  dmarcPolicy: string | null | undefined
  dkimFound: boolean
  blacklistClean: boolean
  blacklistMinorCount: number | null | undefined
}

/** Score délivrabilité pondéré (max 100). */
export function computeScore(input: ScoreInput): number {
  let score = 0

  if (input.spfValid) score += 25

  if (input.dmarcPolicy === 'reject') score += 40
  else if (input.dmarcPolicy === 'quarantine') score += 25
  else if (input.dmarcPolicy === 'none') score += 10

  if (input.dkimFound) score += 20

  if (!input.blacklistClean) {
    score += 0
  } else if ((input.blacklistMinorCount ?? 0) === 0) {
    score += 15
  } else {
    score += 7
  }

  return score
}

export interface GlobalScoreInput extends ScoreInput {
  bimiValid: boolean
  mtaStsValid: boolean
  tlsRptValid: boolean
}

/** Note globale = délivrabilité − 5 pts par option absente (BIMI, MTA-STS, TLS-RPT). */
export function computeGlobalScore(input: GlobalScoreInput): number {
  const deliverability = computeScore(input)
  const absentOptionals = [input.bimiValid, input.mtaStsValid, input.tlsRptValid].filter(v => !v).length
  return Math.max(0, deliverability - absentOptionals * 5)
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}
