import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

describe('authorize', () => {
  it('returns null when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'pw' })
    expect(result).toBeNull()
  })

  it('returns null when password wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1', name: 'Test', email: 'x@x.com',
      passwordHash: await bcrypt.hash('correct', 10),
      role: 'TECH', createdAt: new Date(), clients: [],
    } as any)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('returns user when credentials valid', async () => {
    const hash = await bcrypt.hash('correct', 10)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1', name: 'Test', email: 'x@x.com',
      passwordHash: hash, role: 'TECH', createdAt: new Date(), clients: [],
    } as any)
    const { authorize } = await import('./auth.helpers')
    const result = await authorize({ email: 'x@x.com', password: 'correct' })
    expect(result).toMatchObject({ id: '1', email: 'x@x.com', role: 'TECH' })
  })
})
