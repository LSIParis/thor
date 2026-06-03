import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

import { fetchRmmClients } from './rmm-client'

const CLIENTS = [{ id: 1, name: 'Client A' }, { id: 2, name: 'Client B' }]
const NOT_FOUND = Object.assign(new Error('404'), { response: { status: 404 } })

beforeEach(() => vi.resetAllMocks())

describe('fetchRmmClients', () => {
  it('succeeds on first path /api/v3/clients/', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: CLIENTS })
    const result = await fetchRmmClients('https://rmm.example.com', 'my-key')
    expect(axios.get).toHaveBeenCalledWith(
      'https://rmm.example.com/api/v3/clients/',
      expect.objectContaining({ headers: { 'X-API-KEY': 'my-key' } })
    )
    expect(result).toEqual(CLIENTS)
  })

  it('falls back to /clients/ when /api/v3/clients/ returns 404', async () => {
    vi.mocked(axios.get)
      .mockRejectedValueOnce(NOT_FOUND)
      .mockResolvedValueOnce({ data: CLIENTS })
    const result = await fetchRmmClients('https://rmm.example.com', 'key')
    expect(result).toEqual(CLIENTS)
    expect(vi.mocked(axios.get).mock.calls[1][0]).toBe('https://rmm.example.com/clients/')
  })

  it('throws on non-404 network error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(fetchRmmClients('https://rmm.example.com', 'key')).rejects.toThrow('ECONNREFUSED')
  })
})
