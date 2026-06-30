import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/access'
import { spawn } from 'child_process'
import { createGunzip } from 'zlib'
import { Readable } from 'stream'

function parseDatabaseUrl(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: u.username,
    password: u.password,
    dbname: u.pathname.slice(1).split('?')[0],
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return NextResponse.json({ error: 'DATABASE_URL non configuré' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const { host, port, user, password, dbname } = parseDatabaseUrl(dbUrl)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b

  return new Promise<NextResponse>((resolve) => {
    const psql = spawn(
      'psql',
      ['-h', host, '-p', port, '-U', user, '-d', dbname, '-v', 'ON_ERROR_STOP=1'],
      { env: { ...process.env, PGPASSWORD: password } }
    )

    const errors: string[] = []
    psql.stderr.on('data', (data: Buffer) => {
      const msg = data.toString()
      console.error('[restore] psql:', msg)
      errors.push(msg)
    })

    psql.on('close', (code) => {
      if (code === 0) {
        resolve(NextResponse.json({ ok: true }))
      } else {
        resolve(NextResponse.json({ error: errors.join('\n') || `psql exit ${code}` }, { status: 500 }))
      }
    })

    psql.on('error', (err: Error) => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }))
    })

    const source = Readable.from(buffer)
    if (isGzip) {
      source.pipe(createGunzip()).pipe(psql.stdin)
    } else {
      source.pipe(psql.stdin)
    }
  })
}
