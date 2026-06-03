import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

import { fetchRmmClients } from './rmm-client'

describe('fetchRmmClients', () => {
  it('calls RMM API with correct headers and returns clients', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [{ id: 1, name: 'Client A' }, { id: 2, name: 'Client B' }],
    })
    const result = await fetchRmmClients('https://rmm.example.com', 'my-key')
    expect(axios.get).toHaveBeenCalledWith(
      'https://rmm.example.com/api/v3/clients/',
      { headers: { 'X-API-KEY': 'my-key' } }
    )
    expect(result).toEqual([{ id: 1, name: 'Client A' }, { id: 2, name: 'Client B' }])
  })

  it('throws on network error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'))
    await expect(fetchRmmClients('https://rmm.example.com', 'key')).rejects.toThrow()
  })
})
