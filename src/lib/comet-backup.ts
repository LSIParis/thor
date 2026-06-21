// Comet Backup API — codes officiels
const JOB_STATUS_RUNNING  = 5001
const JOB_STATUS_SUCCESS  = 5002
const JOB_STATUS_WARNING  = 5003
const JOB_STATUS_QUOTA    = 5004
const JOB_STATUS_ERROR    = 5005
const JOB_STATUS_MISSED   = 5100
const JOB_CLASS_BACKUP    = 4001

type CometRawJob = {
  JobHash:        string
  Classification: number | string
  Status:         number | string
  StartTime:      number
  EndTime:        number
  SourceStats?:   { TotalBytes?: number }
  DeviceName?:    string
}

export type CometClientSummary = {
  username:      string
  lastJobStatus: number | null   // code numérique Comet, null si aucun job
  lastJobTime:   number | null   // Unix timestamp (secondes)
  lastJobSize:   number | null   // bytes
  hasRecentJob:  boolean
}

export function cometConfigured(): boolean {
  return !!(
    process.env.COMET_SERVER_URL &&
    process.env.COMET_ADMIN_USER &&
    process.env.COMET_ADMIN_PASS
  )
}

// Retourne les jobs bruts depuis l'API Comet, ou null en cas d'échec
export async function fetchCometRawJobs(username: string): Promise<CometRawJob[] | null> {
  const base      = process.env.COMET_SERVER_URL?.replace(/\/$/, '')
  const adminUser = process.env.COMET_ADMIN_USER
  const adminPass = process.env.COMET_ADMIN_PASS
  if (!base || !adminUser || !adminPass) return null

  const body = new URLSearchParams({
    Username:   adminUser,
    Password:   adminPass,
    AuthType:   'Password',
    TargetUser: username,
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
  } catch (err) {
    console.error(`[comet] ${username}: fetch error`, err)
    return null
  }

  if (!res.ok) {
    console.error(`[comet] ${username}: HTTP ${res.status} ${res.statusText}`)
    return null
  }

  let raw: unknown
  try {
    raw = await res.json()
  } catch (err) {
    console.error(`[comet] ${username}: JSON parse error`, err)
    return null
  }

  // L'API Comet retourne soit un tableau direct, soit { Status, Message, Data }
  if (Array.isArray(raw)) return raw as CometRawJob[]

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    // Réponse enveloppée — ex: { Status: 200, Data: [...] }
    if (Array.isArray(obj.Data)) return obj.Data as CometRawJob[]
    // Réponse d'erreur Comet — ex: { Status: 400, Message: "..." }
    console.error(`[comet] ${username}: réponse inattendue`, JSON.stringify(raw).slice(0, 300))
    return null
  }

  console.error(`[comet] ${username}: format inconnu`, typeof raw)
  return null
}

export async function fetchCometClientSummary(
  username: string,
  limitHours = 48,
): Promise<CometClientSummary | null> {
  const jobs = await fetchCometRawJobs(username)
  if (!jobs) return null

  const cutoff     = Math.floor(Date.now() / 1000) - limitHours * 3600
  const recentJobs = jobs.filter(j => j.StartTime >= cutoff)

  // Classification peut être string ou number selon la version Comet
  const backupJobs = recentJobs.filter(j => Number(j.Classification) === JOB_CLASS_BACKUP)

  if (backupJobs.length === 0) {
    return { username, lastJobStatus: null, lastJobTime: null, lastJobSize: null, hasRecentJob: false }
  }

  // Trier par date décroissante, ignorer les jobs en cours pour le statut final
  backupJobs.sort((a, b) => b.StartTime - a.StartTime)
  const lastCompleted = backupJobs.find(j => Number(j.Status) !== JOB_STATUS_RUNNING)
  const hasRunning    = backupJobs.some(j => Number(j.Status) === JOB_STATUS_RUNNING)
  const ref           = lastCompleted ?? backupJobs[0]

  return {
    username,
    lastJobStatus: hasRunning && !lastCompleted ? JOB_STATUS_RUNNING : Number(ref.Status),
    lastJobTime:   ref.StartTime,
    lastJobSize:   ref.SourceStats?.TotalBytes ?? null,
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
