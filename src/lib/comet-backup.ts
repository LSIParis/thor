// Comet Backup API — codes officiels
const JOB_STATUS_RUNNING  = 5001
const JOB_STATUS_SUCCESS  = 5002
const JOB_STATUS_WARNING  = 5003
const JOB_STATUS_QUOTA    = 5004
const JOB_STATUS_ERROR    = 5005
const JOB_STATUS_MISSED   = 5100
const JOB_CLASS_BACKUP    = 4001

type CometRawJob = {
  JobHash: string
  Classification: number
  Status: number
  StartTime: number
  EndTime: number
  SourceStats?: { TotalBytes?: number }
  DeviceName?: string
}

export type CometClientSummary = {
  username: string
  lastJobStatus: number | null   // code numérique Comet, null si aucun job
  lastJobTime: number | null     // Unix timestamp (secondes)
  lastJobSize: number | null     // bytes
  hasRecentJob: boolean          // job Backup dans les 48h
}

export function cometConfigured(): boolean {
  return !!(
    process.env.COMET_SERVER_URL &&
    process.env.COMET_ADMIN_USER &&
    process.env.COMET_ADMIN_PASS
  )
}

export async function fetchCometClientSummary(
  username: string,
  limitHours = 48,
): Promise<CometClientSummary | null> {
  const base = process.env.COMET_SERVER_URL?.replace(/\/$/, '')
  const adminUser = process.env.COMET_ADMIN_USER
  const adminPass = process.env.COMET_ADMIN_PASS
  if (!base || !adminUser || !adminPass) return null

  const startTime = Math.floor(Date.now() / 1000) - limitHours * 3600

  const body = new URLSearchParams({
    Username:   adminUser,
    Password:   adminPass,
    AuthType:   'Password',
    TargetUser: username,
    StartTime:  String(startTime),
  })

  let res: Response
  try {
    res = await fetch(`${base}/api/v1/admin/get-jobs-for-user`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      cache:   'no-store',
      signal:  AbortSignal.timeout(10_000),
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  let jobs: CometRawJob[]
  try {
    jobs = await res.json() as CometRawJob[]
  } catch {
    return null
  }

  if (!Array.isArray(jobs)) return null

  const backupJobs = jobs.filter(j => j.Classification === JOB_CLASS_BACKUP)

  if (backupJobs.length === 0) {
    return { username, lastJobStatus: null, lastJobTime: null, lastJobSize: null, hasRecentJob: false }
  }

  // Trier par StartTime décroissant — job le plus récent en premier
  backupJobs.sort((a, b) => b.StartTime - a.StartTime)
  const latest = backupJobs[0]

  return {
    username,
    lastJobStatus: latest.Status,
    lastJobTime:   latest.StartTime,
    lastJobSize:   latest.SourceStats?.TotalBytes ?? null,
    hasRecentJob:  true,
  }
}

export async function fetchCometSummaries(
  usernames: string[],
  limitHours = 48,
): Promise<Map<string, CometClientSummary>> {
  const results = await Promise.all(
    usernames.map(u => fetchCometClientSummary(u, limitHours))
  )
  const map = new Map<string, CometClientSummary>()
  for (const summary of results) {
    if (summary) map.set(summary.username, summary)
  }
  return map
}

// ── Helpers dashboard ─────────────────────────────────────────────────────────

export function isCometSuccess(status: number | null): boolean {
  return status === JOB_STATUS_SUCCESS || status === JOB_STATUS_WARNING
}

export function isCometError(status: number | null): boolean {
  return status === JOB_STATUS_ERROR || status === JOB_STATUS_MISSED || status === JOB_STATUS_QUOTA
}
