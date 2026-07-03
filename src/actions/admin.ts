'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/access'

export async function clearAllMovements(): Promise<{ deleted?: number; error?: string }> {
  try {
    await requireAdmin()
    const { count } = await prisma.personnelMovement.deleteMany({})
    return { deleted: count }
  } catch (err) {
    console.error('[admin] clearAllMovements error:', err)
    return { error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}
