import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ENV = {
  COMET_SERVER_URL: 'https://backup.example.fr',
  COMET_ADMIN_USER: 'admin',
  COMET_ADMIN_PASS: 'secret',
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function makeJob(overrides: Partial<{
  Classification: number; Status: number; StartTime: number; TotalBytes: number
}> = {}) {
  return {
    JobHash: 'abc',
    Classification: overrides.Classification ?? 4001,
    Status: overrides.Status ?? 5002,
    StartTime: overrides.StartTime ?? Math.floor(Date.now() / 1000) - 3600,
    EndTime: Math.floor(Date.now() / 1000) - 3500,
    SourceStats: { TotalBytes: overrides.TotalBytes ?? 1_000_000 },
    DeviceName: 'PC-Test',
  }
}

beforeEach(() => {
  Object.assign(process.env, ENV)
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.COMET_SERVER_URL
  delete process.env.COMET_ADMIN_USER
  delete process.env.COMET_ADMIN_PASS
})

import { cometConfigured, fetchCometClientSummary, fetchCometSummaries, isCometSuccess, isCometError } from './comet-backup'

describe('cometConfigured', () => {
  it('returns true when all env vars are set', () => {
    expect(cometConfigured()).toBe(true)
  })

  it('returns false when COMET_SERVER_URL is missing', () => {
    delete process.env.COMET_SERVER_URL
    expect(cometConfigured()).toBe(false)
  })

  it('returns false when COMET_ADMIN_PASS is missing', () => {
    delete process.env.COMET_ADMIN_PASS
    expect(cometConfigured()).toBe(false)
  })
})

describe('fetchCometClientSummary', () => {
  it('returns null when env vars are missing', async () => {
    delete process.env.COMET_SERVER_URL
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns null on fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns null on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { error: 'Unauthorized' }))
    const result = await fetchCometClientSummary('user1')
    expect(result).toBeNull()
  })

  it('returns summary with hasRecentJob=false when no backup jobs in window', async () => {
    vi.stubGlobal('fetch', mockFetch(200, []))
    const result = await fetchCometClientSummary('user1')
    expect(result).toEqual({
      username: 'user1',
      lastJobStatus: null,
      lastJobTime: null,
      lastJobSize: null,
      hasRecentJob: false,
    })
  })

  it('ignores non-backup jobs (Classification !== 4001)', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [makeJob({ Classification: 4002 })]))
    const result = await fetchCometClientSummary('user1')
    expect(result?.hasRecentJob).toBe(false)
  })

  it('returns summary with most recent backup job', async () => {
    const now = Math.floor(Date.now() / 1000)
    const jobs = [
      makeJob({ Status: 5005, StartTime: now - 7200, TotalBytes: 500 }),
      makeJob({ Status: 5002, StartTime: now - 3600, TotalBytes: 1000 }),
    ]
    vi.stubGlobal('fetch', mockFetch(200, jobs))
    const result = await fetchCometClientSummary('user1')
    expect(result?.lastJobStatus).toBe(5002)
    expect(result?.lastJobSize).toBe(1000)
    expect(result?.hasRecentJob).toBe(true)
  })

  it('sends correct POST body to Comet API', async () => {
    const fetchMock = mockFetch(200, [])
    vi.stubGlobal('fetch', fetchMock)
    await fetchCometClientSummary('myclient')
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://backup.example.fr/api/v1/admin/get-jobs-for-user')
    expect(options.method).toBe('POST')
    const body = options.body as string
    expect(body).toContain('TargetUser=myclient')
    expect(body).toContain('Username=admin')
    expect(body).toContain('AuthType=Password')
  })
})

describe('fetchCometSummaries', () => {
  it('returns a Map keyed by username', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [makeJob()]))
    const map = await fetchCometSummaries(['user1', 'user2'])
    expect(map.size).toBe(2)
    expect(map.has('user1')).toBe(true)
    expect(map.has('user2')).toBe(true)
  })

  it('omits usernames whose fetch returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const map = await fetchCometSummaries(['user1'])
    expect(map.size).toBe(0)
  })
})

describe('isCometSuccess / isCometError', () => {
  it('isCometSuccess: true for 5002 and 5003', () => {
    expect(isCometSuccess(5002)).toBe(true)
    expect(isCometSuccess(5003)).toBe(true)
    expect(isCometSuccess(5005)).toBe(false)
    expect(isCometSuccess(null)).toBe(false)
  })

  it('isCometError: true for 5005, 5100, 5004', () => {
    expect(isCometError(5005)).toBe(true)
    expect(isCometError(5100)).toBe(true)
    expect(isCometError(5004)).toBe(true)
    expect(isCometError(5002)).toBe(false)
    expect(isCometError(null)).toBe(false)
  })
})
