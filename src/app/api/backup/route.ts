import { requireAdmin } from '@/lib/access'
import { spawn } from 'child_process'
import { createGzip } from 'zlib'

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

export async function GET() {
  await requireAdmin()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return new Response('DATABASE_URL non configuré', { status: 500 })

  const { host, port, user, password, dbname } = parseDatabaseUrl(dbUrl)

  const date = new Date().toISOString().slice(0, 10)
  const filename = `thor-backup-${date}.sql.gz`

  const stream = new ReadableStream({
    start(controller) {
      const gzip = createGzip()

      const dump = spawn(
        'pg_dump',
        ['-h', host, '-p', port, '-U', user, '-d', dbname, '--clean', '--if-exists', '--no-owner', '--no-acl', '-Fp'],
        { env: { ...process.env, PGPASSWORD: password } }
      )

      dump.stdout.pipe(gzip)

      gzip.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      gzip.on('end', () => controller.close())
      gzip.on('error', (err: Error) => {
        console.error('[backup] gzip error:', err)
        controller.error(err)
      })

      dump.stderr.on('data', (data: Buffer) => console.error('[backup] pg_dump:', data.toString()))
      dump.on('error', (err: Error) => {
        console.error('[backup] spawn error:', err)
        controller.error(err)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
