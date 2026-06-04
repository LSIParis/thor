import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('axios')
import axios from 'axios'

describe('OvhClient', () => {
  beforeEach(() => vi.resetAllMocks())

  it('uses correct base URL for ovh-eu endpoint', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: ['zone1.fr'] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'AK', 'AS', 'CK')
    await client.get('/domain/zone')
    expect(vi.mocked(axios.get).mock.calls[0][0]).toContain('eu.api.ovh.com')
  })

  it('uses correct base URL for ovh-ca endpoint', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-ca', 'AK', 'AS', 'CK')
    await client.get('/domain/zone')
    expect(vi.mocked(axios.get).mock.calls[0][0]).toContain('ca.api.ovh.com')
  })

  it('includes required OVH auth headers', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'MY_AK', 'MY_AS', 'MY_CK')
    await client.get('/domain/zone')
    const headers = vi.mocked(axios.get).mock.calls[0][1]?.headers as Record<string, string>
    expect(headers['X-Ovh-Application']).toBe('MY_AK')
    expect(headers['X-Ovh-Consumer']).toBe('MY_CK')
    expect(headers['X-Ovh-Timestamp']).toMatch(/^\d+$/)
    expect(headers['X-Ovh-Signature']).toMatch(/^\$1\$[0-9a-f]{40}$/)
  })

  it('computes correct HMAC-SHA1 signature', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    const { OvhClient } = await import('./ovh-client')
    const client = new OvhClient('ovh-eu', 'AK', 'SECRET', 'CK')
    let capturedHeaders: any
    vi.mocked(axios.get).mockImplementationOnce((_url, config) => {
      capturedHeaders = config?.headers
      return Promise.resolve({ data: [] })
    })
    await client.get('/domain/zone')
    const ts = capturedHeaders['X-Ovh-Timestamp']
    const url = 'https://eu.api.ovh.com/1.0/domain/zone'
    const toSign = `SECRET+CK+GET+${url}++${ts}`
    const expected = '$1$' + crypto.createHash('sha1').update(toSign).digest('hex')
    expect(capturedHeaders['X-Ovh-Signature']).toBe(expected)
  })
})
