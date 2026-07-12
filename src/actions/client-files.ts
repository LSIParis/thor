'use server'

import { requireAuth } from '@/lib/access'
import { join, normalize } from 'path'
import { readdir, mkdir, rm, writeFile } from 'fs/promises'
import { revalidatePath } from 'next/cache'

const BASE = join(process.cwd(), 'public', 'uploads', 'clients')

function safePath(clientId: string, sub = '') {
  const full = normalize(join(BASE, clientId, sub))
  if (!full.startsWith(normalize(BASE) + normalize('/').charAt(0))) throw new Error('Accès refusé')
  return full
}

function toUrl(clientId: string, sub: string, name: string) {
  const parts = ['/uploads/clients', clientId, ...(sub ? [sub] : []), name]
  return parts.join('/').replace(/\/+/g, '/')
}

export type FileItem = {
  name: string
  type: 'file' | 'dir'
  url?: string
}

export async function listClientFiles(clientId: string, sub = ''): Promise<FileItem[]> {
  await requireAuth()
  const dir = safePath(clientId, sub)
  await mkdir(dir, { recursive: true })
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .map(e => ({
      name: e.name,
      type: e.isDirectory() ? ('dir' as const) : ('file' as const),
      url: e.isFile() ? toUrl(clientId, sub, e.name) : undefined,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name, 'fr')
    })
}

export async function createClientFolder(clientId: string, sub: string, name: string) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN' && session.user.role !== 'TECH') throw new Error('Accès refusé')
  if (!name || /[/\\.]/.test(name)) throw new Error('Nom invalide')
  await mkdir(safePath(clientId, sub ? `${sub}/${name}` : name), { recursive: true })
  revalidatePath(`/clients/${clientId}`)
}

export async function uploadClientFiles(clientId: string, sub: string, formData: FormData) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN' && session.user.role !== 'TECH') throw new Error('Accès refusé')
  const files = formData.getAll('files') as File[]
  const dir = safePath(clientId, sub)
  await mkdir(dir, { recursive: true })
  for (const file of files) {
    if (!file || file.size === 0) continue
    await writeFile(join(dir, file.name), Buffer.from(await file.arrayBuffer()))
  }
  revalidatePath(`/clients/${clientId}`)
}

export async function deleteClientItem(clientId: string, itemPath: string) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN' && session.user.role !== 'TECH') throw new Error('Accès refusé')
  await rm(safePath(clientId, itemPath), { recursive: true, force: true })
  revalidatePath(`/clients/${clientId}`)
}
