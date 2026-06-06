import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Format non supporté (PNG, JPG, WebP, SVG)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const filename = `${randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(join(process.cwd(), 'public', 'uploads', 'logos', filename), Buffer.from(bytes))

  return NextResponse.json({ path: `/uploads/logos/${filename}` })
}
